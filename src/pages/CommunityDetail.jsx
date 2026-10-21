import { Link, useParams } from "react-router-dom";
import { useCommunityDetail, safeCommunityLink } from "../lib/communityDetails";
import "../styles/community-detail.css";

function ActivityLink({ to, children }) {
  const href = safeCommunityLink(to);
  if (!href) return null;
  return href.startsWith("/") ? <Link className="rtg-community-detail-link" to={href}>{children} →</Link>
    : <a className="rtg-community-detail-link" href={href} target="_blank" rel="noopener noreferrer">{children} ↗</a>;
}

export default function CommunityDetail({ editor }) {
  const { communityId } = useParams();
  const { group, loading, error, activities = [], activitiesLoading, activitiesError, retry } = useCommunityDetail(editor?.communityId || communityId);
  const section=(id,child)=>editor?editor.section('detail-'+id,child):child;
  const back = <Link className="rtg-community-detail-back" to="/community#rtg-network">← All communities</Link>;
  if (loading) return <div className="rtg-community-detail">{back}<p role="status">Loading community…</p></div>;
  if (error) return <div className="rtg-community-detail">{back}<h1>Community unavailable</h1><p role="alert">{error}</p><button onClick={retry} type="button">Try again</button></div>;
  if (!group) return <div className="rtg-community-detail">{back}<h1>Community not found</h1><p>This page is not currently published. Explore the community directory for available groups.</p></div>;
  const contacts = [
    ["Public contact", group.contact_person], ["How to reach the community", group.reach], ["How to join", group.join_text],
  ].filter(([, value]) => value);
  return (
    <div className="rtg-community-detail">
      {back}
      {section('intro', <header className="rtg-community-detail-hero">
        {group.monogram && <span className="rtg-community-detail-monogram" aria-hidden="true">{group.monogram}</span>}
        <div>
          <p className="rtg-community-detail-eyebrow">{group.tagline || [group.location, group.sport].filter(Boolean).join(" • ") || "RTG Community Network"}</p>
          <h1 className="font-display">{group.name}</h1>
          {group.relation_label && <span className="rtg-community-detail-badge">{group.relation_label}</span>}
        </div>
      </header>)}
      <div className="rtg-community-detail-grid">
        {section('about', <section className="rtg-community-detail-panel" aria-labelledby="community-about">
          <h2 id="community-about">About the community</h2>
          <p className="rtg-community-detail-text">{group.description || "More about this community will be added here."}</p>
          {group.connection_label && <p className="rtg-community-detail-muted">{group.connection_label}</p>}
        </section>)}
        {section('join', <section className="rtg-community-detail-panel" aria-labelledby="community-join">
          <h2 id="community-join">Get involved</h2>
          {contacts.length ? <dl>{contacts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
            : <p>Joining details have not been published yet.</p>}
        </section>)}
      </div>
      {section('activities', <section className="rtg-community-detail-activities" aria-labelledby="community-activities">
        <div className="rtg-community-detail-sectionhead"><div><p className="rtg-community-detail-eyebrow">Meet. Move. Connect.</p><h2 id="community-activities">Activities & challenges</h2></div><Link to="/calendar">View full RTG calendar →</Link></div>
        {activitiesLoading ? <p role="status">Loading activities…</p> : activitiesError ? <div><p role="alert">{activitiesError}</p><button type="button" onClick={retry}>Try again</button></div> : activities.length ? (
          <div className="rtg-community-detail-grid">{activities.map((activity) => <article key={activity.id} className="rtg-community-detail-panel">
            {activity.status_label && <p className="rtg-community-detail-eyebrow">{activity.status_label}</p>}
            <h3>{activity.title}</h3>
            <p className="rtg-community-detail-muted">{[activity.schedule_type === "weekly" ? `Every ${activity.weekday || "week"}` : activity.activity_date || activity.when_text, activity.time_text].filter(Boolean).join(" · ")}</p>
            {activity.location && <p>{activity.location}</p>}
            {activity.format && <p>{activity.format}</p>}
            {activity.summary && <p className="rtg-community-detail-text">{activity.summary}</p>}
            {activity.note && <p className="rtg-community-detail-note">{activity.note}</p>}
            <ActivityLink to={activity.link_url}>{activity.link_label || "View activity"}</ActivityLink>
          </article>)}</div>
        ) : <p>No activities are currently listed for this community. Check the RTG calendar for other sessions.</p>}
      </section>)}
    </div>
  );
}

