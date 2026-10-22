export function createPersonalClient({getSession,fetchImpl=fetch}){
 return async body=>{
  const session=await getSession();if(!session?.access_token)throw Error('Sign in to your existing TEST account first.');
  const response=await fetchImpl('/api/admin/personal-strava?operation=service',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify(body),signal:AbortSignal.timeout(30000),cache:'no-store'});
  const result=await response.json();if(!response.ok){const e=Error(result.next||'Personal operation not completed.');e.code=result.error;throw e;}return result;
 };
}
