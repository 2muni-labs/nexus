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
  const pixelCharacter = character('character-pixel.svg', true);
  window.officeSkins = {
    illustration: {
      desk: desk('desk-illustration.svg'),
      characters: {
        'leaf-mint': character('leaf-mint.svg'), 'ears-peach': character('ears-peach.svg'),
        'ears-lavender': character('ears-lavender.svg'), 'leaf-gray': character('leaf-gray.svg')
      }
    },
    pixel: {
      desk: desk('desk-pixel.svg', true),
      characters: {'leaf-mint': pixelCharacter, 'ears-peach': pixelCharacter,
        'ears-lavender': pixelCharacter, 'leaf-gray': pixelCharacter}
    }
  };
  // QA-only checker, not a selectable design. Same registration and renderer as SVG.
  window.officePngFixture = character('compatibility-check.png', true);
})();
