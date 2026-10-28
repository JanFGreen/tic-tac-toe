import type { Round, Session } from '@/domain/session';
import { cellName } from './cell-name';
import './panels.css';

export type StatusText = { headline: string; announcement: string };

/** Whose turn it is, or the result, as a sentence without end punctuation. */
function turnLine(round: Round): string {
  switch (round.phase) {
    case 'over':
      return round.outcome.kind === 'win' ? `${round.outcome.winner} wins` : 'Draw';
    case 'computer-thinking':
      return `Computer (${round.turn}) is thinking`;
    case 'ready':
    case 'playing':
      return `${round.turn} to move`;
  }
}

function moveLine(round: Round): string | null {
  if (round.phase === 'ready' || round.lastMove === null) return null;
  const { mark, cell } = round.lastMove;
  return `${mark} in ${cellName(cell).toLowerCase()}`;
}

/** Visible headline and screen-reader announcement for the current round. */
export function statusText(session: Session): StatusText {
  const { round } = session;
  const line = turnLine(round);
  const move = moveLine(round);
  return {
    headline: round.phase === 'computer-thinking' ? `${line}…` : line,
    announcement: move === null ? `${line}.` : `${move}. ${line}.`,
  };
}

export function RoundStatus({ session }: { session: Session }) {
  const { headline, announcement } = statusText(session);
  return (
    <div className="round-status">
      <p key={headline} className={`round-status__headline round-status__headline--${session.round.phase}`}>
        {headline}
      </p>
      <p className="visually-hidden" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
