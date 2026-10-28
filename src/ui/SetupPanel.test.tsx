// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from '@/domain/session';
import { SetupPanel } from './SetupPanel';

afterEach(cleanup);

const twoPlayers: Settings = { mode: 'two-players', difficulty: 'medium', playerMark: 'X' };
const vsComputer: Settings = { mode: 'computer', difficulty: 'medium', playerMark: 'X' };

const radio = (name: string) => screen.getByRole<HTMLInputElement>('radio', { name });
const radioNames = () => screen.getAllByRole('radio').map((input) => input.getAttribute('value'));

function setup(settings: Settings, locked = false) {
  const onChange = vi.fn();
  render(<SetupPanel settings={settings} locked={locked} onChange={onChange} />);
  return { onChange, user: userEvent.setup() };
}

describe('SetupPanel', () => {
  it('offers only the mode in two-player mode', () => {
    setup(twoPlayers);
    expect(screen.getByRole('group', { name: 'Mode' })).toBeTruthy();
    expect(radio('Two players').checked).toBe(true);
    expect(radio('Against the computer').checked).toBe(false);
    expect(screen.queryByRole('group', { name: 'Difficulty' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Your mark' })).toBeNull();
    expect(radioNames()).toEqual(['two-players', 'computer']);
  });

  it('offers difficulty and mark in computer mode', () => {
    setup(vsComputer);
    expect(screen.getByRole('group', { name: 'Difficulty' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Your mark' })).toBeTruthy();
    expect(['Easy', 'Medium', 'Hard', 'Play as X', 'Play as O'].map((name) => radio(name).checked)).toEqual([
      false, true, false, true, false,
    ]);
  });

  it('disables every choice when locked', async () => {
    const { onChange, user } = setup(vsComputer, true);
    const inputs = screen.getAllByRole<HTMLInputElement>('radio');
    expect(inputs).toHaveLength(7);
    for (const input of inputs) expect(input.disabled).toBe(true);
    await user.click(radio('Hard'));
    await user.click(radio('Two players'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('enables every choice when not locked', () => {
    setup(vsComputer);
    for (const input of screen.getAllByRole<HTMLInputElement>('radio')) expect(input.disabled).toBe(false);
  });

  it('calls onChange with the partial settings of the picked option', async () => {
    const { onChange, user } = setup(vsComputer);
    await user.click(radio('Hard'));
    expect(onChange).toHaveBeenLastCalledWith({ difficulty: 'hard' });
    await user.click(radio('Play as O'));
    expect(onChange).toHaveBeenLastCalledWith({ playerMark: 'O' });
    await user.click(radio('Two players'));
    expect(onChange).toHaveBeenLastCalledWith({ mode: 'two-players' });
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('switches to computer mode by click', async () => {
    const { onChange, user } = setup(twoPlayers);
    await user.click(radio('Against the computer'));
    expect(onChange).toHaveBeenCalledExactlyOnceWith({ mode: 'computer' });
  });
});
