import { useEffect, useState } from 'react';
import { type Difficulty, difficulties } from '@/domain/difficulty';
import type { LeaderboardEntry } from '@/domain/leaderboard';
import { Button } from './components/Button';
import { ChoiceGroup } from './components/ChoiceGroup';
import { Panel } from './components/Panel';
import type { ApiResult, LeaderboardApi } from './leaderboard-api';
import './LeaderboardScreen.css';

const difficultyLabels: Readonly<Record<Difficulty, string>> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const difficultyOptions = difficulties.map((value) => ({ value, label: difficultyLabels[value] }));

type Request = { difficulty: Difficulty; attempt: number };
type Answer = Request & { result: ApiResult<LeaderboardEntry[]> };

/**
 * The answer for the current request, or null while it is loading. Answers for an earlier
 * difficulty or attempt are dropped, so a late response never replaces the selected board.
 */
function useLeaderboard(api: Pick<LeaderboardApi, 'leaderboard'>, request: Request) {
  const { difficulty, attempt } = request;
  const [answer, setAnswer] = useState<Answer | null>(null);
  useEffect(() => {
    let current = true;
    void api.leaderboard(difficulty).then((result) => {
      if (current) setAnswer({ difficulty, attempt, result });
    });
    return () => {
      current = false;
    };
  }, [api, difficulty, attempt]);
  const isCurrent = answer?.difficulty === difficulty && answer.attempt === attempt;
  return isCurrent ? answer.result : null;
}

function EntriesTable({ entries }: { entries: readonly LeaderboardEntry[] }) {
  return (
    <table className="leaderboard__table">
      <thead>
        <tr>
          <th scope="col" className="leaderboard__number">Rank</th>
          <th scope="col" className="leaderboard__nickname">Nickname</th>
          <th scope="col" className="leaderboard__number">Wins</th>
          <th scope="col" className="leaderboard__number">Draws</th>
          <th scope="col" className="leaderboard__number">Losses</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry, index) => (
          <tr key={entry.nickname}>
            <td className="leaderboard__number">{index + 1}</td>
            <td className="leaderboard__nickname">{entry.nickname}</td>
            <td className="leaderboard__number">{entry.wins}</td>
            <td className="leaderboard__number">{entry.draws}</td>
            <td className="leaderboard__number">{entry.losses}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function BoardView({ result, onRetry }: { result: ApiResult<LeaderboardEntry[]> | null; onRetry: () => void }) {
  if (result === null) return <p className="leaderboard__message">Loading…</p>;
  if (result.kind !== 'ok') {
    return (
      <Panel>
        <p className="leaderboard__message leaderboard__message--error">Cannot reach the server.</p>
        <Button onClick={onRetry}>Retry</Button>
      </Panel>
    );
  }
  if (result.value.length === 0) return <p className="leaderboard__message">No results saved yet.</p>;
  return (
    <Panel>
      <EntriesTable entries={result.value} />
    </Panel>
  );
}

type LeaderboardScreenProps = {
  api: Pick<LeaderboardApi, 'leaderboard'>;
  initialDifficulty: Difficulty;
  onBack: () => void;
};

export function LeaderboardScreen({ api, initialDifficulty, onBack }: LeaderboardScreenProps) {
  const [request, setRequest] = useState<Request>({ difficulty: initialDifficulty, attempt: 0 });
  const result = useLeaderboard(api, request);
  return (
    <main className="leaderboard">
      <h1>Leaderboard</h1>
      <ChoiceGroup
        legend="Difficulty"
        name="leaderboard-difficulty"
        options={difficultyOptions}
        value={request.difficulty}
        onChange={(difficulty) => {
          setRequest({ difficulty, attempt: 0 });
        }}
      />
      <BoardView
        result={result}
        onRetry={() => {
          setRequest({ ...request, attempt: request.attempt + 1 });
        }}
      />
      <div className="leaderboard__actions">
        <Button variant="secondary" onClick={onBack}>
          Back to game
        </Button>
      </div>
    </main>
  );
}
