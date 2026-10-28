import type { Mark } from '@/domain/board';
import { type Difficulty, difficulties } from '@/domain/difficulty';
import { type Mode, modes, type Settings } from '@/domain/session';
import { ChoiceGroup } from './components/ChoiceGroup';
import { Panel } from './components/Panel';
import './panels.css';

const modeLabels: Readonly<Record<Mode, string>> = { 'two-players': 'Two players', computer: 'Against the computer' };
const difficultyLabels: Readonly<Record<Difficulty, string>> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const markLabels: Readonly<Record<Mark, string>> = { X: 'Play as X', O: 'Play as O' };

const marks: readonly Mark[] = ['X', 'O'];

function optionsOf<T extends string>(values: readonly T[], labels: Readonly<Record<T, string>>) {
  return values.map((value) => ({ value, label: labels[value] }));
}

const modeOptions = optionsOf(modes, modeLabels);
const difficultyOptions = optionsOf(difficulties, difficultyLabels);
const markOptions = optionsOf(marks, markLabels);

type SetupPanelProps = {
  settings: Settings;
  locked: boolean;
  onChange: (settings: Partial<Settings>) => void;
};

export function SetupPanel({ settings, locked, onChange }: SetupPanelProps) {
  return (
    <Panel title="Setup">
      <div className="setup">
        <ChoiceGroup
          legend="Mode"
          name="mode"
          options={modeOptions}
          value={settings.mode}
          disabled={locked}
          onChange={(mode) => {
            onChange({ mode });
          }}
        />
        {settings.mode === 'computer' ? (
          <>
            <ChoiceGroup
              legend="Difficulty"
              name="difficulty"
              options={difficultyOptions}
              value={settings.difficulty}
              disabled={locked}
              onChange={(difficulty) => {
                onChange({ difficulty });
              }}
            />
            <ChoiceGroup
              legend="Your mark"
              name="player-mark"
              options={markOptions}
              value={settings.playerMark}
              disabled={locked}
              onChange={(playerMark) => {
                onChange({ playerMark });
              }}
            />
          </>
        ) : null}
      </div>
    </Panel>
  );
}
