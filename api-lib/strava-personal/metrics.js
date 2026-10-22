// Minimal structured metrics only. Never persist the complete API response.
const numberOrNull=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null;
export function mapOwnActivity(activity,athleteId){
 if(!athleteId||String(activity.athlete?.id)!==String(athleteId))throw Error('Activity athlete mismatch.');
 if(!Number.isSafeInteger(activity.id)||activity.id<=0||!Number.isFinite(Date.parse(activity.start_date)))throw Error('Invalid activity identity/date.');
 return {source:'strava',activityId:String(activity.id),athleteId:String(athleteId),sport:String(activity.sport_type||activity.type||'Unknown'),startedAt:new Date(activity.start_date).toISOString(),distanceM:numberOrNull(activity.distance),movingSeconds:numberOrNull(activity.moving_time),elapsedSeconds:numberOrNull(activity.elapsed_time),elevationM:numberOrNull(activity.total_elevation_gain),averageSpeedMps:numberOrNull(activity.average_speed),manual:typeof activity.manual==='boolean'?activity.manual:null,trainer:typeof activity.trainer==='boolean'?activity.trainer:null};
}
