import {it,expect} from 'vitest';
import {crewLeads,crewOpportunities,proposalFor} from '../../../src/data/crewOpportunities';
it('preserves recovered proposal totals and workload rather than inventing weekly salaries',()=>{
 const expected=[[1000,4000,20],[1200,4800,20],[600,4800,16],[400,3200,12],[350,1400,12],[300,1200,12]];
 crewOpportunities.slice(0,6).forEach((role,i)=>{expect(proposalFor(role,'One day').amount).toBe(expected[i][0]);expect(proposalFor(role,'Weekly').amount).toBe(expected[i][0]);expect(proposalFor(role,'Weekly').label).toContain('confirmed');expect(proposalFor(role,'Monthly').amount).toBe(expected[i][1]);expect(proposalFor(role,'Monthly').detail).toContain(`${expected[i][2]} hours total`);});
 expect(proposalFor(crewOpportunities[6],'One day')).toBeNull();expect(proposalFor(crewOpportunities[6],'Monthly').amount).toBe(4000);
});
it('keeps leadership separate from paid crew and does not invent missing approved snapshot rates',()=>{expect(crewLeads).toHaveLength(5);expect(crewLeads.filter(x=>x.name===null)).toHaveLength(3);expect(crewLeads.every(x=>!x.proposal)).toBe(true);expect(crewOpportunities.every(x=>x.team!=='Coaching')).toBe(true);expect(proposalFor({id:'approved-existing-role'},'Monthly')).toBeNull();});
