// Proposed starter budgets from the owner's RTG_Volunteer_Install.txt (18 October).
// Presentation only: these are not offers, approved rates or recruitment records.
export const crewLeads = [
  {name:'Simran',role:'Creative, Social Media & Overall Lead',tag:'Creative direction',tone:'violet'},
  {name:null,role:'Logistics Lead',tag:'Operations',tone:'orange'},
  {name:'Manish Jayal',role:'Coaching, Mentorship & Training Lead',tag:'iRide2Reach',tone:'mint'},
  {name:null,role:'Ride Lead',tag:'On two wheels',tone:'blue'},
  {name:null,role:'Run Lead',tag:'On the move',tone:'pink'},
];
const role=(id,title,team,tone,mark,intro,tasks,fit,deliverable,amount,unit,hours,monthlyCount)=>({id,title,team,tone,mark,intro,tasks,fit,deliverable,location:'RTG activities & events',plans:['One day','Weekly','Monthly'],proposal:{amount,unit,hours,monthlyCount}});
export const crewOpportunities=[
 role('crew-photography','Event photographer','Photography','violet','◎','Find the faces, the movement and the little moments that make an RTG day.', ['Capture the agreed event moments and community portraits.','Organise and hand over the selected photographs.'],'A photographer with their own suitable kit and a considered eye for people.','An organised photo handover; shot list and delivery timing agreed before the assignment.',1000,'assignment',5,4),
 role('crew-video','Event video storyteller','Film & design','orange','▷','Bring the day to life through thoughtful footage, from the first arrival to the last cheer.', ['Capture the agreed event footage.','Label and hand over usable footage for the editing team.'],'Comfort with filming movement, clear framing and reliable file handling.','Footage handover only. Final editing is a separate scope.',1200,'assignment',5,4),
 role('crew-reels','Reels & video editor','Film & design','pink','✂','Turn a collection of moments into a short story people want to watch.', ['Edit supplied footage into a short reel.','Prepare the agreed final export and handover.'],'Short-form storytelling and editing skills; a suitable editing setup.','One short reel, up to 60 seconds. Brief and revision scope agreed in advance.',600,'reel',2,8),
 role('crew-design','Social creative designer','Film & design','blue','✳','Give RTG stories a clear, recognisable voice across community content.', ['Create a social creative from an agreed brief.','Follow RTG visual direction and supply the agreed files.'],'A feel for typography, layout and accessible social design.','One creative. Format, copy and revision scope agreed before starting.',400,'creative',1.5,8),
 role('crew-setup','Event setup & equipment','Event support','mint','⚑','Make the space ready so the community can simply turn up and take part.', ['Prepare the agreed event area and equipment.','Support setup, safe pack-down and the equipment handover.'],'Practical organisation, punctuality and care with shared equipment.','One agreed setup/equipment shift, with a clear handover.',350,'shift',3,4),
 role('crew-packing','Medals, goodies & packing','Event support','yellow','◇','Put care into the details people take home from an RTG experience.', ['Sort and pack the agreed medals or goodies.','Check quantities and hand over prepared packs.'],'Attention to detail and a steady, organised approach.','One packing shift with quantities checked against the agreed list.',300,'shift',3,4),
 {id:'crew-logistics',title:'Logistics coordination associate',team:'Event support',tone:'orange',mark:'↗',intro:'Keep the small moving parts connected across the RTG calendar.',tasks:['Coordinate the agreed logistics checklist.','Track preparation and handovers with the event lead.'],fit:'Clear communication, follow-through and practical planning.',deliverable:'An agreed monthly coordination scope, up to 6 hours per week.',location:'Across RTG',plans:['Monthly'],proposal:{monthlyAmount:4000,weeklyHours:6}},
];
export function proposalFor(role,cadence){
 const p=role.proposal;if(!p)return null;
 if(p.monthlyAmount)return cadence==='Monthly'?{amount:p.monthlyAmount,label:'per month',detail:`Up to ${p.weeklyHours} hours/week · agreed coordination scope`}:null;
 if(cadence==='Monthly')return {amount:p.amount*p.monthlyCount,label:'monthly proposal',detail:`${p.monthlyCount} ${p.unit}${p.monthlyCount===1?'':'s'} · up to ${p.hours*p.monthlyCount} hours total`};
 return {amount:p.amount,label:`per ${cadence==='Weekly'?'confirmed ':''}${p.unit}`,detail:`Up to ${p.hours} hours/${p.unit}${cadence==='Weekly'?' · subject to a confirmed weekly brief':''}`};
}
