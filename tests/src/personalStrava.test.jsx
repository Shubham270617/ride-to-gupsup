import {it,expect} from 'vitest';
import {render,screen,fireEvent} from '@testing-library/react';
import PersonalDashboard from '../../src/strava-personal/PersonalDashboard';
import {personalActivities,totals} from '../../src/strava-personal/model';
const now=Date.parse('2026-10-22T12:00:00Z');
const own={id:'one',athleteId:'self',name:'Synthetic ride',sport:'Ride',startedAt:'2026-10-21T06:00:00Z',distance:10000,movingSeconds:1800,elevation:100};
it('excludes other athletes, future records and private extra fields',()=>{
 const rows=personalActivities([own,{...own,id:'other',athleteId:'other'},{...own,id:'future',startedAt:'2027-01-01'}, {...own,id:'old',startedAt:'2026-01-01'}],'self',30,'all',now);
 expect(rows).toHaveLength(1);expect(rows[0]).not.toHaveProperty('athleteId');expect(personalActivities([own],null,30,'all',now)).toEqual([]);
});
it('preserves missing values instead of inventing zero totals',()=>{expect(totals(personalActivities([{...own,distance:null,elevation:-3}],'self',30,'all',now))).toMatchObject({distance:null,elevation:null,movingSeconds:1800});});
it('does not imply an active integration or show invented results by default',()=>{render(<PersonalDashboard now={now}/>);expect(screen.getByRole('status')).toHaveTextContent('not activated');expect(screen.queryByText('Synthetic ride')).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:/connect/i})).not.toBeInTheDocument();});
it('filters synthetic own-activity preview by sport and period',()=>{render(<PersonalDashboard snapshot={{athleteId:'self',activities:[own,{...own,id:'run',name:'Synthetic run',sport:'Run',startedAt:'2026-10-10'}]}} preview now={now}/>);expect(screen.getByRole('status')).toHaveTextContent('fictional');fireEvent.change(screen.getByLabelText('Sport'),{target:{value:'Run'}});expect(screen.queryByText('Synthetic ride')).not.toBeInTheDocument();expect(screen.getByText('Synthetic run')).toBeInTheDocument();fireEvent.change(screen.getByLabelText('Period'),{target:{value:'7'}});expect(screen.getByText(/No activities match/)).toBeInTheDocument();});
