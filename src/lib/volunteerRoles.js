// Adapted from RTG_Volunteer_Install.txt. Draft role catalogue only.
// Names, compensation and example shifts are intentionally not published before approval.
export const VOLUNTEER_APPLICATIONS_OPEN = false;
export const VOLUNTEER_COMMITMENTS = ["One day", "Weekly", "Monthly", "Internship"];
export const VOLUNTEER_TEAMS = ["Logistics", "Media", "Coaching"];
export const volunteerRoles = [
  {
    "id": "ridge-setup",
    "title": "Ridge setup & hydration crew",
    "team": "Logistics",
    "location": "Talkatora Stadium · Delhi",
    "plans": [
      "One day",
      "Weekly"
    ],
    "intro": "Set the morning up for a smooth start, and keep the hydration point organised.",
    "tasks": [
      "Attend the pre-session briefing and help set out the agreed flags and table.",
      "Prepare water and supplies; keep the area tidy and flag low stock.",
      "Pack, count and return equipment to the lead after the ride."
    ],
    "fit": "Reliable, punctual and comfortable with light setup work. Beginners welcome. Confirm any lifting needs with the lead.",
    "deliverable": "Setup checklist completed, hydration station managed and stock handed back.",
    "ridge": true
  },
  {
    "id": "ridge-timing",
    "title": "Ridge timing & lap support",
    "team": "Logistics",
    "location": "Talkatora Stadium · Delhi",
    "plans": [
      "One day",
      "Weekly"
    ],
    "intro": "Help the timing lead keep each rider’s laps clear, consistent and easy to verify.",
    "tasks": [
      "Learn the timing process during the briefing and confirm rider identification.",
      "Support lap records at the designated safe point; report uncertainty immediately.",
      "Help reconcile records with the timing lead. Do not change results without approval."
    ],
    "fit": "Attention to detail and confidence using a phone. Practice is provided before live timing.",
    "deliverable": "A checked lap record and any discrepancies handed to the timing lead.",
    "ridge": true
  },
  {
    "id": "ridge-finish",
    "title": "Ridge welcome & finish crew",
    "team": "Logistics",
    "location": "Talkatora Stadium · Delhi",
    "plans": [
      "One day",
      "Weekly"
    ],
    "intro": "Be the welcoming face at check-in and the helping hand when the last rider finishes.",
    "tasks": [
      "Welcome riders and assist the lead with attendance and the session briefing.",
      "Keep the designated gathering area clear and help with the finish handover.",
      "Escalate incidents to the lead; help clean up before departure."
    ],
    "fit": "Friendly, calm and organised. No traffic control or independent first-aid duty is assigned.",
    "deliverable": "Attendance handover, a tidy finish area and a short debrief.",
    "ridge": true
  },
  {
    "id": "event-kit",
    "title": "Event setup & equipment assistant",
    "team": "Logistics",
    "location": "Delhi NCR · on ground",
    "plans": [
      "One day",
      "Weekly",
      "Monthly"
    ],
    "intro": "Get flags, backdrops and event equipment to the right place, ready at the right time.",
    "tasks": [
      "Check the inventory with the lead before dispatch.",
      "Assist with agreed setup and packing tasks; report missing or damaged items.",
      "Return and count the kit after use. Transport arrangements are agreed separately."
    ],
    "fit": "Organised and comfortable with practical tasks. Heavy lifting, driving and rigging require separate arrangements.",
    "deliverable": "Signed inventory checklist, safe setup and completed equipment return.",
    "ridge": false
  },
  {
    "id": "packing",
    "title": "Medals, goodies & packing crew",
    "team": "Logistics",
    "location": "Delhi NCR · agreed packing location",
    "plans": [
      "One day",
      "Monthly"
    ],
    "intro": "Make every participant pack feel considered, complete and ready to hand over.",
    "tasks": [
      "Count medals, goodies and packaging against the approved list.",
      "Pack and label the agreed batches, keeping personal details private.",
      "Report shortages and hand over a final count to the logistics lead."
    ],
    "fit": "Careful, methodical and comfortable with repetitive packing tasks. Beginners welcome.",
    "deliverable": "Agreed batch packed and checked, with a stock reconciliation.",
    "ridge": false
  },
  {
    "id": "logistics-coordinator",
    "title": "Logistics coordination associate",
    "team": "Logistics",
    "location": "Delhi NCR · hybrid",
    "plans": [
      "Monthly",
      "Internship"
    ],
    "intro": "Help the logistics lead connect the checklist, the suppliers and the people behind each event.",
    "tasks": [
      "Maintain the stock tracker and a weekly requirements checklist.",
      "Collect quotations and follow up approved orders for medals, goodies and backdrops.",
      "Prepare packing schedules and crew allocations for the lead to approve."
    ],
    "fit": "Comfortable with spreadsheets and follow-ups. Purchasing authority remains with the lead.",
    "deliverable": "Current inventory, an approved event checklist and a monthly handover.",
    "ridge": false
  },
  {
    "id": "photographer",
    "title": "Community photographer",
    "team": "Media",
    "location": "Delhi NCR · on ground + editing",
    "plans": [
      "One day",
      "Weekly",
      "Monthly",
      "Internship"
    ],
    "intro": "Capture the people, the effort and the small moments that make RTG feel like RTG.",
    "tasks": [
      "Agree a shot list and equipment plan with the media lead before the event.",
      "Photograph the session without obstructing athletes or ignoring photo preferences.",
      "Deliver 20 selected, edited images within the agreed turnaround."
    ],
    "fit": "Share a small portfolio. Camera or capable phone requirements are agreed per assignment; rental is not included.",
    "deliverable": "20 edited images and an organised handover. Image usage and consent are agreed in the brief.",
    "ridge": false
  },
  {
    "id": "videographer",
    "title": "Event video storyteller",
    "team": "Media",
    "location": "Delhi NCR · on ground + file handover",
    "plans": [
      "One day",
      "Weekly",
      "Monthly",
      "Internship"
    ],
    "intro": "Bring home the motion, atmosphere and sounds for RTG’s Instagram and YouTube stories.",
    "tasks": [
      "Plan a short shot list covering the start, action and community moments.",
      "Capture steady vertical and horizontal footage in agreed safe positions.",
      "Deliver labelled clips and a select reel of usable footage to the editor."
    ],
    "fit": "Share video samples. Confirm your camera/phone and audio setup in advance. Drone filming is not included.",
    "deliverable": "Organised footage and selected clips. Final video editing is a separate task.",
    "ridge": false
  },
  {
    "id": "video-editor",
    "title": "Reels & video editor",
    "team": "Media",
    "location": "Remote · Pan India",
    "plans": [
      "One day",
      "Monthly",
      "Internship"
    ],
    "intro": "Turn the morning’s footage into stories people want to watch, share and remember.",
    "tasks": [
      "Edit supplied footage into a vertical reel of up to 60 seconds.",
      "Add approved captions, branding and appropriately licensed audio.",
      "Include up to two small revision rounds within the agreed time budget."
    ],
    "fit": "Share editing samples. Your usual editing tools are welcome. YouTube long-form work is scoped and priced separately.",
    "deliverable": "One ready-to-post short reel and the agreed project handover.",
    "ridge": false
  },
  {
    "id": "creative-designer",
    "title": "Social creative designer",
    "team": "Media",
    "location": "Remote · Pan India",
    "plans": [
      "One day",
      "Monthly",
      "Internship"
    ],
    "intro": "Give every activity a recognisable RTG look—from announcements to spotlight stories.",
    "tasks": [
      "Use approved event details and RTG’s colours and typography.",
      "Create one post or story design, including one small revision.",
      "Share editable files and export sizes agreed with the media lead."
    ],
    "fit": "Canva or design-tool experience and a few samples. Use only images and assets RTG has permission to use.",
    "deliverable": "One approved creative and its editable source. Larger design sets are scoped separately.",
    "ridge": false
  },
  {
    "id": "coaching-assistant",
    "title": "Athlete support & coaching assistant",
    "team": "Coaching",
    "location": "Delhi NCR · on ground",
    "plans": [
      "One day",
      "Weekly",
      "Monthly",
      "Internship"
    ],
    "intro": "Learn alongside the lead and help athletes feel welcomed, informed and supported.",
    "tasks": [
      "Help prepare session equipment, attendance and the briefing area.",
      "Support demonstrations and activities only as directed by the coaching lead.",
      "Collect participant feedback and maintain an agreed learning journal."
    ],
    "fit": "Interest in athlete development and clear communication. No independent training prescriptions, medical advice or unsupervised coaching.",
    "deliverable": "A prepared session, participant-support handover and a short reflection.",
    "ridge": false
  }
];

export function filterVolunteerRoles(roles, { team = "All", commitment = "All", search = "" } = {}) {
  const query = search.trim().toLocaleLowerCase();
  return roles.filter(role => (team === "All" || role.team === team)
    && (commitment === "All" || role.plans.includes(commitment))
    && (!query || [role.title, role.intro, role.location, role.team].join(" ").toLocaleLowerCase().includes(query)));
}

export function validateVolunteerRole(role) {
  if (!role.title?.trim()) return "Enter a role title.";
  if (!VOLUNTEER_TEAMS.includes(role.team)) return "Choose a valid team.";
  if (!role.intro?.trim()) return "Add a role description.";
  if (!Array.isArray(role.plans) || !role.plans.length || role.plans.some(plan => !VOLUNTEER_COMMITMENTS.includes(plan))) return "Choose at least one valid commitment.";
  if (role.title.length > 120 || role.intro.length > 1500) return "Keep the title within 120 characters and description within 1,500 characters.";
  if ((role.location || "").length > 200 || (role.fit || "").length > 1500 || (role.deliverable || "").length > 1500) return "One or more role details exceed the allowed length.";
  if (!Array.isArray(role.tasks) || role.tasks.length > 20 || role.tasks.some(task => typeof task !== "string" || task.length > 500) || role.tasks.join("").length > 5000) return "Use up to 20 responsibilities, each within 500 characters and 5,000 characters total.";
  return "";
}
