// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Scoreboard } from './Scoreboard';

afterEach(cleanup);

const countFor = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

describe('Scoreboard', () => {
  it('shows X wins, O wins and draws with their labels', () => {
    render(<Scoreboard score={{ xWins: 3, oWins: 1, draws: 2 }} />);
    expect(screen.getByRole('heading', { name: 'Score' })).toBeTruthy();
    expect(countFor('X wins')).toBe('3');
    expect(countFor('O wins')).toBe('1');
    expect(countFor('Draws')).toBe('2');
  });

  it('follows new counts from props', () => {
    const { rerender } = render(<Scoreboard score={{ xWins: 3, oWins: 1, draws: 2 }} />);
    rerender(<Scoreboard score={{ xWins: 0, oWins: 0, draws: 0 }} />);
    expect([countFor('X wins'), countFor('O wins'), countFor('Draws')]).toEqual(['0', '0', '0']);
  });
});
