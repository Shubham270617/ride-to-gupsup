// Schema 1 is compatible with the supplied RTG Layout Studio JSON exports.
export const LAYOUT_TYPES = { 'ridge-intro': ['native'], hero: ['overlay', 'split', 'centered'], stats: ['grid', 'list'], spotlight: ['grid', 'carousel', 'list'], cta: ['banner', 'centered'] };
export const LAYOUT_FONTS = { grotesk: '"Space Grotesk", Arial, sans-serif', modern: '"Montserrat", Arial, sans-serif', classic: 'Georgia, serif', condensed: '"Bebas Neue", Impact, sans-serif' };
export const STYLE_DEFAULTS = { size: 52, bodySize: 16, font: 'grotesk', align: 'left', position: 'middle', padding: 48, gap: 20, columns: 3, height: 410, shade: 58, color: '#ffffff', background: '#35246f', accent: '#fe7b39', image: '', focalX: 50, focalY: 42, visible: true, layout: 'overlay' };
export const NUMBER_BOUNDS = { size: [16, 100], bodySize: [12, 24], padding: [12, 90], gap: [4, 48], columns: [1, 4], height: [0, 700], shade: [0, 90], focalX: [0, 100], focalY: [0, 100] };
export const cloneLayout = value => JSON.parse(JSON.stringify(value));
export function createSection(type, id = globalThis.crypto.randomUUID()) {
  if (!Object.hasOwn(LAYOUT_TYPES, type)) throw new Error('Unknown section type.');
  if (type === 'ridge-intro') return { id, type, label: 'Ridge intro', content: { eyebrow: '', title: '', body: '', formatLine: '', artCaption: '', loops: '1' }, desktop: {}, mobile: {} };
  return { id, type, label: { hero: 'Hero', stats: 'Session numbers', spotlight: 'Rider spotlight', cta: 'Call to action' }[type], content: { eyebrow: '', title: 'Your heading', body: '' }, desktop: { ...STYLE_DEFAULTS, layout: LAYOUT_TYPES[type][0], height: type === 'hero' ? 410 : 0 }, mobile: {} };
}
export function createLayout(name = 'Untitled page') { return { schema: 1, name, sections: [createSection('hero')] }; }
export function effectiveStyle(section, device) { return { ...STYLE_DEFAULTS, ...section.desktop, ...(device === 'mobile' ? section.mobile : {}) }; }
export function safeImage(value) {
  if (value === '') return true;
  if (typeof value !== 'string' || value.length > 2000000) return false;
  if (/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value)) return true;
  // No SVG/data scripts, protocol-relative URLs, or arbitrary schemes.
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
export function validateLayout(raw) {
  if (raw?.schema !== 1 || !Array.isArray(raw.sections) || raw.sections.length < 1 || raw.sections.length > 20) throw new Error('Choose a layout with 1–20 sections (schema 1).');
  const ids = new Set();
  return { schema: 1, name: String(raw.name || 'Untitled page').slice(0, 80), sections: raw.sections.map(item => {
    if (!item || !Object.hasOwn(LAYOUT_TYPES, item.type) || typeof item.id !== 'string' || !item.id || item.id.length > 80 || ids.has(item.id)) throw new Error('Invalid or duplicate section.');
    ids.add(item.id);
    const section = createSection(item.type, item.id);
    section.label = String(item.label || section.label).slice(0, 80);
    for (const key of (item.type === 'ridge-intro' ? ['eyebrow', 'title', 'body', 'formatLine', 'artCaption', 'loops'] : ['eyebrow', 'title', 'body'])) section.content[key] = String(item.content?.[key] ?? '').slice(0, key === 'body' ? 1000 : 160);
    if (item.type === 'ridge-intro' && (!/^\d+$/.test(section.content.loops) || Number(section.content.loops) < 1 || Number(section.content.loops) > 20)) throw new Error('Invalid Ridge loop artwork count.');
    for (const device of ['desktop', 'mobile']) {
      const styles = item[device] || {};
      if (typeof styles !== 'object' || Array.isArray(styles)) throw new Error('Invalid device styles.');
      for (const [key, value] of Object.entries(styles)) {
        if (!Object.hasOwn(STYLE_DEFAULTS, key)) continue;
        let valid = false;
        if (Object.hasOwn(NUMBER_BOUNDS, key)) { const [min, max] = NUMBER_BOUNDS[key]; valid = typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max && (key !== 'columns' || Number.isInteger(value)); }
        else if (['color', 'background', 'accent'].includes(key)) valid = typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
        else if (key === 'font') valid = Object.hasOwn(LAYOUT_FONTS, value);
        else if (key === 'align') valid = ['left', 'center', 'right'].includes(value);
        else if (key === 'position') valid = ['top', 'middle', 'bottom'].includes(value);
        else if (key === 'layout') valid = LAYOUT_TYPES[item.type].includes(value);
        else if (key === 'visible') valid = typeof value === 'boolean';
        else if (key === 'image') valid = safeImage(value) || value === 'assets/ridge.jpg';
        if (!valid) throw new Error(`Unsupported value for ${key}.`);
        // Relative prototype photo is not a website asset. Require an explicit upload.
        section[device][key] = key === 'image' && value === 'assets/ridge.jpg' ? '' : value;
      }
    }
    return section;
  }) };
}
export function updateSectionStyle(document, id, device, property, value) {
  const next = cloneLayout(document); const section = next.sections.find(s => s.id === id);
  if (!section || !['desktop', 'mobile'].includes(device)) return next;
  if (value === undefined && device === 'mobile') delete section.mobile[property];
  else section[device][property] = value;
  return validateLayout(next);
}
export function moveSection(document, id, delta) {
  const next = cloneLayout(document); const i = next.sections.findIndex(s => s.id === id), j = i + delta;
  if (i >= 0 && j >= 0 && j < next.sections.length) [next.sections[i], next.sections[j]] = [next.sections[j], next.sections[i]];
  return next;
}
export function layoutStorageKey(pageKey) {
  if (!/^[a-z0-9][a-z0-9/_-]{0,99}$/.test(pageKey)) throw new Error('Invalid page key.');
  return `rtg.layout.draft.v1:${pageKey}`;
}
export function saveLocalDraft(storage, pageKey, document) { storage.setItem(layoutStorageKey(pageKey), JSON.stringify(validateLayout(document))); }
export function loadLocalDraft(storage, pageKey) { const value = storage.getItem(layoutStorageKey(pageKey)); return value ? validateLayout(JSON.parse(value)) : null; }

export function isSafeLayoutAction(href) {
  return typeof href === 'string' && href.startsWith('/') && !href.startsWith('//') && !href.includes('\\') && ![...href].some(char => char.charCodeAt(0) <= 32 || char.charCodeAt(0) === 127);
}

