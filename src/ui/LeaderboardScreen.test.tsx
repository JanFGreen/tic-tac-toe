// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Difficulty } from '@/domain/difficulty';
import type { LeaderboardEntry } from '@/domain/leaderboard';
import type { ApiResult } from './leaderboard-api';
import { LeaderboardScreen } from './LeaderboardScreen';

afterEach(cleanup);

type Answer = ApiResult<LeaderboardEntry[]>;

const ok = (value: LeaderboardEntry[]): Answer => ({ kind: 'ok', value });
const entry = (nickname: string, wins: number, draws: number, losses: number) => ({ nickname, wins, draws, losses });

const boards: Record<Difficulty, LeaderboardEntry[]> = {
  easy: [entry('Ann', 3, 0, 1), entry('bob', 3, 2, 4)],
  medium: [entry('Cy', 2, 1, 0)],
  hard: [entry('Dee', 7, 0, 2)],
};

/** An API whose answers resolve only when the test says so, in any order. */
function deferredApi() {
  const pending: { difficulty: Difficulty; resolve: (answer: Answer) => void }[] = [];
  const leaderboard = vi.fn(
    (difficulty: Difficulty) =>
      new Promise<Answer>((resolve) => {
        pending.push({ difficulty, resolve });
      }),
  );
  return { api: { leaderboard }, pending };
}

function setup(leaderboard: (difficulty: Difficulty) => Promise<Answer>, initialDifficulty: Difficulty = 'easy') {
  const onBack = vi.fn();
  const api = { leaderboard: vi.fn(leaderboard) };
  render(<LeaderboardScreen api={api} initialDifficulty={initialDifficulty} onBack={onBack} />);
  return { api, onBack, user: userEvent.setup() };
}

const fromBoards = (difficulty: Difficulty) => Promise.resolve(ok(boards[difficulty]));

async function tableRows() {
  const table = await screen.findByRole('table');
  return within(table)
    .getAllByRole('row')
    .map((row) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent));
}

const radio = (name: string) => screen.getByRole<HTMLInputElement>('radio', { name });

async function expectBackWorks(user: ReturnType<typeof userEvent.setup>, onBack: () => void) {
  await user.click(screen.getByRole('button', { name: 'Back to game' }));
  expect(onBack).toHaveBeenCalledTimes(1);
}

describe('LeaderboardScreen', () => {
  it('shows Easy/Medium/Hard views with rank, nickname, wins, draws, losses', async () => {
    const { api, onBack, user } = setup(fromBoards);
    expect(screen.getByRole('heading', { name: 'Leaderboard' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Difficulty' })).toBeTruthy();
    expect(['Easy', 'Medium', 'Hard'].map((name) => radio(name).checked)).toEqual([true, false, false]);
    expect(await tableRows()).toEqual([
      ['Rank', 'Nickname', 'Wins', 'Draws', 'Losses'],
      ['1', 'Ann', '3', '0', '1'],
      ['2', 'bob', '3', '2', '4'],
    ]);
    expect(screen.getByRole('table').closest('section.panel')).not.toBeNull();
    await user.click(radio('Medium'));
    expect((await screen.findByRole('cell', { name: 'Cy' })).textContent).toBe('Cy');
    expect(api.leaderboard.mock.calls).toEqual([['easy'], ['medium']]);
    await expectBackWorks(user, onBack);
  });

  it('starts at the initial difficulty', async () => {
    const { api } = setup(fromBoards, 'medium');
    expect(radio('Medium').checked).toBe(true);
    expect(await screen.findByRole('cell', { name: 'Cy' })).toBeTruthy();
    expect(api.leaderboard.mock.calls).toEqual([['medium']]);
  });

  it('keeps the server order and ranks rows by position', async () => {
    setup(() => Promise.resolve(ok([entry('Zed', 1, 0, 9), entry('Amy', 5, 0, 0), entry('Bob', 0, 4, 1)])));
    expect(await tableRows()).toEqual([
      ['Rank', 'Nickname', 'Wins', 'Draws', 'Losses'],
      ['1', 'Zed', '1', '0', '9'],
      ['2', 'Amy', '5', '0', '0'],
      ['3', 'Bob', '0', '4', '1'],
    ]);
  });

  it('switching to Hard requests and shows Hard', async () => {
    const { api, user } = setup(fromBoards);
    await screen.findByRole('cell', { name: 'Ann' });
    await user.click(radio('Hard'));
    expect(radio('Hard').checked).toBe(true);
    expect(await tableRows()).toEqual([
      ['Rank', 'Nickname', 'Wins', 'Draws', 'Losses'],
      ['1', 'Dee', '7', '0', '2'],
    ]);
    expect(api.leaderboard).toHaveBeenLastCalledWith('hard');
  });

  it('empty list shows No results saved yet.', async () => {
    const { onBack, user } = setup(() => Promise.resolve(ok([])));
    expect(await screen.findByText('No results saved yet.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    await expectBackWorks(user, onBack);
  });

  it('shows Loading… while waiting and Back works', async () => {
    const { api, pending } = deferredApi();
    const onBack = vi.fn();
    render(<LeaderboardScreen api={api} initialDifficulty="easy" onBack={onBack} />);
    expect(screen.getByText('Loading…')).toBeTruthy();
    await expectBackWorks(userEvent.setup(), onBack);
    pending[0]?.resolve(ok(boards.easy));
    expect(await screen.findByRole('cell', { name: 'Ann' })).toBeTruthy();
    expect(screen.queryByText('Loading…')).toBeNull();
  });

  it('unreachable shows message and Retry that succeeds; back still works', async () => {
    const answers: Answer[] = [{ kind: 'unreachable' }, ok(boards.easy)];
    const { api, onBack, user } = setup(() => Promise.resolve(answers.shift() ?? ok([])));
    expect(await screen.findByText('Cannot reach the server.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('cell', { name: 'Ann' })).toBeTruthy();
    expect(screen.queryByText('Cannot reach the server.')).toBeNull();
    expect(api.leaderboard.mock.calls).toEqual([['easy'], ['easy']]);
    await expectBackWorks(user, onBack);
  });

  it.each<Answer['kind']>(['unreachable', 'rejected', 'rate-limited'])(
    'shows the server message with Retry for a %s answer',
    async (kind) => {
      setup(() => Promise.resolve({ kind } as Answer));
      expect(await screen.findByText('Cannot reach the server.')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    },
  );

  it('ignores late response for a previous difficulty', async () => {
    const { api, pending } = deferredApi();
    render(<LeaderboardScreen api={api} initialDifficulty="easy" onBack={vi.fn()} />);
    await userEvent.setup().click(radio('Hard'));
    expect(pending.map((request) => request.difficulty)).toEqual(['easy', 'hard']);
    pending[1]?.resolve(ok(boards.hard));
    expect(await screen.findByRole('cell', { name: 'Dee' })).toBeTruthy();
    pending[0]?.resolve(ok(boards.easy));
    await Promise.resolve();
    expect(await tableRows()).toEqual([
      ['Rank', 'Nickname', 'Wins', 'Draws', 'Losses'],
      ['1', 'Dee', '7', '0', '2'],
    ]);
  });

  it('uses copy without exclamation marks', async () => {
    setup(() => Promise.resolve({ kind: 'unreachable' }));
    await screen.findByText('Cannot reach the server.');
    expect(document.body.textContent).not.toContain('!');
  });
});
