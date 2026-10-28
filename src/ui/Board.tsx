import { useRef, useState, type KeyboardEvent } from 'react';
import type { Board as BoardState, Cell, CellIndex } from '@/domain/board';
import type { Line } from '@/domain/lines';
import { cellName } from './cell-name';
import './Board.css';

type BoardProps = {
  board: BoardState;
  winningLine: Line | null;
  locked: boolean;
  onPlace: (cell: CellIndex) => void;
};

const cells: readonly CellIndex[] = [0, 1, 2, 3, 4, 5, 6, 7, 8];

const arrowSteps: Readonly<Record<string, { row: number; column: number }>> = {
  ArrowUp: { row: -1, column: 0 },
  ArrowDown: { row: 1, column: 0 },
  ArrowLeft: { row: 0, column: -1 },
  ArrowRight: { row: 0, column: 1 },
};

/** The adjacent cell in the arrow direction, or the same cell at the edge (no wrapping). */
function neighbour(cell: CellIndex, key: string): CellIndex {
  const step = arrowSteps[key];
  if (step === undefined) return cell;
  const row = Math.floor(cell / 3) + step.row;
  const column = (cell % 3) + step.column;
  if (row < 0 || row > 2 || column < 0 || column > 2) return cell;
  return cells[row * 3 + column] ?? cell;
}

function stateName(mark: Cell): string {
  return mark === null ? 'empty' : mark;
}

function cellClass(mark: Cell, winning: boolean): string {
  const classes = ['board__cell'];
  if (mark !== null) classes.push(`board__cell--${mark.toLowerCase()}`);
  if (winning) classes.push('board__cell--winning');
  return classes.join(' ');
}

export function Board({ board, winningLine, locked, onPlace }: BoardProps) {
  const [focusCell, setFocusCell] = useState<CellIndex>(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(cell: CellIndex, event: KeyboardEvent): void {
    if (!(event.key in arrowSteps)) return;
    event.preventDefault();
    buttons.current[neighbour(cell, event.key)]?.focus();
  }

  return (
    <div role="group" aria-label="Board" className="board">
      {cells.map((cell) => {
        const mark = board[cell];
        const unavailable = locked || mark !== null;
        return (
          <button
            key={cell}
            type="button"
            ref={(element) => {
              buttons.current[cell] = element;
            }}
            className={cellClass(mark, winningLine?.includes(cell) ?? false)}
            tabIndex={cell === focusCell ? 0 : -1}
            aria-disabled={unavailable}
            aria-label={`${cellName(cell)}, ${stateName(mark)}`}
            data-winning={winningLine?.includes(cell) ?? false}
            onFocus={() => {
              setFocusCell(cell);
            }}
            onKeyDown={(event) => {
              handleKeyDown(cell, event);
            }}
            onClick={() => {
              if (!unavailable) onPlace(cell);
            }}
          >
            {mark !== null && (
              <span className="board__mark" aria-hidden="true">
                {mark}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
