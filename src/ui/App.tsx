import { type ReactElement, useMemo, useReducer, useState } from 'react';
import type { Random } from '@/domain/computer';
import { defaultSettings, initialSession, sessionReducer } from '@/domain/session';
import { GameScreen } from './GameScreen';
import { createLeaderboardApi, type LeaderboardApi } from './leaderboard-api';
import { LeaderboardScreen } from './LeaderboardScreen';
import { browserStorage, type NicknameStorage } from './nickname-storage';
import { useComputerTurn } from './useComputerTurn';
import { usePendingResult } from './usePendingResult';
import './App.css';

type AppProps = {
  random?: Random;
  thinkingMs?: number;
  api?: LeaderboardApi;
  /** `null` means no device storage; leaving it out uses the browser's. */
  storage?: NicknameStorage | null;
  confirm?: (message: string) => boolean;
};

type Screen = 'game' | 'leaderboard';

const defaultThinkingMs = 600;

const browserConfirm = (message: string) => window.confirm(message);

export function App({
  random = Math.random,
  thinkingMs = defaultThinkingMs,
  api,
  storage,
  confirm = browserConfirm,
}: AppProps): ReactElement {
  const [session, dispatch] = useReducer(sessionReducer, defaultSettings, initialSession);
  const [screen, setScreen] = useState<Screen>('game');
  const leaderboardApi = useMemo(() => api ?? createLeaderboardApi(fetch), [api]);
  const deviceStorage = useMemo(() => (storage === undefined ? browserStorage() : storage), [storage]);
  useComputerTurn(session, dispatch, { random, thinkingMs });
  const pending = usePendingResult(session, { api: leaderboardApi, storage: deviceStorage, confirm });

  if (screen === 'leaderboard') {
    return (
      <LeaderboardScreen
        api={leaderboardApi}
        initialDifficulty={session.settings.difficulty}
        onBack={() => {
          setScreen('game');
        }}
      />
    );
  }
  return (
    <GameScreen
      session={session}
      dispatch={dispatch}
      pending={pending}
      onOpenLeaderboard={() => {
        setScreen('leaderboard');
      }}
    />
  );
}
