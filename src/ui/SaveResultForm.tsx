import { type SubmitEvent, useId, useState } from 'react';
import { type PlayerOutcome, parseNickname } from '@/domain/leaderboard';
import { Button } from './components/Button';
import { Panel } from './components/Panel';
import type { SaveStatus } from './usePendingResult';
import './SaveResultForm.css';

const outcomeLines: Readonly<Record<PlayerOutcome, string>> = {
  win: 'You won against the computer.',
  loss: 'You lost against the computer.',
  draw: 'You drew against the computer.',
};

const emptyMessage = 'Enter a nickname to save.';
const invalidMessage = 'Use 1 to 16 letters, digits, spaces, _ or -.';

const statusMessages: Readonly<Partial<Record<SaveStatus, string>>> = {
  saving: 'Saving…',
  unreachable: 'Cannot reach the server.',
  'rate-limited': 'Too many saves, try again later.',
  rejected: 'The server did not accept this result.',
};

type SaveResultFormProps = {
  outcome: PlayerOutcome;
  status: SaveStatus;
  initialNickname: string;
  onSave: (nickname: string) => void;
};

function nicknameProblem(raw: string): string | null {
  if (raw.trim() === '') return emptyMessage;
  return parseNickname(raw) === null ? invalidMessage : null;
}

function SavedNotice() {
  return (
    <Panel title="Save result">
      <p className="save-result__message" role="status">
        Result saved.
      </p>
    </Panel>
  );
}

export function SaveResultForm({ outcome, status, initialNickname, onSave }: SaveResultFormProps) {
  const [nickname, setNickname] = useState(initialNickname);
  const [problem, setProblem] = useState<string | null>(null);
  const inputId = useId();

  if (status === 'saved') return <SavedNotice />;

  const submit = () => {
    const parsed = parseNickname(nickname);
    setProblem(nicknameProblem(nickname));
    if (parsed !== null) onSave(parsed);
  };
  const message = problem ?? statusMessages[status] ?? null;
  const canRetry = status === 'unreachable' || status === 'rate-limited';

  return (
    <Panel title="Save result">
      <form
        className="save-result"
        onSubmit={(event: SubmitEvent) => {
          event.preventDefault();
          submit();
        }}
      >
        <p className="save-result__outcome">{outcomeLines[outcome]}</p>
        <label className="save-result__label" htmlFor={inputId}>
          Nickname
        </label>
        <input
          id={inputId}
          className="save-result__input"
          type="text"
          autoComplete="nickname"
          value={nickname}
          onChange={(event) => {
            setNickname(event.target.value);
          }}
        />
        {message === null ? null : (
          <p className="save-result__message" role="alert">
            {message}
          </p>
        )}
        <div className="save-result__actions">
          <Button disabled={status === 'saving'} onClick={submit}>
            Save
          </Button>
          {canRetry ? (
            <Button variant="secondary" onClick={submit}>
              Retry
            </Button>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}
