/* Presentation selection only. Repository owns desks; Projects are explicit views. */
(function (root) {
  'use strict';
  function select(data, roomURL, projectURL, selectedId) {
    const rooms = [...new Map(data.records.map(record => {
      const repo = record.observation.office.repository;
      return [repo.url, repo];
    })).values()];
    const room = rooms.find(entry => entry.url === roomURL) || rooms[0];
    const project = data.projects.some(entry => entry.url === projectURL) ? projectURL : '';
    const owned = data.records.filter(record => record.observation.office.repository.url === room.url);
    const records = owned.filter(record => !project || record.projects?.includes(project));
    return {rooms, roomURL: room.url, projectURL: project, owned, records,
      selectedId: records.some(record => record.id === selectedId) ? selectedId : records[0]?.id || null};
  }
  const api = {select};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.officeViews = api;
})(typeof window === 'undefined' ? globalThis : window);
