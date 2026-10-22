import {it,expect} from 'vitest';
import {crewLeads,crewOpportunities,proposalFor} from '../../../src/data/crewOpportunities';
it('uses owner revised starting session rates and transparent one/four-session packages',()=>{
 const bases=[300,500,500,400,350,300,1000];
 crewOpportunities.forEach((role,i)=>{expect(proposalFor(role,'One day').amount).toBe(bases[i]);expect(proposalFor(role,'One day').label).toBe('/ session');expect(proposalFor(role,'Weekly').amount).toBe(bases[i]);expect(proposalFor(role,'Weekly').detail).toContain('1 session');expect(proposalFor(role,'Monthly').amount).toBe(bases[i]*4);expect(proposalFor(role,'Monthly').detail).toContain('4 sessions');});
 expect(proposalFor(crewOpportunities[6],'Monthly').amount).toBe(4000);
 expect(JSON.stringify(crewOpportunities)).not.toMatch(/hours|per shift|per creative|per assignment/i);
});
it('keeps leadership separate from paid crew and does not invent missing approved snapshot rates',()=>{expect(crewLeads).toHaveLength(5);expect(crewLeads.filter(x=>x.name===null)).toHaveLength(3);expect(crewLeads.every(x=>!x.proposal)).toBe(true);expect(crewOpportunities.every(x=>x.team!=='Coaching')).toBe(true);expect(proposalFor({id:'approved-existing-role'},'Monthly')).toBeNull();});
