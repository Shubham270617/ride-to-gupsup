import { effectiveStyle, LAYOUT_FONTS, validateLayout, isSafeLayoutAction } from '../../lib/layout/model';
import './layout.css';
import useIsMobile from '../../hooks/useIsMobile';

// Real data is supplied by the host page; never substitute sample athletes/results.
export default function LayoutRenderer({ document, device: requestedDevice, sectionData = {}, onSelect, selectedId }) {
  const isMobile = useIsMobile();
  const device = requestedDevice || (isMobile ? 'mobile' : 'desktop');
  const layout = validateLayout(document);
  return <div className={`rtg-layout rtg-layout-${device}`}>
    {layout.sections.map(section => {
      const style = effectiveStyle(section, device);
      if (!style.visible) return null;
      const data = sectionData[section.id] || {};
      const variables = { '--layout-size': `${style.size}px`, '--layout-body': `${style.bodySize}px`, '--layout-padding': `${style.padding}px`, '--layout-gap': `${style.gap}px`, '--layout-columns': style.columns, '--layout-height': `${style.height}px`, '--layout-color': style.color, '--layout-background': style.background, '--layout-accent': style.accent, '--layout-font': LAYOUT_FONTS[style.font], textAlign: style.align };
      return <section key={section.id} data-section-id={section.id} className={`rtg-layout-section rtg-layout-${section.type} variant-${style.layout} ${selectedId === section.id ? 'is-selected' : ''}`} style={variables}>
        {onSelect && <button type="button" className="rtg-layout-select" onClick={() => onSelect(section.id)}>Edit {section.label}</button>}
        {section.type === 'hero' && style.image && <><img className="rtg-layout-photo" src={style.image} alt="" style={{ objectPosition: `${style.focalX}% ${style.focalY}%` }} /><div className="rtg-layout-shade" style={{ opacity: style.shade / 100 }} /></>}
        <div className="rtg-layout-copy" style={{ justifyContent: { top: 'flex-start', middle: 'center', bottom: 'flex-end' }[style.position] }}>
          {section.content.eyebrow && <p className="rtg-layout-eyebrow">{section.content.eyebrow}</p>}
          <h2>{section.content.title}</h2><p>{section.content.body}</p>
          {['stats', 'spotlight'].includes(section.type) && <div className={`rtg-layout-items variant-${style.layout}`}>
            {data.items?.length ? data.items.map((item, i) => <article key={item.id || i}><strong>{item.value || item.name}</strong><p>{item.label || item.detail}</p></article>) : <p className="rtg-layout-empty">Connect this section to {section.type === 'stats' ? 'session results' : 'rider recognition'} to display real data.</p>}
          </div>}
          {isSafeLayoutAction(data.action?.href) && <a className="rtg-layout-action" href={data.action.href}>{data.action.label || 'Learn more'}</a>}
        </div>
      </section>;
    })}
  </div>;
}
