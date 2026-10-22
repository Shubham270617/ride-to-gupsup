import { it,expect,vi } from 'vitest';
import { fireEvent,render,screen } from '@testing-library/react';
import RidgeSessionStory from '../../../src/components/lab/RidgeSessionStory';
it('opens a native story preview with paginated results and all six award cards',()=>{
 const draw=vi.fn(),ctx={fillRect:vi.fn(),fillText:draw};
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(ctx);
 const feed={sessions:[{slug:'s',date:'2026-10-17',riders:Array.from({length:10},(_,i)=>({name:'Rider '+i,ridgePoints:10-i,laps:4,progress:6-i}))}],awards:Array.from({length:6},(_,i)=>({slug:'award'+i,name:'Award '+i,description:''})),winners:[]};
 render(<RidgeSessionStory feed={feed} sessionSlug="s" onClose={()=>{}}/>);
 expect(screen.getByRole('dialog')).toHaveAccessibleName('Session story');
 expect(draw.mock.calls.some(c=>c[0]==='Rider 0')).toBe(true);
 fireEvent.change(screen.getByLabelText('Page'),{target:{value:'1'}});
 expect(draw.mock.calls.some(c=>c[0]==='Rider 9')).toBe(true);
 fireEvent.change(screen.getByLabelText('Card'),{target:{value:'spotlight'}});
 expect(draw.mock.calls.filter(c=>/^AWARD /.test(c[0])).length).toBe(6);
});
