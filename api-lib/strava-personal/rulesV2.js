// Inactive synthetic rules workbench. No expression eval, real data or writes.
export const METRICS=Object.freeze({distanceKm:{field:'distanceM',divisor:1000,label:'Distance (km)'},ascentM:{field:'elevationM',divisor:1,label:'Ascent (m)'},movingMinutes:{field:'movingSeconds',divisor:60,label:'Moving time (min)'},speedKmh:{field:'averageSpeedMps',divisor:1/3.6,label:'Average speed (km/h)'}});
const numeric=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
const bounded=n=>numeric(n)&&n<=1e9;
export function validateRuleSet(input){
 const r=structuredClone(input);
 if(r?.window){if(!Number.isFinite(Date.parse(r.window.from))||!Number.isFinite(Date.parse(r.window.until))||Date.parse(r.window.from)>=Date.parse(r.window.until))throw Error('Use an ordered activity window with explicit UTC dates.');}
 if(r?.schemaVersion!==2||typeof r.id!=='string'||!r.id.trim()||!Number.isSafeInteger(r.version)||r.version<1)throw Error('Rule set ID and positive version required.');
 if(!Array.isArray(r.sports)||!r.sports.length||r.sports.some(s=>!['Ride','Run'].includes(s))||typeof r.allowManual!=='boolean'||typeof r.allowTrainer!=='boolean')throw Error('Explicit activity eligibility required.');
 if(!Array.isArray(r.rules)||r.rules.length>20||new Set(r.rules.map(x=>x.id)).size!==r.rules.length)throw Error('Use up to 20 uniquely identified rules.');
 for(const x of r.rules){
  if(typeof x.id!=='string'||!x.id.trim()||typeof x.enabled!=='boolean'||!['metric','bonus'].includes(x.kind)||!bounded(x.points))throw Error('Invalid rule.');
  if(x.kind==='metric'&&(!Object.hasOwn(METRICS,x.metric)||!bounded(x.per)||x.per===0||!bounded(x.after)||!['fractional','completed'].includes(x.counting)))throw Error('Choose metric, positive denominator, threshold and counting mode.');
  if(x.cap!=null&&!bounded(x.cap))throw Error('Invalid points cap.');
  if(!['all','any'].includes(x.match)||!Array.isArray(x.conditions)||x.conditions.length>10)throw Error('Invalid rule conditions.');
  for(const c of x.conditions)if(!Object.hasOwn(METRICS,c.metric)||!['gte','lte'].includes(c.operator)||!bounded(c.value))throw Error('Invalid condition.');
 }
 // Allowlist persisted rule fields; never retain attached activity/provider payloads.
 return {schemaVersion:2,id:r.id,version:r.version,sports:r.sports,allowManual:r.allowManual,allowTrainer:r.allowTrainer,...(r.window?{window:{from:new Date(r.window.from).toISOString(),until:new Date(r.window.until).toISOString()}}:{}),rules:r.rules.map(x=>({id:x.id,enabled:x.enabled,kind:x.kind,points:x.points,...(x.kind==='metric'?{metric:x.metric,per:x.per,after:x.after,counting:x.counting}:{}),...(x.cap!=null?{cap:x.cap}:{}),match:x.match,conditions:x.conditions.map(c=>({metric:c.metric,operator:c.operator,value:c.value}))}))};
}
function metric(a,key){const m=METRICS[key];return numeric(a[m.field])?a[m.field]/m.divisor:null;}
export function evaluateSynthetic(a,input){
 const r=validateRuleSet(input);
 if(a?.source!=='synthetic')throw Error('Real activity scoring is not activated.');
 const result={activityId:a.id,ruleSetId:r.id,version:r.version,eligible:true,points:0,breakdown:[]};
 const reject=reason=>({...result,eligible:false,reason});
 if(r.window&&(!Number.isFinite(Date.parse(a.startedAt))||Date.parse(a.startedAt)<Date.parse(r.window.from)||Date.parse(a.startedAt)>=Date.parse(r.window.until)))return reject('Outside activity window or start date missing.');
 if(!r.sports.includes(a.sport))return reject('Sport not eligible.');
 if(typeof a.manual!=='boolean'||typeof a.trainer!=='boolean')return reject('Eligibility evidence missing.');
 if((a.manual&&!r.allowManual)||(a.trainer&&!r.allowTrainer))return reject('Activity type not eligible.');
 for(const x of r.rules){
  let points=0,reason='Disabled';
  if(x.enabled){
   const checks=x.conditions.map(c=>{const n=metric(a,c.metric);return n!=null&&(c.operator==='gte'?n>=c.value:n<=c.value);});
   const matches=!checks.length||(x.match==='all'?checks.every(Boolean):checks.some(Boolean));
   if(!matches)reason='Rule conditions not met (or metric missing)';
   else if(x.kind==='bonus'){points=x.points;reason='Fixed bonus';}
   else {const n=metric(a,x.metric);if(n==null)reason='Metric missing';else{let units=Math.max(0,n-x.after)/x.per;if(x.counting==='completed')units=Math.floor(units);points=units*x.points;reason='Metric rule';}}
   if(x.cap!=null)points=Math.min(points,x.cap);
  }
  if(!Number.isFinite(points))throw Error('Score exceeds supported range.');
  result.breakdown.push({ruleId:x.id,points,reason});result.points+=points;
 }
 result.points=Math.round(result.points*100)/100;
 return result;
}
export function previewRevision(activities,current,candidate){
 const before=validateRuleSet(current),after=validateRuleSet(candidate);
 if(before.id!==after.id||after.version!==before.version+1)throw Error('Preview requires the next version of the same rule set.');
 if(!Array.isArray(activities)||activities.length>1000||activities.some(a=>typeof a.id!=='string'||!a.id)||new Set(activities.map(a=>a.id)).size!==activities.length)throw Error('Use uniquely identified synthetic activities.');
 return {previewOnly:true,ruleSetId:before.id,fromVersion:before.version,toVersion:after.version,rows:activities.map(a=>{const old=evaluateSynthetic(a,before),next=evaluateSynthetic(a,after);return {activityId:a.id,before:old,after:next,delta:Math.round((next.points-old.points)*100)/100};})};
}
