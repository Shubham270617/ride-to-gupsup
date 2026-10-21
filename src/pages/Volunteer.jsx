import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { volunteerRoles, VOLUNTEER_TEAMS, VOLUNTEER_COMMITMENTS, filterVolunteerRoles } from "../lib/volunteerRoles";
import "../components/volunteer/volunteer.css";

// No network submissions: this phase deliberately leaves recruitment closed.
export default function Volunteer({ roles = volunteerRoles }) {
  const [params, setParams] = useSearchParams();
  const team = VOLUNTEER_TEAMS.includes(params.get("team")) ? params.get("team") : "All";
  const commitment = VOLUNTEER_COMMITMENTS.includes(params.get("commitment")) ? params.get("commitment") : "All";
  const search = params.get("q") || "";
  const visible = filterVolunteerRoles(roles, { team, commitment, search });
  const selected = roles.find(role => role.id === params.get("role"));
  const detailHeading = useRef(null);
  useEffect(() => { if (selected) detailHeading.current?.focus(); }, [selected]);
  function update(key, value, replace = false) {
    const next = new URLSearchParams(params);
    if (!value || value === "All") next.delete(key); else next.set(key, value);
    if (key !== "role") next.delete("role");
    setParams(next, { replace });
  }
  return (
    <main className="rtg-crew">
      <section className="rtg-crew-hero" aria-labelledby="crew-title">
        <div className="rtg-crew-wrap">
          <p className="rtg-crew-eyebrow">RIDE · TEA · GUPSHUP / CREW</p>
          <h1 id="crew-title">Make the <span>movement</span> happen.</h1>
          <p>Find your place behind the movement. Explore community support, creative roles and learning opportunities with RTG.</p>
          <a className="rtg-crew-button" href="#crew-opportunities">Explore the roles <span aria-hidden="true">↗</span></a>
          <div className="rtg-crew-notice" role="note">
            <strong>Role preview · applications are not open yet.</strong>
            <p>These roles are being prepared. Availability, responsibilities, schedules, team leads and any payment terms must be confirmed by RTG before recruitment opens. No place or paid assignment is offered here.</p>
          </div>
        </div>
      </section>
      <section id="crew-opportunities" className="rtg-crew-wrap rtg-crew-section" aria-labelledby="crew-roles-title">
        <p className="rtg-crew-eyebrow">FIND YOUR PLACE</p>
        <h2 id="crew-roles-title">Different skills. <span>One community.</span></h2>
        <div className="rtg-crew-filters">
          <label>Search roles<input type="search" value={search} placeholder="Try timing, photography or design" onChange={e => update("q", e.target.value, true)} /></label>
          <label>Team<select value={team} onChange={e => update("team", e.target.value)}><option>All</option>{VOLUNTEER_TEAMS.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Commitment<select value={commitment} onChange={e => update("commitment", e.target.value)}><option>All</option>{VOLUNTEER_COMMITMENTS.map(value => <option key={value}>{value}</option>)}</select></label>
        </div>
        <p className="rtg-crew-count" role="status">{visible.length} {visible.length === 1 ? "role" : "roles"} to explore</p>
        {selected && <article className="rtg-crew-detail" aria-labelledby="crew-detail-title">
          <button type="button" className="rtg-crew-text-button" onClick={() => update("role", "")}>← Close role details</button>
          <p className="rtg-crew-eyebrow">{selected.team} · ROLE PREVIEW</p>
          <h3 id="crew-detail-title" ref={detailHeading} tabIndex={-1}>{selected.title}</h3>
          <p>{selected.intro}</p>
          <h4>What you would help with</h4>
          <ul>{selected.tasks.map(task => <li key={task}>{task}</li>)}</ul>
          <h4>Who this could suit</h4><p>{selected.fit}</p>
          <h4>The handover</h4><p>{selected.deliverable}</p>
          <p className="rtg-crew-closed">Applications closed. No personal details are collected on this preview.</p>
        </article>}
        {visible.length ? <div className="rtg-crew-grid">{visible.map(role => <article className="rtg-crew-card" key={role.id}>
          <div className="rtg-crew-card-top"><span>{role.team}</span>{role.ridge && <span>Ridge crew</span>}</div>
          <h3>{role.title}</h3><p>{role.intro}</p>
          <p className="rtg-crew-location">{role.location}</p>
          <div className="rtg-crew-tags">{role.plans.map(plan => <span key={plan}>{plan}</span>)}</div>
          <button type="button" aria-expanded={selected?.id === role.id} aria-label={`View ${role.title}`} onClick={() => update("role", role.id)}>Explore role <span aria-hidden="true">↗</span></button>
        </article>)}</div> : <div className="rtg-crew-empty"><h3>No roles match those filters.</h3><p>Try another team or commitment, or clear your search.</p><button className="rtg-crew-button" type="button" onClick={() => setParams({})}>Clear filters</button></div>}
      </section>
      <section className="rtg-crew-journey" aria-labelledby="crew-journey-title"><div className="rtg-crew-wrap">
        <p className="rtg-crew-eyebrow">LEARN BY CONTRIBUTING</p><h2 id="crew-journey-title">A journey, not just a shift.</h2>
        <p>The reference programme includes three- and six-month internship pathways. Scope, supervision, learning goals and any stipend will be agreed before someone joins. Exploring a role does not reserve a place.</p>
        <Link to="/community" className="rtg-crew-button">Meet the RTG community ↗</Link>
      </div></section>
    </main>
  );
}
