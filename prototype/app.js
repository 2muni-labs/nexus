(() => {
  'use strict';
  const samples = window.officeSamples;
  const svgNS = 'http://www.w3.org/2000/svg';
  const colors = { mint: '#b6d6bc', peach: '#edc3ab', lavender: '#cab9e2', gray: '#c8c6d0' };
  function character(sample) {
    const ears = sample.accessory === 'ears'
      ? '<path d="M-22-36Q-36-71-18-61L-8-43M10-43Q23-75 31-58L25-32" fill="' + colors[sample.tone] + '" stroke="#8c7f92" stroke-width="2"/>'
      : '<path d="M0-40Q-17-68-21-53Q-19-39 0-40Q5-67 18-58Q25-44 0-40" fill="#94b397" stroke="#71947b" stroke-width="2"/>';
    const face = sample.tone === 'gray'
      ? '<path d="M-13-14h5M9-14h5M-3-1h7" stroke="#63596f" stroke-width="2.5" stroke-linecap="round"/>'
      : '<circle cx="-10" cy="-14" r="2.5" fill="#63596f"/><circle cx="12" cy="-14" r="2.5" fill="#63596f"/><path d="M-2-4Q2 1 6-4" fill="none" stroke="#63596f" stroke-width="2" stroke-linecap="round"/>';
    return '<ellipse cy="39" rx="32" ry="10" fill="#9b899d" opacity=".17"/><path d="M-24 39V21Q-22-1 0-1Q24 0 26 21V39" fill="' + colors[sample.tone] + '" stroke="#8c7f92" stroke-width="2"/>' + ears + '<path d="M-30-19Q-31-46 0-45Q33-45 33-18Q33 6 1 8Q-30 7-30-19" fill="#fff5de" stroke="#8c7f92" stroke-width="2"/>' + face + '<ellipse cx="-19" cy="-7" rx="5" ry="3" fill="#eec1b9"/><ellipse cx="22" cy="-7" rx="5" ry="3" fill="#eec1b9"/><path d="M-16 38v7M16 38v7" stroke="#8c7f92" stroke-width="5" stroke-linecap="round"/>';
  }
  const desks = document.getElementById('desks');
  samples.forEach((sample) => {
    const group = document.createElementNS(svgNS, 'g');
    group.setAttribute('class', 'desk');
    group.setAttribute('transform', `translate(${sample.x} ${sample.y})`);
    group.setAttribute('role', 'button');
    group.setAttribute('tabindex', '0');
    group.setAttribute('aria-label', `${sample.name}의 책상, ${sample.status}, ${sample.task}, 데모 샘플`);
    group.setAttribute('aria-pressed', 'false');
    group.dataset.id = sample.id;
    group.innerHTML = `<path class="selection-ring" d="M-63 49L35 0 172 69 73 121Z"/><g transform="translate(62 -21)">${character(sample)}</g><use href="#desk"/><path class="speech" d="M23-120H110Q119-120 119-111V-96Q119-87 110-87H76L69-78 65-87H23Q14-87 14-96V-111Q14-120 23-120Z"/><text class="speech-text" x="66" y="-100" text-anchor="middle">${sample.bubble}</text><g transform="translate(-15 123)"><rect class="nameplate" width="158" height="38" rx="12"/><circle cx="18" cy="19" r="10" fill="${colors[sample.tone]}"/><text x="18" y="23" text-anchor="middle" class="desk-label">${sample.icon}</text><text x="35" y="17" class="desk-label">${sample.name}</text><text x="35" y="30" class="desk-state">${sample.status}</text></g>`;
    group.addEventListener('click', () => select(sample.id));
    group.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(sample.id);
      }
    });
    if (sample.id === 'coco') {
      group.querySelector('.speech').remove();
      group.querySelector('.speech-text').remove();
    }
    desks.append(group);
    const item = document.createElement('li');
    const icon = document.createElement('span');
    icon.className = `legend-symbol ${sample.tone}`;
    icon.textContent = sample.icon;
    icon.setAttribute('aria-hidden', 'true');
    item.append(icon, document.createTextNode(sample.status));
    document.getElementById('legend-items').append(item);
  });
  function select(id) {
    const sample = samples.find((entry) => entry.id === id);
    desks.querySelectorAll('.desk').forEach((desk) => desk.setAttribute('aria-pressed', String(desk.dataset.id === id)));
    document.getElementById('agent-role').textContent = sample.role + ' · 샘플';
    document.getElementById('detail-heading').textContent = sample.name;
    const status = document.getElementById('detail-status');
    status.className = `status-pill ${sample.tone}`;
    status.textContent = `${sample.icon} ${sample.status}`;
    document.getElementById('task-name').textContent = sample.task;
    document.getElementById('task-note').textContent = sample.note;
    const portrait = document.getElementById('portrait');
    portrait.style.background = `var(--${sample.tone})`;
    portrait.innerHTML = `<svg viewBox="-50 -70 100 125" xmlns="${svgNS}">${character(sample)}</svg>`;
  }
  select(samples[0].id);
})();
