import { describe, it, expect } from 'vitest';
import { createLayout, createSection, effectiveStyle, loadLocalDraft, moveSection, saveLocalDraft, updateSectionStyle, validateLayout } from '../../../src/lib/layout/model';
describe('layout schema and local drafts', () => {
  it('inherits desktop and resets a mobile property without changing desktop', () => {
    const doc = createLayout(); const id = doc.sections[0].id;
    const mobile = updateSectionStyle(doc, id, 'mobile', 'size', 25);
    expect(effectiveStyle(mobile.sections[0], 'desktop').size).toBe(52);
    expect(effectiveStyle(mobile.sections[0], 'mobile').size).toBe(25);
    expect(effectiveStyle(updateSectionStyle(mobile, id, 'mobile', 'size', undefined).sections[0], 'mobile').size).toBe(52);
    expect(doc.sections[0].mobile).toEqual({});
  });
  it('imports prototype schema and removes its unresolvable bundled photo', () => {
    const doc = createLayout(); doc.sections[0].desktop.image = 'assets/ridge.jpg';
    expect(validateLayout(doc).sections[0].desktop.image).toBe('');
  });
  it.each(['javascript:alert(1)', 'data:image/svg+xml;base64,abcd', '//evil.example/x', 'https://user:pass@example.com/a'])('rejects unsafe image %s', image => { const doc = createLayout(); doc.sections[0].desktop.image = image; expect(() => validateLayout(doc)).toThrow(); });
  it('accepts bounded image data and https assets', () => { const doc = createLayout(); for (const image of ['data:image/jpeg;base64,YWJj', 'https://example.com/photo.jpg']) { doc.sections[0].mobile.image = image; expect(validateLayout(doc).sections[0].mobile.image).toBe(image); } });
  it('rejects duplicate ids, invalid numbers, invalid layouts and too many sections', () => {
    const doc = createLayout(); expect(() => validateLayout({ ...doc, sections: [doc.sections[0], doc.sections[0]] })).toThrow();
    doc.sections[0].desktop.columns = 2.5; expect(() => validateLayout(doc)).toThrow(); doc.sections[0].desktop.columns = 3;
    doc.sections[0].mobile.size = Infinity; expect(() => validateLayout(doc)).toThrow(); delete doc.sections[0].mobile.size;
    doc.sections[0].desktop.layout = 'carousel'; expect(() => validateLayout(doc)).toThrow();
    expect(() => validateLayout({ ...doc, sections: Array.from({ length: 21 }, () => createSection('hero')) })).toThrow();
  });
  it('isolates local drafts by page without publishing or network', () => { const doc = createLayout('Community'); saveLocalDraft(localStorage, 'community/delhi', doc); expect(loadLocalDraft(localStorage, 'community/delhi')).toEqual(doc); expect(loadLocalDraft(localStorage, 'ridge')).toBe(null); });
  it('moves sections without mutating original and ignores boundary moves', () => { const doc = createLayout(); doc.sections.push(createSection('cta')); const first = doc.sections[0].id; expect(moveSection(doc, first, -1)).toEqual(doc); expect(moveSection(doc, first, 1).sections[1].id).toBe(first); expect(doc.sections[0].id).toBe(first); });
});
