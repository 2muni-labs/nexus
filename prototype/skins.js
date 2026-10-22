/* Static local files: classic scripts and SVG <image> also work via file://. */
(() => {
  'use strict';
  const character = (file, pixelated = false) => ({
    src: `assets/${file}`, width: 100, height: 125,
    anchor: {x: 50, y: 70}, display: {width: 100, height: 125}, pixelated
  });
  const desk = (file, pixelated = false) => ({
    src: `assets/${file}`, width: 240, height: 240,
    anchor: {x: 64, y: 80}, display: {width: 240, height: 240}, pixelated
  });
  const room = (file, pixelated = false) => ({
    src: `assets/${file}`, width: 880, height: 790,
    anchor: {x: 0, y: 0}, display: {width: 880, height: 790}, pixelated
  });
  const pixelCharacter = character('character-pixel.svg', true);
  const small = (file, width, height, x, y) => ({src: `assets/${file}.svg`, width, height,
    anchor: {x, y}, display: {width: width * 2, height: height * 2}, pixelated: true});
  const employee = name => {
    const base = small(`staff-${name}`, 24, 32, 12, 30);
    return {...base, expressions: Object.fromEntries(['typing', 'waiting', 'review'].map(kind =>
      [kind, [base, small(`staff-${name}-${kind}`, 24, 32, 12, 30)]]))};
  };
  window.officeSkins = {
    simulation: {
      room: small('room-simulation', 440, 395, 0, 0),
      roomFront: small('room-front-simulation', 440, 395, 0, 0),
      desk: small('desk-simulation', 64, 48, 32, 16),
      characters: {'leaf-mint': employee('mint'),
        'ears-peach': employee('rose'),
        'ears-lavender': employee('amber'),
        'leaf-gray': employee('blue')},
      // Presentation coordinates only: indices follow stable room-owned desk slots.
      layout: {positions: [{x: 440, y: 338}, {x: 600, y: 418}, {x: 280, y: 418}, {x: 440, y: 498}],
        characterOffset: {x: 0, y: -8}, portraitViewBox: '-24 -62 48 64',
        hit: {x: -68, y: -76, width: 136, height: 146},
        ring: 'M-70 0L0-35 70 0 0 36Z', nameplate: 'translate(-56 -105)',
        bubble: 'translate(-65 -11)', movementSlots: [2, 1],
        entrance: {x: 186, y: 518}, beside: {x: 208, y: 460},
        movementAnchors: {'통로 A': {x: 200, y: 450}, '통로 B': {x: 440, y: 510},
          '우측 통로': {x: 700, y: 470}, '커피': {x: 710, y: 414}}}
    },
    illustration: {
      room: room('room-illustration.svg'), roomFront: room('room-front-illustration.svg'),
      desk: desk('desk-illustration.svg'),
      characters: {
        'leaf-mint': character('leaf-mint.svg'), 'ears-peach': character('ears-peach.svg'),
        'ears-lavender': character('ears-lavender.svg'), 'leaf-gray': character('leaf-gray.svg')
      }
    },
    pixel: {
      room: room('room-pixel.svg', true), roomFront: room('room-front-pixel.svg', true),
      desk: desk('desk-pixel.svg', true),
      characters: {'leaf-mint': pixelCharacter, 'ears-peach': pixelCharacter,
        'ears-lavender': pixelCharacter, 'leaf-gray': pixelCharacter}
    }
  };
  // QA-only checker, not a selectable design. Same registration and renderer as SVG.
  window.officePngFixture = character('compatibility-check.png', true);
})();
