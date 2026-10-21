import './ridgeIntro.css';
import { LAYOUT_FONTS } from '../../lib/layout/model';

// Shared by the native page and editor. Absent overrides retain native CSS.
export default function RidgeIntro({ content, styles = {}, device, onSelect, selected, heroPhoto, titleId }) {
  if (styles.visible === false) return null;
  const css = {};
  const px = { size: '--ridge-title-size', bodySize: '--ridge-body-size', padding: '--ridge-padding', gap: '--ridge-gap' };
  for (const [key, variable] of Object.entries(px)) if (styles[key] !== undefined) css[variable] = `${styles[key]}px`;
  for (const key of ['color', 'background', 'accent']) if (styles[key]) css[`--ridge-${key}`] = styles[key];
  if (styles.background) css['--ridge-overlay'] = `linear-gradient(100deg,${styles.background}f7,${styles.background}99)`;
  if (styles.font) css['--ridge-font'] = LAYOUT_FONTS[styles.font];
  if (styles.align) css.textAlign = styles.align;
  if (Object.hasOwn(styles, 'image')) css['--rr-hero-photo'] = styles.image ? `url("${styles.image}")` : 'none';
  else if (heroPhoto) css['--rr-hero-photo'] = `url("${heroPhoto}")`;
  return <section className={`rr-intro${device || Object.keys(styles).length ? ' ridge-editable-intro' : ''}${device ? ` ridge-device-${device}` : ''}${selected ? ' is-selected' : ''}`} style={css} aria-label={content.title}>
    {onSelect && <button type="button" className="rtg-layout-select" onClick={onSelect}>Edit Ridge intro</button>}
    <div className="rr-intro-copy">
      <p className="rr-eyebrow">{content.eyebrow}</p>
      <h1 id={titleId}>{content.title}<span>.</span></h1>
      <p className="rr-intro-line">{content.body}</p>
      <p className="rr-format">{content.formatLine}</p>
    </div>
    <div className="rr-format-art" aria-hidden="true" style={{ '--rr-loops': Number(content.loops) }}>
      {Array.from({ length: Number(content.loops) }, (_, i) => <span key={i}>{String(i + 1).padStart(2, '0')}</span>)}
      <b>{content.artCaption}</b>
    </div>
  </section>;
}
