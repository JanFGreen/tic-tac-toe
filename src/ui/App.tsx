import { type ReactElement, useReducer } from 'react';
import type { Random } from '@/domain/computer';
import { defaultSettings, initialSession, sessionReducer, settingsLocked } from '@/domain/session';
import { Board } from './Board';
import { Button } from './components/Button';
import { RoundStatus } from './RoundStatus';
import { Scoreboard } from './Scoreboard';
import { SetupPanel } from './SetupPanel';
import { useComputerTurn } from './useComputerTurn';
import './App.css';

type AppProps = { random?: Random; thinkingMs?: number };

const defaultThinkingMs = 600;

export function App({ random = Math.random, thinkingMs = defaultThinkingMs }: AppProps): ReactElement {
  const [session, dispatch] = useReducer(sessionReducer, defaultSettings, initialSession);
  useComputerTurn(session, dispatch, { random, thinkingMs });
  const { round } = session;
  const ready = round.phase === 'ready';

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
      <div className="app__actions">
        {ready ? null : (
          <Button
            onClick={() => {
              dispatch({ type: 'newRound' });
            }}
          >
            New round
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => {
            dispatch({ type: 'resetScore' });
          }}
        >
          Reset score
        </Button>
      </div>
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
