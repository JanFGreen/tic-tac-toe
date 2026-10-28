import type { Score } from '@/domain/session';
import { Panel } from './components/Panel';
import './panels.css';

const counts: readonly { key: keyof Score; label: string }[] = [
  { key: 'xWins', label: 'X wins' },
  { key: 'oWins', label: 'O wins' },
  { key: 'draws', label: 'Draws' },
];

export function Scoreboard({ score }: { score: Score }) {
  return (
    <Panel title="Score">
      <dl className="scoreboard">
        {counts.map(({ key, label }) => (
          <div key={key} className="scoreboard__count">
            <dt className="scoreboard__label">{label}</dt>
            <dd className="scoreboard__value">{score[key]}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}
