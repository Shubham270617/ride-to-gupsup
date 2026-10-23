import {it,expect,vi,beforeAll} from 'vitest';
import {render,screen,fireEvent,act} from '@testing-library/react';
import Demo from '../../../src/volunteer-timer/VolunteerTimerDemo';
import Photos from '../../../src/volunteer-timer/DemoRiderPhotos';
beforeAll(()=>{HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
it('recovers a synthetic missing lap and corrects duration without changing timestamps or making requests',async()=>{
 const network=vi.spyOn(globalThis,'fetch');render(<Demo/>);
 fireEvent.click(screen.getByRole('checkbox',{name:'Example rider A'}));fireEvent.click(screen.getByRole('button',{name:'Save attendance'}));fireEvent.click(screen.getByRole('button',{name:'4 · Lap times'}));
 fireEvent.click(screen.getByRole('button',{name:'Edit Example rider A L1'}));
 const date=new Date(Date.now()+19800000).toISOString().slice(0,10);
 fireEvent.change(screen.getByLabelText('Start · IST'),{target:{value:date+'T06:00:00.000'}});fireEvent.change(screen.getByLabelText('Finish · IST'),{target:{value:date+'T06:01:00.000'}});fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Synthetic missed finish'}});
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Save and update results'})));expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getAllByRole('cell',{name:'1:00.000'})).toHaveLength(2);
 fireEvent.click(screen.getByRole('button',{name:'Edit Example rider A L1'}));fireEvent.change(screen.getByLabelText('Correction type'),{target:{value:'duration'}});fireEvent.change(screen.getByLabelText('Accepted lap duration'),{target:{value:'0:45.000'}});fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Synthetic correction'}});await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Save and update results'})));expect(screen.getByRole('cell',{name:'1:00.000'})).toBeInTheDocument();expect(screen.getByRole('cell',{name:'0:45.000'})).toBeInTheDocument();expect(screen.getByRole('cell',{name:'Duration corrected'})).toBeInTheDocument();expect(network).not.toHaveBeenCalled();network.mockRestore();
});
it('invalid correction stays open and cancel leaves data untouched',()=>{
 render(<Demo/>);fireEvent.click(screen.getByRole('checkbox',{name:'Example rider A'}));fireEvent.click(screen.getByRole('button',{name:'Save attendance'}));fireEvent.click(screen.getByRole('button',{name:'4 · Lap times'}));fireEvent.click(screen.getByRole('button',{name:'Edit Example rider A L1'}));fireEvent.change(screen.getByLabelText('Correction type'),{target:{value:'duration'}});fireEvent.change(screen.getByLabelText('Accepted lap duration'),{target:{value:'bad'}});fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Synthetic invalid'}});fireEvent.click(screen.getByRole('button',{name:'Save and update results'}));expect(screen.getByRole('dialog')).toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'Cancel'}));expect(screen.getAllByRole('cell',{name:'Not started'})).toHaveLength(1);
});
it('photo picker rejects unsupported files, supports search and passes images only to local callback',()=>{
 const onPhoto=vi.fn();render(<Photos riders={[{id:'a',name:'Example A'},{id:'b',name:'Example B'}]} photos={{}} onPhoto={onPhoto}/>);
 const input=screen.getByLabelText('Choose photo for Example A');fireEvent.change(input,{target:{files:[new File(['bad'],'x.svg',{type:'image/svg+xml'})]}});expect(onPhoto).not.toHaveBeenCalled();expect(screen.getByRole('status')).toHaveTextContent('up to 5 MB');
 const file=new File(['synthetic'],'sample.png',{type:'image/png'});fireEvent.change(input,{target:{files:[file]}});expect(onPhoto).toHaveBeenCalledWith('a',file);fireEvent.change(screen.getByRole('textbox',{name:'Search rider'}),{target:{value:'Example B'}});expect(screen.queryByLabelText('Choose photo for Example A')).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Refresh'}));expect(screen.getByLabelText('Choose photo for Example A')).toBeInTheDocument();
});
