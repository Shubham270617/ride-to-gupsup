import { createSection, validateLayout } from './model';
import { buildRidgeCopy, fill } from '../labData';

// Use precisely the same content resolver and distance formatting as LabRidge.
// This is a starting document only; no storage or publishing happens here.
export function createRidgeIntroLayout(settings) {
  const copy = buildRidgeCopy(settings);
  const loopKm = Number(copy.loopKm) > 0 ? Number(copy.loopKm) : 0;
  const loops = Math.max(1, Math.round(Number(copy.maxLoops)) || 1);
  const section = createSection('ridge-intro', 'ridge-intro');
  section.content = {
    eyebrow: copy.eyebrow, title: copy.title, body: copy.introLine,
    formatLine: fill(copy.formatLine, { km: loopKm, loops, total: (loopKm * loops).toFixed(2) }),
    artCaption: copy.artCaption, loops: String(loops),
  };
  return validateLayout({ schema: 1, name: 'ridge', sections: [section] });
}
