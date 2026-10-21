import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import VolunteerTimerPanel from '../../../src/volunteer-timer/VolunteerTimerPanel';
import SyntheticTimerPreview from '../../../src/volunteer-timer/SyntheticTimerPreview';
const riders = [{id:'synthetic-rider',name:'Synthetic rider'}];
it('keeps all mutations inactive and exposes reference step navigation', () => {
  render(<VolunteerTimerPanel riders={riders}/>);
  expect(screen.getByRole('status')).toHaveTextContent('saving are not enabled');
  expect(screen.getByRole('button',{name:'Save attendance'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'2 · Timer'}));
  expect(screen.getByRole('button',{name:'Start all · Lap 1'})).toBeDisabled();
  expect(screen.getByRole('button',{name:'■ FINISH SESSION'})).toBeDisabled();
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
    expect(screen.getByRole('button',{name:'■ FINISH SESSION'})).toBeDisabled();
  } finally {vi.useRealTimers();}
});
it('preserves missing historical timestamps and locks official history', () => {
  const sessions=[{id:'s',date:'2026-01-01',mode:'live',entries:[{riderId:riders[0].id,officialScore:{total:4},laps:[{durationMs:60000}]}]}];
  const before=JSON.stringify(sessions);
  render(<VolunteerTimerPanel sessions={sessions} riders={riders}/>);
  fireEvent.click(screen.getByRole('button',{name:'2 · Timer'}));
  expect(screen.getByText('Locked timing record')).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/START ·/})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'4 · Data'}));
  expect(screen.getAllByRole('cell',{name:'—'}).length).toBeGreaterThanOrEqual(3);
  expect(screen.getByRole('cell',{name:'1:00.000'})).toBeInTheDocument();
  expect(JSON.stringify(sessions)).toBe(before);
});
