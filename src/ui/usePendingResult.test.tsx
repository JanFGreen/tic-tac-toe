// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { emptyBoard } from '@/domain/board';
import { initialSession, type RoundResult, type Session } from '@/domain/session';
import type { ApiResult } from './leaderboard-api';
import type { NicknameStorage } from './nickname-storage';
import { usePendingResult } from './usePendingResult';

const hardWin: RoundResult = { outcome: 'X', mode: 'computer', difficulty: 'hard', playerMark: 'X' };
const twoPlayerWin: RoundResult = { outcome: 'X', mode: 'two-players', difficulty: null, playerMark: null };

function finished(result: RoundResult, roundId = 1): Session {
  const session = initialSession({ mode: result.mode, difficulty: result.difficulty ?? 'medium', playerMark: 'X' });
  const round = { phase: 'over', board: emptyBoard, lastMove: null, outcome: { kind: 'draw' }, result } as const;
  return { ...session, roundId, round };
}

function memoryStorage(): NicknameStorage & { items: Map<string, string> } {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

function setup(initial: Session, answers: ApiResult<null>[] = [{ kind: 'ok', value: null }]) {
  const saveResult = vi.fn<() => Promise<ApiResult<null>>>();
  for (const answer of answers) saveResult.mockResolvedValueOnce(answer);
  const confirm = vi.fn(() => true);
  const storage = memoryStorage();
  const hook = renderHook(({ session }) => usePendingResult(session, { api: { saveResult }, storage, confirm }), {
    initialProps: { session: initial },
  });
  return { ...hook, saveResult, confirm, storage };
}

describe('usePendingResult', () => {
  it('two-player round yields no result', () => {
    const { result } = setup(finished(twoPlayerWin));
    expect(result.current.result).toBeNull();
    expect(result.current.isPending).toBe(false);
  });

  it('has no result before the round is over', () => {
    const { result } = setup(initialSession({ mode: 'computer', difficulty: 'easy', playerMark: 'X' }));
    expect(result.current.result).toBeNull();
  });

  it('failed save keeps result pending and can be saved again', async () => {
    const { result, saveResult } = setup(finished(hardWin), [{ kind: 'unreachable' }, { kind: 'ok', value: null }]);
    act(() => {
      result.current.save('Ann');
    });
    expect(result.current.status).toBe('saving');
    await waitFor(() => {
      expect(result.current.status).toBe('unreachable');
    });
    expect(result.current.isPending).toBe(true);
    act(() => {
      result.current.save('Ann');
    });
    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });
    expect(result.current.isPending).toBe(false);
    expect(saveResult).toHaveBeenCalledTimes(2);
  });

  it.each([['rejected' as const], ['rate-limited' as const]])('%s keeps the result pending', async (kind) => {
    const { result } = setup(finished(hardWin), [{ kind }]);
    act(() => {
      result.current.save('Ann');
    });
    await waitFor(() => {
      expect(result.current.status).toBe(kind);
    });
    expect(result.current.isPending).toBe(true);
  });

  it('saves once: second save after success is ignored', async () => {
    const { result, saveResult } = setup(finished(hardWin));
    act(() => {
      result.current.save('Ann');
      result.current.save('Ann');
    });
    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });
    act(() => {
      result.current.save('Bob');
    });
    expect(saveResult).toHaveBeenCalledTimes(1);
    expect(saveResult).toHaveBeenCalledWith({ nickname: 'Ann', difficulty: 'hard', outcome: 'win' });
  });

  it('uses round difficulty even after settings change', async () => {
    const session = finished(hardWin);
    const changed = { ...session, settings: { ...session.settings, difficulty: 'easy' as const } };
    const { result, saveResult } = setup(changed);
    expect(result.current.result).toEqual({ roundId: 1, difficulty: 'hard', outcome: 'win' });
    act(() => {
      result.current.save('Ann');
    });
    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });
    expect(saveResult).toHaveBeenCalledWith({ nickname: 'Ann', difficulty: 'hard', outcome: 'win' });
  });

  it('successful save remembers the nickname', async () => {
    const { result, storage } = setup(finished(hardWin));
    expect(result.current.nickname).toBe('');
    act(() => {
      result.current.save('Ann');
    });
    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });
    expect([...storage.items.values()]).toEqual(['Ann']);
    expect(result.current.nickname).toBe('Ann');
  });

  it('does not remember the nickname after a failed save', async () => {
    const { result, storage } = setup(finished(hardWin), [{ kind: 'unreachable' }]);
    act(() => {
      result.current.save('Ann');
    });
    await waitFor(() => {
      expect(result.current.status).toBe('unreachable');
    });
    expect(storage.items.size).toBe(0);
  });

  it('ignores the response of an older round', async () => {
    let answer: (value: ApiResult<null>) => void = () => undefined;
    const saveResult = vi.fn(() => new Promise<ApiResult<null>>((resolve) => (answer = resolve)));
    const storage = memoryStorage();
    const { result, rerender } = renderHook(
      ({ session }) => usePendingResult(session, { api: { saveResult }, storage, confirm: () => true }),
      { initialProps: { session: finished(hardWin, 1) } },
    );
    act(() => {
      result.current.save('Ann');
    });
    rerender({ session: finished(hardWin, 2) });
    await act(async () => {
      answer({ kind: 'ok', value: null });
      await Promise.resolve();
    });
    expect(result.current.status).toBe('idle');
    expect(result.current.isPending).toBe(true);
    expect(storage.items.size).toBe(0);
  });

  it('guardDiscard asks only while pending and runs action only on confirm', async () => {
    const { result, confirm } = setup(finished(hardWin));
    const action = vi.fn();

    confirm.mockReturnValueOnce(false);
    act(() => {
      result.current.guardDiscard(action);
    });
    expect(confirm).toHaveBeenCalledWith('Discard the unsaved result?');
    expect(action).not.toHaveBeenCalled();

    act(() => {
      result.current.guardDiscard(action);
    });
    expect(action).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.save('Ann');
    });
    await waitFor(() => {
      expect(result.current.status).toBe('saved');
    });
    confirm.mockClear();
    act(() => {
      result.current.guardDiscard(action);
    });
    expect(confirm).not.toHaveBeenCalled();
    expect(action).toHaveBeenCalledTimes(2);
  });

  it('guardDiscard does not ask without a result', () => {
    const { result, confirm } = setup(finished(twoPlayerWin));
    const action = vi.fn();
    act(() => {
      result.current.guardDiscard(action);
    });
    expect(confirm).not.toHaveBeenCalled();
    expect(action).toHaveBeenCalledTimes(1);
  });
});
