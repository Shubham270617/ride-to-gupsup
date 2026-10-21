// Illustrative answers to public profile questionnaire sections only (Q1–12).
// No private approval/consent answers, invented people, contact links or statistics.
export function communityProfileDemo(sport='') {
 const running=/run/i.test(sport);
 const activity=running?'run':'ride';
 return {
  activity,
  story:`A shared ${activity} can turn unfamiliar faces into familiar company. In this illustrative community story, a small group begins meeting because getting outside feels better together. The rhythm is simple: agree a route, look out for one another and leave room for conversation along the way. Over time, those mornings become a reason to return, explore somewhere different and encourage someone taking their first step. The community's character comes from the people who show up, the stories they bring and the welcome they offer next time. This is sample profile copy for review, not a verified account of this group's history.`,
  welcome:[
   ['Experience levels','Demo answer: social sessions could offer a welcoming introduction alongside separate options for experienced participants. Confirm the actual session level with the community.'],
   ['Before your first visit','Demo answer: introduce yourself to the coordinator, check the route and meeting instructions, and bring the equipment required for the activity.'],
   ['Ages & languages','Age eligibility, guardian requirements and supported languages are awaiting community confirmation.'],
  ],
  highlights:[['A signature route',`Demo idea: a favourite local ${activity} with a memorable stop along the way.`],['A shared challenge','Demo idea: a collective goal that celebrates participation and personal progress.'],['Beyond the finish','Demo idea: conversations, community catch-ups and time to welcome someone new.']],
  gallery:[['The starting point','A place to meet and begin.'],['Along the route','Small discoveries between familiar places.'],['A shared finish','Room to celebrate the effort.'],['Stay for the conversation','The part that makes it a community.']],
 };
}
