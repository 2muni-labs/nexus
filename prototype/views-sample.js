/* Fictional two-room sample, never live data. Same envelope as views-example.json. */
(() => {
  const observed_at = '2026-01-01T00:00:00Z';
  const projects = [
    {url: 'https://github.com/orgs/example/projects/1', label: 'Fiction · Shared garden'},
    {url: 'https://github.com/users/example/projects/2', label: 'Fiction · Paper only'}
  ];
  const titles = ['Shared paper task', 'No Project membership', 'Shared garden task', 'Membership unknown'];
  const records = titles.map((title, index) => {
    const n = index + 1, room = index < 2 ? 'paper' : 'garden';
    const repo = 'display-' + room, desk = 'display-desk-' + n, actor = 'display-actor-' + n;
    const url = 'https://github.com/example/fiction-' + room;
    const work_url = url + '/issues/' + n;
    return {id: 'display-record-' + n, projects: [[projects[0].url, projects[1].url], [], [projects[0].url], null][index], observation: {
      version: 2, observed_at,
      work: {url: work_url, title: 'Fiction · ' + title, workflow_status: ['Review', 'Ready', 'In Progress', 'Blocked'][index]},
      execution: {status: ['succeeded', 'unknown', 'running', 'awaiting_input'][index], source: 'Fictional manual result example'},
      office: {
        source: 'Fictional manual shape example only', observed_at, coverage: 'single-record',
        repository: {alias: repo, label: 'Fiction · ' + (index < 2 ? 'Paper' : 'Garden') + ' room', url},
        workspace: {alias: desk, label: 'Fiction desk ' + n, repository: repo},
        session: index === 3 ? null : {alias: actor, label: 'Fiction character', workspace: desk, liveness: 'unknown', source: 'Fictional session observation', observed_at},
        assignment: index === 3 ? null : {session: actor, workspace: desk, work_url, source: 'Fictional explicit association', observed_at},
        retention: {state: 'unknown', source: null}
      }
    }};
  });
  window.officeRoomSample = {view_version: 1, source: 'Fictional manual sample only; no live repository observations', observed_at, projects, records};
})();
