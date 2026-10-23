import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import VolunteerTimerPanel from '../../../src/volunteer-timer/VolunteerTimerPanel';
import SyntheticTimerPreview from '../../../src/volunteer-timer/SyntheticTimerPreview';
const riders = [{id:'synthetic-rider',name:'Synthetic rider'}];
it('keeps all mutations inactive and exposes reference step navigation', () => {
  render(<VolunteerTimerPanel riders={riders}/>);
  expect(screen.getByRole('status')).toHaveTextContent('saving is switched off');
  expect(screen.getByRole('button',{name:'Save attendance'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'2 · Timer'}));
  expect(screen.getByRole('button',{name:'Start all · Lap 1'})).toBeDisabled();
  expect(screen.queryByRole('button',{name:'Finish session'})).toBeNull(); // owner-only, hidden for others
});
it('runs attendance, group start, pass, finish and late arrival through the native engine with synthetic records', async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-21T06:00:00+05:30'));
  try {
    render(<SyntheticTimerPreview/>);
    fireEvent.click(screen.getByRole('checkbox',{name:'Example rider A'}));
    await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Save attendance'})));
    fireEvent.click(screen.getByRole('button',{name:'2 · Timer'}));
    await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Start all · Lap 1'})));
    expect(screen.getByRole('button',{name:'Start all · Lap 1'})).toBeDisabled();
    await act(async()=>vi.advanceTimersByTime(1000));
    await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Pass → L2'})));
    await act(async()=>vi.advanceTimersByTime(1000));
    await act(async()=>fireEvent.click(screen.getByRole('button',{name:'FINISH · L2'})));
    expect(screen.getByText('Ready L3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'1 · Riders'}));
    expect(screen.getByRole('checkbox',{name:'Example rider A'})).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox',{name:'Example rider B'}));
    await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Save attendance'})));
    fireEvent.click(screen.getByRole('button',{name:'2 · Timer'}));
    await act(async()=>fireEvent.click(screen.getByRole('button',{name:'START · L1'})));
    expect(screen.getByText('Running L1')).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Finish session'})).toBeNull(); // owner-only, hidden for others
  } finally {vi.useRealTimers();}
});
it('preserves missing historical timestamps and locks official history', () => {
  const sessions=[{id:'s',date:'2026-01-01',mode:'live',entries:[{riderId:riders[0].id,officialScore:{total:4},laps:[{durationMs:60000}]}]}];
  const before=JSON.stringify(sessions);
  render(<VolunteerTimerPanel sessions={sessions} riders={riders}/>);
  fireEvent.click(screen.getByRole('button',{name:'2 · Timer'}));
  expect(screen.getByText('Locked timing record')).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/START ·/})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'4 · Lap times'}));
  expect(screen.getAllByRole('cell',{name:'—'}).length).toBeGreaterThanOrEqual(3);
  expect(screen.getByRole('cell',{name:'1:00.000'})).toBeInTheDocument();
  expect(JSON.stringify(sessions)).toBe(before);
});
it('keeps unassigned shell navigable with disabled writes and an actionable empty state',()=>{
 const refresh=vi.fn();render(<VolunteerTimerPanel connected message="No active timing sessions are assigned to this account." onRefresh={refresh}/>);
 expect(screen.getByRole('heading',{name:'Ridge Repeats Timer'})).toBeInTheDocument();
 expect(screen.queryByRole('button',{name:'Create session'})).toBeNull(); // owner-only, hidden for volunteers
 expect(screen.queryByRole('button',{name:'Add rider'})).toBeNull();
 expect(screen.getByRole('button',{name:'Save attendance'})).toBeDisabled();
 expect(screen.queryByRole('link',{name:'Access codes'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Refresh sessions'}));expect(refresh).toHaveBeenCalledOnce();
 for(const name of ['2 · Timer','3 · Photos','4 · Lap times','1 · Riders'])fireEvent.click(screen.getByRole('button',{name}));
 expect(screen.getByText(/Ask the owner/)).toBeInTheDocument();
});
it('shows secondary owner navigation only when explicitly verified',()=>{
 render(<VolunteerTimerPanel canManage/>);
 expect(screen.getByRole('link',{name:'Admin session controls',hidden:true})).toHaveAttribute('href','/admin/ridge');
 expect(screen.getByRole('link',{name:'Access codes',hidden:true})).toHaveAttribute('href','/admin/ridge-codes');
});
it('demo supports local session and rider creation without any fetch',async()=>{
 const {default:Demo}=await import('../../../src/volunteer-timer/VolunteerTimerDemo');
 const network=vi.spyOn(globalThis,'fetch');render(<Demo/>);
 fireEvent.change(screen.getByRole('textbox',{name:'New rider name'}),{target:{value:'Example rider C'}});
 fireEvent.click(screen.getByRole('button',{name:'Add rider'}));expect(screen.getByRole('checkbox',{name:'Example rider C'})).toBeInTheDocument();
 fireEvent.change(screen.getByLabelText('New session date'),{target:{value:'2026-11-05'}});
 fireEvent.click(screen.getByRole('button',{name:'Create session'}));expect(screen.getByRole('combobox',{name:'Session'})).toHaveDisplayValue('5 Nov 2026 · Session 1 · Testing');
 fireEvent.click(screen.getByRole('checkbox',{name:'Example rider C'}));fireEvent.click(screen.getByRole('button',{name:'Save attendance'}));
 vi.spyOn(Date,'now').mockReturnValue(Date.parse('2026-11-05T06:00:00+05:30'));
 fireEvent.click(screen.getByRole('button',{name:'2 · Timer'}));fireEvent.click(screen.getByRole('button',{name:'Start all · Lap 1'}));expect(screen.getByText('Running L1')).toBeInTheDocument();
 expect(network).not.toHaveBeenCalled();network.mockRestore();Date.now.mockRestore();
});
