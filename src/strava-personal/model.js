// Pure display projection. The eventual server must authorize the same athlete;
// this check is defense in depth, never a replacement for server authorization.
export function personalActivities(rows, athleteId, days, sport, now = Date.now()) {
  if (!athleteId) return [];
  const cutoff = now - days * 86400000;
  return rows.filter(row => String(row.athleteId) === String(athleteId) &&
    Number.isFinite(Date.parse(row.startedAt)) && Date.parse(row.startedAt) >= cutoff &&
    Date.parse(row.startedAt) <= now && (sport === 'all' || row.sport === sport))
    .map(row => ({id:String(row.id),name:String(row.name || 'Activity'),sport:String(row.sport),startedAt:row.startedAt,
      distance:valid(row.distance),movingSeconds:valid(row.movingSeconds),elevation:valid(row.elevation)}))
    .sort((a,b) => Date.parse(b.startedAt)-Date.parse(a.startedAt));
}
const valid = n => Number.isFinite(n) && n >= 0 ? n : null;
export function totals(rows) {
  return {count:rows.length,distance:sum(rows,'distance'),movingSeconds:sum(rows,'movingSeconds'),elevation:sum(rows,'elevation')};
}
const sum = (rows,key) => rows.some(r=>r[key]!=null) ? rows.reduce((n,r)=>n+(r[key]??0),0) : null;
