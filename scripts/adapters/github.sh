# GitHub WorkItemProvider binding. No routing, scheduling or local project-state store.
nexus_github_api() {
    local repository=${NEXUS_GITHUB_REPOSITORY:-} endpoint=$1 owner remainder
    if [[ "$endpoint" == repos/* ]]; then
        # The first two path components select the exact source/target repository.
        remainder=${endpoint#repos/}; owner=${remainder%%/*}; remainder=${remainder#*/}
        repository=$owner/${remainder%%/*}
    fi
    nexus_github_command "$repository" api --hostname github.com "$@"
}
nexus_github_command() {
    python3 -I -B "$(dirname -- "${BASH_SOURCE[0]}")/github-app.py" "$@"
}
nexus_github_normalize() {
    jq -e --arg repository "$1" --arg kind "$2" --arg number "${3:-}" '
      def item: if ((.number|type == "number" and floor == . and .>0) and
        .html_url == ("https://github.com/"+$repository+
          (if $kind == "issue" then "/issues/" else "/pull/" end)+(.number|tostring)) and
        (if $number == "" then true else (.number|tostring) == $number end) and
        (if $kind == "issue" then (has("pull_request")|not) else true end)) | not
        then error("Canonical item identity mismatch; reobserve ownership and approve an explicit remapping") else
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
    jq -e --arg op "$1" --arg repo "$2" --argjson payload "$3" --arg number "$4" --argjson candidate "${5:-null}" '
      def positive: type == "number" and floor == . and .>0;
      if $op == "association-comment" then
        (.id|positive) and .body == $payload.body and
        .issue_url == ("https://api.github.com/repos/"+$repo+"/issues/"+$number) and
        .html_url == ("https://github.com/"+$repo+"/issues/"+$number+"#issuecomment-"+(.id|tostring))
      else
        (.number|positive) and (if $number == "" then true else (.number|tostring) == $number end) and
        .html_url == ("https://github.com/"+$repo+ (if $op == "pr-create" then "/pull/" else "/issues/" end)+(.number|tostring)) and
        (if $op == "pr-create" then
          .head.ref == $candidate.branch and .head.repo.full_name == $candidate.repository and
          .head.sha == $candidate.revision and .base.ref == $payload.base and .base.repo.full_name == $repo
         else (has("pull_request")|not) end) and
        (. as $record | all($payload|keys[]; . as $key |
          if $key == "labels" then ($record.labels|map(.name)|sort) == ($payload.labels|sort)
          elif $key == "milestone" then ($record.milestone.number // null) == $payload.milestone
          elif (["title","body","state","draft"]|index($key)) != null then $record[$key] == $payload[$key]
          else true end))
      end'
}

nexus_github_operation() {
    local op=$1 repo=$2 argument=$3 apply=$4 approved=$5 approval=$6 endpoint method payload plan oid request marker found current number='' candidate='null' head_repo head_branch
    case "$op" in
        issue-read|pr-read|review-checks-read|association-read)
            [[ "$argument" =~ ^[1-9][0-9]*$ ]] || nexus_fail 'Positive item number required.'
            [[ "$apply" == false && -z "$approved$approval" ]] || nexus_fail 'Read operations do not accept approval flags.'
            if [[ "$op" == association-read ]]; then
                current=$(nexus_github_api "repos/$repo/issues/$argument" --method GET)
                nexus_github_normalize "$repo" issue "$argument" <<< "$current" >/dev/null || nexus_fail 'Association target identity changed; reobserve ownership.'
                nexus_github_api "repos/$repo/issues/$argument/comments?per_page=100" --method GET --paginate --slurp |
                    jq -e --arg repo "$repo" --arg number "$argument" '
                      [.[][] | if ((.id|type == "number" and floor == . and .>0) and
                        .issue_url == ("https://api.github.com/repos/"+$repo+"/issues/"+$number) and
                        .html_url == ("https://github.com/"+$repo+"/issues/"+$number+"#issuecomment-"+(.id|tostring))) then
                        {id:.html_url,body,author:.user.login,updated_at,
                         metadata:{external_comment_id:.id,author_relationship:.author_association}}
                        else error("Association comment identity mismatch") end]'
            elif [[ "$op" == review-checks-read ]]; then
                nexus_github_command "$repo" review-checks "$argument" |
                    jq -e --arg repo "$repo" --arg number "$argument" '
                      def text: type == "string" and length>0;
                      def count: type == "number" and floor == . and .>=0;
                      def revision: type == "string" and test("^[0-9a-f]{40}$");
                      if (.errors != null and .errors != []) then error("PR observation contains GraphQL errors") else
                      .data.repository.pullRequest as $pr |
                      if $pr.url != ("https://github.com/"+$repo+"/pull/"+$number) or
                         ($pr.headRefOid|revision|not) or ($pr.isDraft|type != "boolean") then
                        error("PR observation identity mismatch") else
                      $pr.commits.nodes as $commits | $commits[0].commit.statusCheckRollup as $rollup |
                      $rollup.contexts as $contexts |
                      {url:$pr.url,head_revision:$pr.headRefOid,merged:($pr.mergedAt != null),draft:$pr.isDraft,
                       review_state:(if $pr.reviewDecision == "APPROVED" then "approved" elif $pr.reviewDecision == "CHANGES_REQUESTED" then "changes-requested" elif $pr.reviewDecision == "REVIEW_REQUIRED" then "pending" else "unknown" end),
                       checks_mode:"verified-runs",
                       checks_complete:((($commits|type) == "array") and ($commits|length) == 1 and
                         $commits[0].commit.oid == $pr.headRefOid and $rollup.commit.oid == $pr.headRefOid and
                         ($contexts.totalCount|count) and ($contexts.nodes|type == "array") and
                         $contexts.pageInfo.hasNextPage == false and $contexts.pageInfo.hasPreviousPage == false and
                         ($contexts.nodes|length) == $contexts.totalCount and
                         ([$contexts.nodes[]?.id]|unique|length) == $contexts.totalCount and
                         all($contexts.nodes[]?; (.id|text) and
                           (.name // .context|text) and (.__typename == "CheckRun" or .__typename == "StatusContext"))),
                       checks_head:$pr.headRefOid,
                       checks:[ $contexts.nodes[]? |
                         . as $run | (if .__typename == "CheckRun" then .checkSuite.commit.oid else .commit.oid end) as $head |
                         (if .__typename == "CheckRun" and (.checkSuite.app.databaseId|type == "number" and floor == . and .>0)
                          then "github-app:"+(.checkSuite.app.databaseId|tostring) else null end) as $producer |
                         {id,name:(.name // .context),head_revision:$head,producer_ref:$producer,
                          provenance_verified:((.id|text) and ($head|revision) and $head == $pr.headRefOid and $producer != null),
                          state:(if (.__typename == "CheckRun" and .status == "COMPLETED" and .conclusion == "SUCCESS") or
                                    (.__typename == "StatusContext" and .state == "SUCCESS") then "pass"
                            elif ((.conclusion // .state) as $s | ["FAILURE","ERROR","TIMED_OUT","CANCELLED","ACTION_REQUIRED","STARTUP_FAILURE"]|index($s)) != null then "fail"
                            elif ((.status // .state) as $s | ["IN_PROGRESS","QUEUED","PENDING","WAITING","REQUESTED"]|index($s)) != null then "pending"
                            else "unknown" end),
                          metadata:{native_type:.__typename,status,conclusion,state,check_suite:.checkSuite,creator}}
                       ],metadata:{inventory_total:$contexts.totalCount,page_info:$contexts.pageInfo}}
                      end end'
            else
                endpoint=issues; [[ "$op" != pr-read ]] || endpoint=pulls
                current=$(nexus_github_api "repos/$repo/$endpoint/$argument" --method GET)
                if [[ "$op" == issue-read ]]; then
                    jq -e 'has("pull_request") | not' <<< "$current" >/dev/null || nexus_fail 'Requested Issue is a PR.'
                fi
                printf '%s\n' "$current" | nexus_github_normalize "$repo" "$(if [[ "$op" == issue-read ]]; then printf issue; else printf pull-request; fi)" "$argument"
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
    # Read the caller path once; every plan/preflight/write uses this snapshot.
    request=$(cat -- "$argument") || nexus_fail 'Request snapshot unavailable.'
    jq -e 'type == "object" and (.operation_id | type == "string" and test("^[a-zA-Z0-9_-]+$"))' <<< "$request" >/dev/null || nexus_fail 'Stable operation_id required.'
    marker="<!-- nexus-operation:$(jq -r .operation_id <<< "$request") -->"
    case "$op" in
        issue-create|pr-create)
            jq -e '.title | type == "string" and length > 0' <<< "$request" >/dev/null || nexus_fail 'Title required.'
            jq -e '.body | type == "string"' <<< "$request" >/dev/null || nexus_fail 'Body required.'
            endpoint="repos/$repo/issues"; method=POST
            payload=$(jq -c --arg marker "$marker" '{title,body:(.body+"\n\n"+$marker)}' <<< "$request")
            if [[ "$op" == pr-create ]]; then
                jq -e '(.head|type == "string" and length>0) and (.base|type == "string" and length>0) and (.head_repository|type == "string" and test("^[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9][A-Za-z0-9_.-]*$")) and (.expected_head_revision|type == "string" and test("^[0-9a-f]{40}$"))' <<< "$request" >/dev/null || nexus_fail 'Explicit PR head/base, head_repository and exact 40-character expected_head_revision required.'
                jq -e '.draft == null or (.draft|type == "boolean")' <<< "$request" >/dev/null || nexus_fail 'PR draft must be boolean or null (default true).'
                head_repo=$(jq -r .head_repository <<< "$request"); head_branch=$(jq -r .head <<< "$request")
                git check-ref-format "refs/heads/$head_branch" >/dev/null &&
                    git check-ref-format "refs/heads/$(jq -r .base <<< "$request")" >/dev/null || nexus_fail 'PR head/base must be branch names, not owner-qualified refs.'
                [[ "$head_repo" != "$repo" || "$head_branch" != "$(jq -r .base <<< "$request")" ]] || nexus_fail 'Distinct PR head/base required in the same repository.'
                python3 -I -B "$(dirname -- "${BASH_SOURCE[0]}")/github-identity.py" plan /dev/stdin <<< "$request" >/dev/null || nexus_fail 'Exact PR commit identity request required; old requests must be re-prepared.'
                candidate=$(jq -c '{repository:.head_repository,branch:.head,revision:.expected_head_revision}' <<< "$request")
                endpoint="repos/$repo/pulls"
                payload=$(jq -c --arg marker "$marker" --arg repo "$repo" '
                  {title,body:(.body+"\n\n"+$marker),
                   head:(if .head_repository == $repo then .head else (.head_repository|split("/")[0])+":"+.head end),
                   base,draft:(if .draft == null then true else .draft end)} +
                  (if .head_repository == $repo then {} else {head_repo:(.head_repository|split("/")[1])} end)' <<< "$request")
            fi ;;
        issue-update|association-comment)
            jq -e '(.number|type == "number" and floor == . and .>0) and (.expected_updated_at|type == "string" and length>0)' <<< "$request" >/dev/null || nexus_fail 'Number and expected_updated_at required.'
            number=$(jq -r .number <<< "$request")
            endpoint="repos/$repo/issues/$number"; method=PATCH
            if [[ "$op" == association-comment ]]; then
                method=POST; endpoint="$endpoint/comments"
                jq -e '.body | type == "string" and length>0' <<< "$request" >/dev/null || nexus_fail 'Reviewed association body required.'
                payload=$(jq -c --arg marker "$marker" '{body:(.body+"\n\n"+$marker)}' <<< "$request")
            else
                jq -e '.changes | type == "object" and length>0 and ((keys-["title","body","labels","milestone","state"])|length==0)' <<< "$request" >/dev/null || nexus_fail 'Unsupported Issue changes.'
                payload=$(jq -c .changes <<< "$request")
            fi ;;
    esac
    plan=$(jq -cn --arg op "$op" --arg repo "$repo" --arg endpoint "$endpoint" --arg method "$method" \
        --argjson candidate "$candidate" --argjson payload "$payload" --slurpfile request /dev/stdin \
        '{provider:"github",operation:$op,repository:$repo,endpoint:$endpoint,method:$method,
          operation_id:$request[0].operation_id,expected_updated_at:$request[0].expected_updated_at,payload:$payload}
          + (if $op == "pr-create" then {candidate:$candidate,commit_identity:$request[0].commit_identity} else {} end)' <<< "$request")
    oid=$(printf '%s\n' "$plan" | git hash-object --stdin)
    if [[ "$apply" == false ]]; then
        [[ -z "$approved$approval" ]] || nexus_fail 'Approval flags require --apply.'
        jq -cn --argjson plan "$plan" --arg oid "$oid" '{plan:$plan,plan_oid:$oid,applied:false}'
        return
    fi
    [[ "$approved" == "$oid" && -n "$approval" && "$approval" == *[![:space:]]* ]] || nexus_fail 'Exact prepared plan digest and explicit human approval reference required.'
    if [[ "$op" == pr-create ]]; then
        # Check exact raw commit metadata even before recovery, never just a promise.
        python3 -I -B "$(dirname -- "${BASH_SOURCE[0]}")/github-identity.py" verify "$repo" /dev/stdin <<< "$request" >/dev/null || nexus_fail 'PR commit identity preflight failed; publication blocked.'
    fi
    if [[ "$op" == issue-update || "$op" == association-comment ]]; then
        current=$(nexus_github_api "repos/$repo/issues/$number" --method GET)
        nexus_github_normalize "$repo" issue "$number" <<< "$current" >/dev/null || nexus_fail 'Item identity changed; reobserve ownership and approve a new target.'
    fi
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
        nexus_github_verify_write "$op" "$repo" "$payload" "$number" "$candidate" <<< "$(jq -c '.[0]' <<< "$found")" >/dev/null || nexus_fail 'Recovered response has no authoritative matching record; reconcile.'
        jq -cn --arg approval "$approval" --arg oid "$oid" --argjson records "$found" '{applied:false,recovered:true,plan_oid:$oid,approval_reference:$approval,record:$records[0]}'
        return
    fi
    if [[ "$op" == issue-update || "$op" == association-comment ]]; then
        jq -e --arg expected "$(jq -r .expected_updated_at <<< "$request")" '.updated_at == $expected and (has("pull_request") | not)' <<< "$current" >/dev/null || nexus_fail 'Item changed or is a PR; reobserve and approve a new plan.'
    fi
    if [[ "$op" == pr-create ]]; then
        current=$(nexus_github_api "repos/$head_repo/git/ref/heads/$(jq -rn --arg branch "$head_branch" '$branch|@uri')" --method GET)
        jq -e --argjson candidate "$candidate" '
          .ref == ("refs/heads/"+$candidate.branch) and
          .url == ("https://api.github.com/repos/"+$candidate.repository+"/git/refs/heads/"+$candidate.branch) and
          .object.type == "commit" and .object.sha == $candidate.revision and
          .object.url == ("https://api.github.com/repos/"+$candidate.repository+"/git/commits/"+$candidate.revision)
        ' <<< "$current" >/dev/null || nexus_fail 'PR source branch identity or revision changed; reobserve and approve a new plan.'
    fi
    local write_status=0
    if [[ "$op" == pr-create ]]; then
        # Separate inherited request descriptor from the public payload stdin.
        current=$(nexus_github_command "$repo" --identity-request /dev/fd/3 api --hostname github.com "$endpoint" --method "$method" --input - 3<<< "$request" <<< "$payload") || write_status=$?
    else
        current=$(nexus_github_api "$endpoint" --method "$method" --input - <<< "$payload") || write_status=$?
    fi
    if [[ "$write_status" == 0 ]]; then
        nexus_github_verify_write "$op" "$repo" "$payload" "$number" "$candidate" <<< "$current" >/dev/null || nexus_fail 'Provider write response is ambiguous or mismatched. Preserve plan and reconcile; do not retry.'
        jq -cn --argjson record "$current" --arg oid "$oid" --arg approval "$approval" '{applied:true,plan_oid:$oid,approval_reference:$approval,record:$record}'
    else
        nexus_fail 'Provider write failed or response is unknown. Preserve plan; reconcile by operation marker. Do not blindly retry.'
    fi
}
