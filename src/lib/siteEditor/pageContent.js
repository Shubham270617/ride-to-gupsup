import {howItStarted} from '../../data/content.js';
const descriptors=[
  {
    "id": "about-hero",
    "label": "About hero",
    "fields": [
      {
        "field": "text.about.hero.eyebrow",
        "key": "text.about.hero.eyebrow",
        "label": "Eyebrow",
        "defaultValue": "Our Story",
        "type": "text"
      },
      {
        "field": "text.about.hero.title",
        "key": "text.about.hero.title",
        "label": "Headline",
        "defaultValue": "More Than Sport. A Community.",
        "type": "text"
      },
      {
        "field": "text.about.hero.subtitle",
        "key": "text.about.hero.subtitle",
        "label": "Paragraph",
        "defaultValue": "RideTeaGupShup brings cyclists, runners and endurance enthusiasts together to move, connect, learn and create experiences worth remembering.",
        "type": "text"
      }
    ],
    "imageKey": "aboutHero"
  },
  {
    "id": "about-howItStarted",
    "label": "How It Started",
    "fields": [
      {
        "field": "text.about.howItStarted.eyebrow",
        "key": "text.about.howItStarted.eyebrow",
        "label": "Eyebrow",
        "defaultValue": "Our Origin",
        "type": "text"
      },
      {
        "field": "text.about.howItStarted.title",
        "key": "text.about.howItStarted.title",
        "label": "Heading",
        "defaultValue": "How It Started",
        "type": "text"
      }
    ],
    "imageKey": "aboutStory1"
  },
  {
    "id": "about-whyExists",
    "label": "Why RTG Exists",
    "fields": [
      {
        "field": "text.about.whyExists.eyebrow",
        "key": "text.about.whyExists.eyebrow",
        "label": "Eyebrow",
        "defaultValue": "Why We're Here",
        "type": "text"
      },
      {
        "field": "text.about.whyExists.title",
        "key": "text.about.whyExists.title",
        "label": "Heading",
        "defaultValue": "Why RTG Exists",
        "type": "text"
      }
    ]
  },
  {
    "id": "about-journey",
    "label": "The RTG Journey",
    "fields": [
      {
        "field": "text.about.journey.eyebrow",
        "key": "text.about.journey.eyebrow",
        "label": "Eyebrow",
        "defaultValue": "How Far We've Come",
        "type": "text"
      },
      {
        "field": "text.about.journey.title",
        "key": "text.about.journey.title",
        "label": "Heading",
        "defaultValue": "The RTG Journey",
        "type": "text"
      }
    ]
  },
  {
    "id": "about-missionVision",
    "label": "Mission & Vision",
    "fields": [
      {
        "field": "text.about.missionVision.eyebrow",
        "key": "text.about.missionVision.eyebrow",
        "label": "Eyebrow",
        "defaultValue": "What Drives Us",
        "type": "text"
      },
      {
        "field": "text.about.missionVision.title",
        "key": "text.about.missionVision.title",
        "label": "Heading",
        "defaultValue": "Mission & Vision",
        "type": "text"
      },
      {
        "field": "text.about.mission",
        "key": "text.about.mission",
        "label": "mission paragraph",
        "defaultValue": "Build an inclusive endurance community where people connect through sport, learn from one another, challenge themselves and create experiences that go beyond the finish line.",
        "type": "text"
      },
      {
        "field": "text.about.vision",
        "key": "text.about.vision",
        "label": "vision paragraph",
        "defaultValue": "Build one of India's most trusted endurance communities — connecting cycling, running, triathlon and outdoor adventure through community, events, training and technology.",
        "type": "text"
      }
    ]
  },
  {
    "id": "about-howWeBring",
    "label": "How We Bring the Community Together",
    "fields": [
      {
        "field": "text.about.howWeBring.eyebrow",
        "key": "text.about.howWeBring.eyebrow",
        "label": "Eyebrow",
        "defaultValue": "What We Offer",
        "type": "text"
      },
      {
        "field": "text.about.howWeBring.title",
        "key": "text.about.howWeBring.title",
        "label": "Heading",
        "defaultValue": "How We Bring the Community Together",
        "type": "text"
      }
    ]
  },
  {
    "id": "about-coreValues",
    "label": "Our Core Values",
    "fields": [
      {
        "field": "text.about.coreValues.eyebrow",
        "key": "text.about.coreValues.eyebrow",
        "label": "Eyebrow",
        "defaultValue": "What We Stand For",
        "type": "text"
      },
      {
        "field": "text.about.coreValues.title",
        "key": "text.about.coreValues.title",
        "label": "Heading",
        "defaultValue": "Our Core Values",
        "type": "text"
      }
    ]
  },
  {
    "id": "about-motion",
    "label": "Where We Stand Today",
    "fields": [
      {
        "field": "text.about.motion.eyebrow",
        "key": "text.about.motion.eyebrow",
        "label": "Eyebrow",
        "defaultValue": "RTG in Motion",
        "type": "text"
      },
      {
        "field": "text.about.motion.title",
        "key": "text.about.motion.title",
        "label": "Heading",
        "defaultValue": "Where We Stand Today",
        "type": "text"
      }
    ]
  },
  {
    "id": "about-roadAhead",
    "label": "The Road Ahead",
    "fields": [
      {
        "field": "text.about.roadAhead.eyebrow",
        "key": "text.about.roadAhead.eyebrow",
        "label": "Eyebrow",
        "defaultValue": "What's Coming",
        "type": "text"
      },
      {
        "field": "text.about.roadAhead.title",
        "key": "text.about.roadAhead.title",
        "label": "Heading",
        "defaultValue": "The Road Ahead",
        "type": "text"
      },
      {
        "field": "text.about.roadAhead",
        "key": "text.about.roadAhead",
        "label": "roadAhead paragraph",
        "defaultValue": "We're building RTG step by step — stronger local communities, better events, meaningful challenges, structured training opportunities, memorable endurance experiences and a digital ecosystem that keeps everything connected.",
        "type": "text"
      }
    ]
  }
];
descriptors.find(s=>s.id==='about-howItStarted').fields.push(...howItStarted.map((value,i)=>({field:'text.about.howItStarted.p'+(i+1),key:'text.about.howItStarted.p'+(i+1),label:'Story paragraph '+(i+1),defaultValue:value})));
const resolve=s=>({...s,resolve:settings=>Object.fromEntries(s.fields.map(f=>[f.field,settings[f.key]??f.defaultValue]))});
export const ABOUT_SECTIONS=descriptors.map(resolve);
export const VOLUNTEER_SECTIONS=[
  {
    "id": "volunteer-hero",
    "label": "Volunteer introduction",
    "fields": [
      {
        "field": "text.volunteer.hero.eyebrow",
        "key": "text.volunteer.hero.eyebrow",
        "label": "Eyebrow",
        "defaultValue": "RIDE · TEA · GUPSHUP",
        "type": "text"
      },
      {
        "field": "text.volunteer.hero.titleBefore",
        "key": "text.volunteer.hero.titleBefore",
        "label": "Heading — first part",
        "defaultValue": "RTG Crew ",
        "type": "text"
      },
      {
        "field": "text.volunteer.hero.titleAccent",
        "key": "text.volunteer.hero.titleAccent",
        "label": "Heading — accent",
        "defaultValue": "& Opportunities",
        "type": "text"
      },
      {
        "field": "text.volunteer.hero.titleAfter",
        "key": "text.volunteer.hero.titleAfter",
        "label": "Heading — last part",
        "defaultValue": ".",
        "type": "text"
      },
      {
        "field": "text.volunteer.hero.intro",
        "key": "text.volunteer.hero.intro",
        "label": "Introduction",
        "defaultValue": "Great days need great people. Bring your creativity, care and energy to the rides, runs and experiences that bring RTG together.",
        "type": "text"
      },
      {
        "field": "text.volunteer.hero.buttonLabel",
        "key": "text.volunteer.hero.buttonLabel",
        "label": "Explore button label",
        "defaultValue": "Find your role",
        "type": "text"
      }
    ]
  },
  {
    "id": "volunteer-roles",
    "label": "Role directory",
    "fields": [
      {
        "field": "text.volunteer.roles.eyebrow",
        "key": "text.volunteer.roles.eyebrow",
        "label": "Eyebrow",
        "defaultValue": "FLEXIBLE CREW OPPORTUNITIES",
        "type": "text"
      },
      {
        "field": "text.volunteer.roles.title",
        "key": "text.volunteer.roles.title",
        "label": "Heading",
        "defaultValue": "Your skills. ",
        "type": "text"
      },
      {
        "field": "text.volunteer.roles.accent",
        "key": "text.volunteer.roles.accent",
        "label": "Heading — accent",
        "defaultValue": "Our next great day.",
        "type": "text"
      }
    ]
  },
  {
    "id": "volunteer-journey",
    "label": "Crew journey",
    "fields": [
      {
        "field": "text.volunteer.journey.eyebrow",
        "key": "text.volunteer.journey.eyebrow",
        "label": "Eyebrow",
        "defaultValue": "GOOD WORK STARTS WITH A CLEAR BRIEF",
        "type": "text"
      },
      {
        "field": "text.volunteer.journey.title",
        "key": "text.volunteer.journey.title",
        "label": "Heading",
        "defaultValue": "A little structure. A lot of possibility.",
        "type": "text"
      },
      {
        "field": "text.volunteer.journey.buttonLabel",
        "key": "text.volunteer.journey.buttonLabel",
        "label": "Community button label",
        "defaultValue": "Meet the RTG community ↗",
        "type": "text"
      }
    ]
  }
].map(resolve);
