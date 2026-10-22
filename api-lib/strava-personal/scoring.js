// Synthetic rules workbench only. No Strava-derived scoring or publication is
// enabled while policy applicability and challenge rules remain unresolved.
export function validateRules(r){
 if(r?.schemaVersion!==1||!Number.isSafeInteger(r.version)||r.version<1||typeof r.id!=='string'||!r.id.trim())throw Error('Versioned rules required.');
 if(!Array.isArray(r.sports)||!r.sports.length||r.sports.some(s=>!['Ride','Run'].includes(s)))throw Error('Choose supported sports.');
 for(const key of ['pointsPerKm','pointsPerMovingHour','pointsPer100mElevation'])if(!Number.isFinite(r[key])||r[key]<0||r[key]>10000)throw Error('Invalid point coefficient.');
 if(typeof r.allowManual!=='boolean'||typeof r.allowTrainer!=='boolean')throw Error('Explicit eligibility rules required.');
 return structuredClone(r);
}
export function scoreSynthetic(activity,rules){
 const r=validateRules(rules);
 if(activity.source!=='synthetic')throw Error('Only synthetic scoring is enabled.');
 if(!r.sports.includes(activity.sport))return {eligible:false,reason:'sport',ruleId:r.id,ruleVersion:r.version};
 if(activity.manual==null||activity.trainer==null)return {eligible:false,reason:'missing eligibility evidence',ruleId:r.id,ruleVersion:r.version};
 if((activity.manual&&!r.allowManual)||(activity.trainer&&!r.allowTrainer))return {eligible:false,reason:'activity type',ruleId:r.id,ruleVersion:r.version};
 const parts=[['distanceM',r.pointsPerKm,1000],['movingSeconds',r.pointsPerMovingHour,3600],['elevationM',r.pointsPer100mElevation,100]];
 if(parts.some(([key,coefficient])=>coefficient>0&&(!Number.isFinite(activity[key])||activity[key]<0)))return {eligible:false,reason:'missing metrics',ruleId:r.id,ruleVersion:r.version};
 const breakdown=Object.fromEntries(parts.map(([key,c,d])=>[key,c===0?0:activity[key]/d*c]));
 return {eligible:true,ruleId:r.id,ruleVersion:r.version,points:Math.round(Object.values(breakdown).reduce((a,b)=>a+b,0)*100)/100,breakdown};
}
