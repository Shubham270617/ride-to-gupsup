// Wording of the "Complete your profile" page (/onboarding). These are the
// starting values; each one is edited in Admin -> Site Content -> Onboarding
// and saved in site_settings as "text.onboarding.<field>".
export const onboardingKey = (field) => `text.onboarding.${field}`;

export const ONBOARDING_GROUP_HEADINGS = {
  side: "Onboarding — beside the form (over the photo)",
  form: "Onboarding — the form card",
};

export const ONBOARDING_PAGE_TEXT = [
  { group: "side", field: "sideEyebrow", label: "Small line above the headline", type: "text", text: "Welcome to the crew" },
  { group: "side", field: "sideTitle", label: "Headline", type: "text", text: "Ride. Tea." },
  { group: "side", field: "sideTitleAccent", label: "Headline — orange part", type: "text", text: "GupShup." },
  { group: "side", field: "sideText", label: "Paragraph", type: "textarea", text: "India's endurance community for riders and runners. One short form and you are part of every ride, run and chai stop." },
  { group: "side", field: "sidePoints", label: "Points (one per line)", type: "textarea", text: "Weekly rides and runs with people at your pace\nChallenges and labs that track your progress\nMember prices on events and the RTG Store" },
  { group: "form", field: "eyebrow", label: "Small line above the title", type: "text", text: "RTG Community Registration" },
  { group: "form", field: "title", label: "Title", type: "text", text: "Complete Your" },
  { group: "form", field: "titleAccent", label: "Title — coloured part", type: "text", text: "Profile" },
  { group: "form", field: "subtitle", label: "Line under the title", type: "text", text: "A few details so RTG knows who's joining the ride." },
  { group: "form", field: "subtitleJoin", label: "Line under the title — after a Join Community button", type: "text", text: "Complete your RTG Community Profile to officially join the community." },
  { group: "form", field: "submitLabel", label: "Button", type: "text", text: "Finish Setup" },
];
