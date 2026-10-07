# GitHub WorkItemProvider binding. No routing, scheduling or local project-state store.
nexus_github_api() {
    command -v "${NEXUS_GH_COMMAND:-gh}" >/dev/null 2>&1 || nexus_fail 'Selected GitHub CLI unavailable.'
    "${NEXUS_GH_COMMAND:-gh}" api --hostname github.com "$@"
}
nexus_github_normalize() {
    jq -e --arg repository "$1" --arg kind "$2" '
      def item: if .html_url == null or .number == null then error("Missing item identity") else
      {id:.html_url, provider:"github", repository:$repository, kind:$kind,
       number:.number,url:.html_url,title:.title,body:(.body // ""),
       record_state:(if .merged_at != null then "merged" else .state end),
       updated_at:.updated_at,labels:[.labels[]?.name],milestone:(.milestone.title // null),
       metadata:{node_id:.node_id, head_revision:.head.sha, working_branch:.head.ref,
         base_branch:.base.ref}} end;
      if type == "array" then map(item) else item end'
}
# A transport success is not evidence of a correctly applied mutation.
nexus_github_verify_write() {
    jq -e --arg op "$1" --arg repo "$2" --argjson payload "$3" --arg number "$4" '
      def positive: type == "number" and floor == . and .>0;
      if $op == "association-comment" then
        (.id|positive) and .body == $payload.body and
        .issue_url == ("https://api.github.com/repos/"+$repo+"/issues/"+$number) and
        .html_url == ("https://github.com/"+$repo+"/issues/"+$number+"#issuecomment-"+(.id|tostring))
      else
        (.number|positive) and (if $number == "" then true else (.number|tostring) == $number end) and
        .html_url == ("https://github.com/"+$repo+ (if $op == "pr-create" then "/pull/" else "/issues/" end)+(.number|tostring)) and
        (if $op == "pr-create" then
          (.head.label == $payload.head or (.head.ref == $payload.head and .head.repo.full_name == $repo)) and
          .base.ref == $payload.base and (.head.sha|type == "string" and length>0)
         else (has("pull_request")|not) end) and
        (. as $record | all($payload|keys[]; . as $key |
          if $key == "labels" then ($record.labels|map(.name)|sort) == ($payload.labels|sort)
          elif $key == "milestone" then ($record.milestone.number // null) == $payload.milestone
          elif (["title","body","state","draft"]|index($key)) != null then $record[$key] == $payload[$key]
          else true end))
      end'
}

nexus_github_operation() {
    local op=$1 repo=$2 argument=$3 apply=$4 approved=$5 approval=$6 endpoint method payload plan oid temp marker found current number=''
    case "$op" in
        issue-read|pr-read|review-checks-read|association-read)
            [[ "$argument" =~ ^[1-9][0-9]*$ ]] || nexus_fail 'Positive item number required.'
            [[ "$apply" == false && -z "$approved$approval" ]] || nexus_fail 'Read operations do not accept approval flags.'
            if [[ "$op" == association-read ]]; then
                nexus_github_api "repos/$repo/issues/$argument/comments?per_page=100" --method GET --paginate --slurp |
                    jq -e '[.[][]|{id:.html_url,body,author:.user.login,updated_at,
                      metadata:{external_comment_id:.id,author_relationship:.author_association}}]'
            elif [[ "$op" == review-checks-read ]]; then
                GH_HOST=github.com "${NEXUS_GH_COMMAND:-gh}" pr view "$argument" --repo "$repo" \
                    --json url,headRefOid,reviewDecision,statusCheckRollup,mergedAt,isDraft |
                    jq -e '{url,head_revision:.headRefOid,merged:(.mergedAt != null),draft:.isDraft,
                      review_state:(if .reviewDecision == "APPROVED" then "approved" elif .reviewDecision == "CHANGES_REQUESTED" then "changes-requested" elif .reviewDecision == "REVIEW_REQUIRED" then "pending" else "unknown" end),
                      checks:[.statusCheckRollup[]? | {name:(.name // .context),
                        state:(if (.conclusion // .state) == "SUCCESS" then "pass"
                          elif ((.conclusion // .state) as $s | ["FAILURE","ERROR","TIMED_OUT","CANCELLED","ACTION_REQUIRED"]|index($s)) != null then "fail"
                          elif (.status == "IN_PROGRESS" or .status == "QUEUED" or .state == "PENDING") then "pending"
                          else "unknown" end),metadata:{status,conclusion,state}}]}' 
            else
                endpoint=issues; [[ "$op" != pr-read ]] || endpoint=pulls
                current=$(nexus_github_api "repos/$repo/$endpoint/$argument" --method GET)
                if [[ "$op" == issue-read ]]; then
                    jq -e 'has("pull_request") | not' <<< "$current" >/dev/null || nexus_fail 'Requested Issue is a PR.'
                fi
                printf '%s\n' "$current" | nexus_github_normalize "$repo" "$(if [[ "$op" == issue-read ]]; then printf issue; else printf pull-request; fi)"
            fi
            return ;;
        issue-list|pr-list)
            [[ -z "$argument" && "$apply" == false && -z "$approved$approval" ]] || nexus_fail 'List takes no item/approval arguments.'
            endpoint=issues; [[ "$op" != pr-list ]] || endpoint=pulls
            nexus_github_api "repos/$repo/$endpoint?state=all&per_page=100" --method GET --paginate --slurp |
                jq -e --arg op "$op" '[.[][] | select($op == "pr-list" or (has("pull_request") | not))]' |
                nexus_github_normalize "$repo" "$(if [[ "$op" == issue-list ]]; then printf issue; else printf pull-request; fi)"
            return ;;
        issue-create|issue-update|pr-create|association-comment) ;;
        *) nexus_fail "Unsupported provider operation: $op" ;;
    esac
    [[ -f "$argument" && -r "$argument" ]] || nexus_fail 'Write requires readable JSON request file.'
    jq -e 'type == "object" and (.operation_id | type == "string" and test("^[a-zA-Z0-9_-]+$"))' "$argument" >/dev/null || nexus_fail 'Stable operation_id required.'
    marker="<!-- nexus-operation:$(jq -r .operation_id "$argument") -->"
    case "$op" in
        issue-create|pr-create)
            jq -e '.title | type == "string" and length > 0' "$argument" >/dev/null || nexus_fail 'Title required.'
            jq -e '.body | type == "string"' "$argument" >/dev/null || nexus_fail 'Body required.'
            endpoint="repos/$repo/issues"; method=POST
            payload=$(jq -c --arg marker "$marker" '{title,body:(.body+"\n\n"+$marker)}' "$argument")
            if [[ "$op" == pr-create ]]; then
                jq -e '(.head|type == "string" and length>0) and (.base|type == "string" and length>0) and (.head != .base)' "$argument" >/dev/null || nexus_fail 'Distinct explicit PR head/base required.'
                endpoint="repos/$repo/pulls"
                payload=$(jq -c --arg marker "$marker" '{title,body:(.body+"\n\n"+$marker),head,base,draft:(.draft // true)}' "$argument")
            fi ;;
        issue-update|association-comment)
            jq -e '(.number|type == "number" and floor == . and .>0) and (.expected_updated_at|type == "string" and length>0)' "$argument" >/dev/null || nexus_fail 'Number and expected_updated_at required.'
            number=$(jq -r .number "$argument")
            endpoint="repos/$repo/issues/$number"; method=PATCH
            if [[ "$op" == association-comment ]]; then
                method=POST; endpoint="$endpoint/comments"
                jq -e '.body | type == "string" and length>0' "$argument" >/dev/null || nexus_fail 'Reviewed association body required.'
                payload=$(jq -c --arg marker "$marker" '{body:(.body+"\n\n"+$marker)}' "$argument")
            else
                jq -e '.changes | type == "object" and length>0 and ((keys-["title","body","labels","milestone","state"])|length==0)' "$argument" >/dev/null || nexus_fail 'Unsupported Issue changes.'
                payload=$(jq -c .changes "$argument")
            fi ;;
    esac
    plan=$(jq -cn --arg op "$op" --arg repo "$repo" --arg endpoint "$endpoint" --arg method "$method" \
        --argjson payload "$payload" --slurpfile request "$argument" \
        '{provider:"github",operation:$op,repository:$repo,endpoint:$endpoint,method:$method,
          operation_id:$request[0].operation_id,expected_updated_at:$request[0].expected_updated_at,payload:$payload}')
    oid=$(printf '%s\n' "$plan" | git hash-object --stdin)
    if [[ "$apply" == false ]]; then
        [[ -z "$approved$approval" ]] || nexus_fail 'Approval flags require --apply.'
        jq -cn --argjson plan "$plan" --arg oid "$oid" '{plan:$plan,plan_oid:$oid,applied:false}'
        return
    fi
    [[ "$approved" == "$oid" && -n "$approval" && "$approval" == *[![:space:]]* ]] || nexus_fail 'Exact prepared plan digest and explicit human approval reference required.'
    # Lookup only after exact approval. No automatic retry after an ambiguous API write.
    if [[ "$op" == issue-create || "$op" == pr-create ]]; then
        found=$(nexus_github_api "$endpoint?state=all&per_page=100" --method GET --paginate --slurp |
            jq -c --arg marker "$marker" '[.[][]|select((.body // "")|contains($marker))]')
    elif [[ "$op" == association-comment ]]; then
        found=$(nexus_github_api "$endpoint?per_page=100" --method GET --paginate --slurp |
            jq -c --arg marker "$marker" '[.[][]|select((.body // "")|contains($marker))]')
    else found='[]'; fi
    [[ $(jq length <<< "$found") -le 1 ]] || nexus_fail 'Ambiguous duplicate operation records; reconcile before writing.'
    if [[ $(jq length <<< "$found") == 1 ]]; then
        jq -e --argjson payload "$payload" --arg op "$op" '
          .[0] as $r | $r.body == $payload.body and
          (if $op == "association-comment" then true else $r.title == $payload.title end) and
          (if $op == "issue-create" then ($r|has("pull_request")|not) else true end) and
          (if $op == "pr-create" then
            ($r.head.label == $payload.head or $r.head.ref == $payload.head) and $r.base.ref == $payload.base
           else true end)' <<< "$found" >/dev/null || nexus_fail 'Operation marker exists with different content/target; reconcile, do not create or reuse.'
        nexus_github_verify_write "$op" "$repo" "$payload" "$number" <<< "$(jq -c '.[0]' <<< "$found")" >/dev/null || nexus_fail 'Recovered response has no authoritative matching record; reconcile.'
        jq -cn --arg approval "$approval" --arg oid "$oid" --argjson records "$found" '{applied:false,recovered:true,plan_oid:$oid,approval_reference:$approval,record:$records[0]}'
        return
    fi
    if [[ "$op" == issue-update || "$op" == association-comment ]]; then
        current=$(nexus_github_api "repos/$repo/issues/$(jq -r .number "$argument")" --method GET)
        jq -e --arg expected "$(jq -r .expected_updated_at "$argument")" '.updated_at == $expected and (has("pull_request") | not)' <<< "$current" >/dev/null || nexus_fail 'Item changed or is a PR; reobserve and approve a new plan.'
    fi
    temp=$(mktemp "${TMPDIR:-/tmp}/nexus-github.XXXXXX")
    printf '%s\n' "$payload" > "$temp"
    if current=$(nexus_github_api "$endpoint" --method "$method" --input "$temp"); then
        rm -f -- "$temp"
        nexus_github_verify_write "$op" "$repo" "$payload" "$number" <<< "$current" >/dev/null || nexus_fail 'Provider write response is ambiguous or mismatched. Preserve plan and reconcile; do not retry.'
        jq -cn --argjson record "$current" --arg oid "$oid" --arg approval "$approval" '{applied:true,plan_oid:$oid,approval_reference:$approval,record:$record}'
    else
        rm -f -- "$temp"
        nexus_fail 'Provider write failed or response is unknown. Preserve plan; reconcile by operation marker. Do not blindly retry.'
    fi
}
