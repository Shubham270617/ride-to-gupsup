// Proposed starting budgets: owner revisions to the original RTG crew catalogue.
// Presentation only: these are not offers, approved rates or recruitment records.
export const crewLeads = [
  {name:'Simran',role:'Social Media & Creative Lead; Overall RTG Lead',tag:'Creative direction',tone:'violet'},
  {name:null,role:'Logistics Lead',tag:'Operations',tone:'orange'},
  {name:'Manish Jayal (iRide2Reach)',role:'Mentorship, Coaching & Training Lead',tag:'iRide2Reach',tone:'mint'},
  {name:null,role:'Ride Lead',tag:'On two wheels',tone:'blue'},
  {name:null,role:'Run Lead',tag:'On the move',tone:'pink'},
];
const role=(id,title,team,tone,mark,intro,tasks,fit,deliverable,amount)=>({id,title,team,tone,mark,intro,tasks,fit,deliverable,location:'RTG activities & events',plans:['One day','Weekly','Monthly'],proposal:{amount}});
export const crewOpportunities=[
 role('crew-photography','Event photographer','Photography','violet','◎','Find the faces, the movement and the little moments that make an RTG day.', ['Capture the agreed event moments and community portraits.','Organise and hand over the selected photographs.'],'A photographer with their own suitable kit and a considered eye for people.','An organised photo handover; shot list and delivery timing agreed before the assignment.',300),
 role('crew-video','Event video storyteller','Film & design','orange','▷','Bring the day to life through thoughtful footage, from the first arrival to the last cheer.', ['Capture the agreed event footage.','Label and hand over usable footage for the editing team.'],'Comfort with filming movement, clear framing and reliable file handling.','Footage handover only. Final editing is a separate scope.',500),
 role('crew-reels','Reels & video editor','Film & design','pink','✂','Turn a collection of moments into a short story people want to watch.', ['Edit supplied footage into a short reel.','Prepare the agreed final export and handover.'],'Short-form storytelling and editing skills; a suitable editing setup.','One short reel. Brief and revision scope agreed in advance.',500),
 role('crew-design','Social creative designer','Film & design','blue','✳','Give RTG stories a clear, recognisable voice across community content.', ['Create a social creative from an agreed brief.','Follow RTG visual direction and supply the agreed files.'],'A feel for typography, layout and accessible social design.','One creative. Format, copy and revision scope agreed before starting.',400),
 role('crew-setup','Event setup & equipment','Event support','mint','⚑','Make the space ready so the community can simply turn up and take part.', ['Prepare the agreed event area and equipment.','Support setup, safe pack-down and the equipment handover.'],'Practical organisation, punctuality and care with shared equipment.','One agreed setup/equipment session, with a clear handover.',350),
 role('crew-packing','Medals, goodies & packing','Event support','yellow','◇','Put care into the details people take home from an RTG experience.', ['Sort and pack the agreed medals or goodies.','Check quantities and hand over prepared packs.'],'Attention to detail and a steady, organised approach.','One packing session with quantities checked against the agreed list.',300),
 {id:'crew-logistics',title:'Logistics coordination associate',team:'Event support',tone:'orange',mark:'↗',intro:'Keep the small moving parts connected across the RTG calendar.',tasks:['Coordinate the agreed logistics checklist.','Track preparation and handovers with the event lead.'],fit:'Clear communication, follow-through and practical planning.',deliverable:'An agreed coordination brief for each included session.',location:'Across RTG',plans:['One day','Weekly','Monthly'],proposal:{amount:1000}},
];
export function proposalFor(role,cadence){
 const p=role.proposal;if(!p)return null;
 const sessions=cadence==='Monthly'?4:1;
 return {amount:p.amount*sessions,label:cadence==='Monthly'?'per month':cadence==='Weekly'?'per week':'/ session',detail:cadence==='Monthly'?'Starting package · 4 sessions':cadence==='Weekly'?'Starting package · 1 session':'Per session'};
}
