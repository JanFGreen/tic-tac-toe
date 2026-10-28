// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

type User = ReturnType<typeof userEvent.setup>;

const thinkingMs = 600;
const firstLegalCell = () => 0;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function setup(options: { fakeTimers?: boolean } = {}) {
  if (options.fakeTimers === true) {
    vi.useFakeTimers();
    // Testing Library only drains its own timers under fake timers when it finds a `jest` global.
    vi.stubGlobal('jest', { advanceTimersByTime: vi.advanceTimersByTime });
  }
  const user = userEvent.setup(options.fakeTimers === true ? { advanceTimers: vi.advanceTimersByTime, delay: null } : {});
  render(<App random={firstLegalCell} thinkingMs={thinkingMs} />);
  return user;
}

const cells = () => within(screen.getByRole('group', { name: 'Board' })).getAllByRole('button');
const cellLabels = () => cells().map((cell) => cell.getAttribute('aria-label'));
const cell = (index: number) => {
  const element = cells()[index];
  if (element === undefined) throw new Error(`No cell ${String(index)}`);
  return element;
};
const button = (name: string) => screen.getByRole('button', { name });
const radio = (name: string) => screen.getByRole<HTMLInputElement>('radio', { name });
const score = () => screen.getAllByRole('definition').map((value) => value.textContent);
const headline = (text: string) => screen.getByText(text, { selector: '.round-status__headline' });

async function play(user: User, order: readonly number[]) {
  for (const index of order) await user.click(cell(index));
}

const xWinsTopRow = [0, 3, 1, 4, 2];
const drawStartingWithO = [0, 1, 2, 4, 3, 5, 7, 6, 8];

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

describe('App', () => {
  it('shows the product name as the page heading', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Tic-tac-toe' })).toBeTruthy();
  });

  it('plays a round to a win and starts a new round with the keyboard only', async () => {
    const user = setup();
    await user.tab();
    expect(document.activeElement).toBe(button('Start round'));
    await user.keyboard('{Enter}');
    await user.tab();
    expect(document.activeElement).toBe(cell(0));
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(cell(3));
    await user.keyboard(' ');
    await user.keyboard('{ArrowUp}{ArrowRight}');
    expect(document.activeElement).toBe(cell(1));
    await user.keyboard('{Enter}{ArrowDown}');
    expect(document.activeElement).toBe(cell(4));
    await user.keyboard('{Enter}{ArrowUp}{ArrowRight}');
    expect(document.activeElement).toBe(cell(2));
    await user.keyboard('{Enter}');
    expect(headline('X wins')).toBeTruthy();
    expect(cell(2).getAttribute('data-winning')).toBe('true');
    await user.tab();
    expect(document.activeElement).toBe(button('New round'));
    await user.keyboard('{Enter}');
    expect(cellLabels().every((label) => label?.endsWith('empty'))).toBe(true);
    expect(headline('O to move')).toBeTruthy();
  });

  it('plays by pointer and ignores an occupied cell', async () => {
    const user = setup();
    await user.click(button('Start round'));
    await user.click(cell(0));
    await user.click(cell(0));
    expect(cell(0).getAttribute('aria-label')).toBe('Row 1, column 1, X');
    expect(headline('O to move')).toBeTruthy();
  });

  it('accepts no move after the round has ended', async () => {
    const user = setup();
    await user.click(button('Start round'));
    await play(user, xWinsTopRow);
    await user.click(cell(8));
    expect(cell(8).getAttribute('aria-label')).toBe('Row 3, column 3, empty');
    expect(headline('X wins')).toBeTruthy();
    expect(score()).toEqual(['1', '0', '0']);
  });

  it('blocks the board and shows thinking until the computer mark appears', async () => {
    const user = setup({ fakeTimers: true });
    await user.click(radio('Against the computer'));
    await user.click(button('Start round'));
    await user.click(cell(0));
    expect(cells().every((element) => element.getAttribute('aria-disabled') === 'true')).toBe(true);
    expect(headline('Computer (O) is thinking…')).toBeTruthy();
    await user.click(cell(4));
    expect(cell(4).getAttribute('aria-label')).toBe('Row 2, column 2, empty');
    advance(thinkingMs - 1);
    expect(cell(1).getAttribute('aria-label')).toBe('Row 1, column 2, empty');
    advance(1);
    expect(cell(1).getAttribute('aria-label')).toBe('Row 1, column 2, O');
    expect(headline('X to move')).toBeTruthy();
    expect(cell(4).getAttribute('aria-disabled')).toBe('false');
  });

  it('never applies a pending computer move after New round', async () => {
    const user = setup({ fakeTimers: true });
    await user.click(radio('Against the computer'));
    await user.click(button('Start round'));
    await user.click(cell(0));
    await user.click(button('New round'));
    advance(thinkingMs * 3);
    expect(cellLabels().filter((label) => !label?.endsWith('empty'))).toEqual([]);
    expect(headline('O to move')).toBeTruthy();
    await user.click(button('Start round'));
    expect(headline('Computer (O) is thinking…')).toBeTruthy();
    advance(thinkingMs);
    expect(cellLabels().filter((label) => !label?.endsWith('empty'))).toEqual(['Row 1, column 1, O']);
  });

  it('never applies a pending computer move after Reset score', async () => {
    const user = setup({ fakeTimers: true });
    await user.click(radio('Against the computer'));
    await user.click(button('Start round'));
    await user.click(cell(0));
    expect(headline('Computer (O) is thinking…')).toBeTruthy();
    await user.click(button('Reset score'));
    advance(thinkingMs * 3);
    expect(cellLabels().filter((label) => !label?.endsWith('empty'))).toEqual([]);
    expect(headline('X to move')).toBeTruthy();
    expect(score()).toEqual(['0', '0', '0']);
  });

  it('lets the computer move first when the player chooses O', async () => {
    const user = setup({ fakeTimers: true });
    await user.click(radio('Against the computer'));
    await user.click(radio('Play as O'));
    await user.click(button('Start round'));
    expect(headline('Computer (X) is thinking…')).toBeTruthy();
    advance(thinkingMs);
    expect(cell(0).getAttribute('aria-label')).toBe('Row 1, column 1, X');
    expect(headline('O to move')).toBeTruthy();
  });

  it('locks setup during a round, and keeps the score when settings change between rounds', async () => {
    const user = setup();
    expect(radio('Two players').disabled).toBe(false);
    await user.click(button('Start round'));
    expect(radio('Two players').disabled).toBe(true);
    await play(user, xWinsTopRow);
    expect(radio('Two players').disabled).toBe(false);
    await user.click(button('New round'));
    await user.click(radio('Against the computer'));
    await user.click(radio('Hard'));
    expect(score()).toEqual(['1', '0', '0']);
    await user.click(button('Reset score'));
    expect(score()).toEqual(['0', '0', '0']);
  });

  it('alternates the starter over four rounds, including after a draw', async () => {
    const user = setup();
    expect(headline('X to move')).toBeTruthy();
    await user.click(button('Start round'));
    await play(user, xWinsTopRow);
    await user.click(button('New round'));
    expect(headline('O to move')).toBeTruthy();
    await user.click(button('Start round'));
    await play(user, drawStartingWithO);
    expect(headline('Draw')).toBeTruthy();
    expect(score()).toEqual(['1', '0', '1']);
    await user.click(button('New round'));
    expect(headline('X to move')).toBeTruthy();
    await user.click(button('Start round'));
    await user.click(cell(0));
    await user.click(button('New round'));
    expect(headline('O to move')).toBeTruthy();
  });
});
