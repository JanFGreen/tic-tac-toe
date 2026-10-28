import type { Dispatch } from 'react';
import { type Session, type SessionAction, settingsLocked } from '@/domain/session';
import { Board } from './Board';
import { Button } from './components/Button';
import { RoundStatus } from './RoundStatus';
import { SaveResultForm } from './SaveResultForm';
import { Scoreboard } from './Scoreboard';
import { SetupPanel } from './SetupPanel';
import type { usePendingResult } from './usePendingResult';

type GameScreenProps = {
  session: Session;
  dispatch: Dispatch<SessionAction>;
  pending: ReturnType<typeof usePendingResult>;
  onOpenLeaderboard: () => void;
};

type RoundActionsProps = {
  ready: boolean;
  dispatch: Dispatch<SessionAction>;
  guardDiscard: (action: () => void) => void;
  onOpenLeaderboard: () => void;
};

/** New round and Reset score replace the session, so both go through the discard guard. */
function RoundActions({ ready, dispatch, guardDiscard, onOpenLeaderboard }: RoundActionsProps) {
  return (
    <div className="app__actions">
      {ready ? null : (
        <Button
          onClick={() => {
            guardDiscard(() => {
              dispatch({ type: 'newRound' });
            });
          }}
        >
          New round
        </Button>
      )}
      <Button
        variant="secondary"
        onClick={() => {
          guardDiscard(() => {
            dispatch({ type: 'resetScore' });
          });
        }}
      >
        Reset score
      </Button>
      <Button variant="secondary" onClick={onOpenLeaderboard}>
        Leaderboard
      </Button>
    </div>
  );
}

export function GameScreen({ session, dispatch, pending, onOpenLeaderboard }: GameScreenProps) {
  const { round } = session;
  const ready = round.phase === 'ready';
  const { result, status, nickname, save, guardDiscard } = pending;

  return (
    <main className="app">
      <h1>Tic-tac-toe</h1>
      <RoundStatus session={session} />
      {ready ? (
        <Button
          onClick={() => {
            dispatch({ type: 'start' });
          }}
        >
          Start round
        </Button>
      ) : null}
      <Board
        board={round.board}
        winningLine={round.phase === 'over' && round.outcome.kind === 'win' ? round.outcome.line : null}
        locked={round.phase !== 'playing'}
        onPlace={(cell) => {
          dispatch({ type: 'place', cell });
        }}
      />
      <Scoreboard score={session.score} />
      {result === null ? null : (
        <SaveResultForm
          key={result.roundId}
          outcome={result.outcome}
          status={status}
          initialNickname={nickname}
          onSave={save}
        />
      )}
      <RoundActions
        ready={ready}
        dispatch={dispatch}
        guardDiscard={guardDiscard}
        onOpenLeaderboard={onOpenLeaderboard}
      />
      <SetupPanel
        settings={session.settings}
        locked={settingsLocked(session)}
        onChange={(settings) => {
          dispatch({ type: 'changeSettings', settings });
        }}
      />
    </main>
  );
}
