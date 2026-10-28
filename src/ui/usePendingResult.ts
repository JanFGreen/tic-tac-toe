import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Difficulty } from '@/domain/difficulty';
import { type PlayerOutcome, playerOutcome } from '@/domain/leaderboard';
import type { Session } from '@/domain/session';
import type { LeaderboardApi } from './leaderboard-api';
import { type NicknameStorage, readNickname, rememberNickname } from './nickname-storage';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'unreachable' | 'rejected' | 'rate-limited';

export type SaveableResult = { roundId: number; difficulty: Difficulty; outcome: PlayerOutcome };

type PendingResultOptions = {
  api: Pick<LeaderboardApi, 'saveResult'>;
  storage: NicknameStorage | null;
  confirm: (message: string) => boolean;
};

type RoundStatus = { roundId: number; status: SaveStatus };

const discardMessage = 'Discard the unsaved result?';

/** The result of the finished round, taken from the round itself so later setting changes cannot alter it. */
function saveableResult(session: Session): SaveableResult | null {
  const { round, roundId } = session;
  if (round.phase !== 'over') return null;
  const outcome = playerOutcome(round.result);
  const { difficulty } = round.result;
  return outcome === null || difficulty === null ? null : { roundId, difficulty, outcome };
}

/**
 * Keeps a finished result against the computer pending until it is saved, at most once per round.
 * Lives in the caller of the screens, so opening another screen neither loses nor repeats the save.
 */
export function usePendingResult(session: Session, { api, storage, confirm }: PendingResultOptions) {
  const result = useMemo(() => saveableResult(session), [session]);
  const [roundStatus, setRoundStatus] = useState<RoundStatus>({ roundId: session.roundId, status: 'idle' });
  const [nickname, setNickname] = useState(() => readNickname(storage));
  const currentRoundId = useRef(session.roundId);
  const claimedRoundId = useRef<number | null>(null);

  useEffect(() => {
    currentRoundId.current = session.roundId;
  }, [session.roundId]);

  const status = result !== null && roundStatus.roundId === result.roundId ? roundStatus.status : 'idle';
  const isPending = result !== null && status !== 'saved';

  const save = useCallback(
    (nicknameToSave: string) => {
      if (result === null || claimedRoundId.current === result.roundId) return;
      const { roundId, difficulty, outcome } = result;
      claimedRoundId.current = roundId;
      setRoundStatus({ roundId, status: 'saving' });
      void api.saveResult({ nickname: nicknameToSave, difficulty, outcome }).then((answer) => {
        if (roundId !== currentRoundId.current) return;
        if (answer.kind === 'ok') {
          rememberNickname(storage, nicknameToSave);
          setNickname(nicknameToSave);
          setRoundStatus({ roundId, status: 'saved' });
          return;
        }
        claimedRoundId.current = null;
        setRoundStatus({ roundId, status: answer.kind });
      });
    },
    [api, result, storage],
  );

  const guardDiscard = useCallback(
    (action: () => void) => {
      if (isPending && !confirm(discardMessage)) return;
      action();
    },
    [confirm, isPending],
  );

  return { result, status, isPending, nickname, save, guardDiscard };
}
