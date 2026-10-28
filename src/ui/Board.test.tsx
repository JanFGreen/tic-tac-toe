// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyBoard, type Board as BoardState, type CellIndex } from '@/domain/board';
import type { Line } from '@/domain/lines';
import { Board } from './Board';
import { cellName } from './cell-name';

afterEach(cleanup);

const emptyCell =(cell: CellIndex) => screen.getByRole('button', { name: `${cellName(cell)}, empty` });
const cellButtons = () => screen.getAllByRole('button').filter((button) => button.className.includes('board__cell'));
const tabStops = () => cellButtons().filter((button) => button.tabIndex === 0);

function setup(options: { board?: BoardState; winningLine?: Line | null; locked?: boolean } = {}) {
  const onPlace = vi.fn();
  const user = userEvent.setup();
  render(
    <>
      <button type="button">before</button>
      <Board board={options.board ?? emptyBoard} winningLine={options.winningLine ?? null} locked={options.locked ?? false} onPlace={onPlace} />
      <button type="button">after</button>
    </>,
  );
  return { onPlace, user };
}

describe('cellName', () => {
  it('names row and column from 1', () => {
    expect(cellName(0)).toBe('Row 1, column 1');
    expect(cellName(5)).toBe('Row 2, column 3');
    expect(cellName(7)).toBe('Row 3, column 2');
  });
});

describe('Board focus', () => {
  it('has exactly one tab stop, initially cell 0, and Tab enters and leaves the board', async () => {
    const { user } = setup();
    expect(tabStops()).toEqual([emptyCell(0)]);
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(emptyCell(0));
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'after' }));
  });

  it.each([
    ['{ArrowRight}', 4, 5],
    ['{ArrowLeft}', 4, 3],
    ['{ArrowDown}', 4, 7],
    ['{ArrowUp}', 4, 1],
  ] as const)('%s moves focus to the adjacent cell without placing a mark', async (key, from, to) => {
    const { onPlace, user } = setup();
    emptyCell(from).focus();
    await user.keyboard(key);
    expect(document.activeElement).toBe(emptyCell(to));
    expect(tabStops()).toEqual([emptyCell(to)]);
    expect(onPlace).not.toHaveBeenCalled();
  });

  it.each([
    ['{ArrowUp}', 1],
    ['{ArrowDown}', 7],
    ['{ArrowLeft}', 3],
    ['{ArrowRight}', 5],
    ['{ArrowUp}', 0],
    ['{ArrowLeft}', 0],
    ['{ArrowDown}', 8],
    ['{ArrowRight}', 8],
  ] as const)('%s on cell %i keeps focus on the same cell', async (key, cell) => {
    const { onPlace, user } = setup();
    emptyCell(cell).focus();
    await user.keyboard(key);
    expect(document.activeElement).toBe(emptyCell(cell));
    expect(tabStops()).toEqual([emptyCell(cell)]);
    expect(onPlace).not.toHaveBeenCalled();
  });

  it('keeps the last focused cell as the tab stop after focus leaves the board', async () => {
    const { user } = setup();
    await user.tab();
    await user.tab();
    await user.keyboard('{ArrowDown}{ArrowRight}');
    await user.tab();
    expect(tabStops()).toEqual([emptyCell(4)]);
  });
});

describe('Board placing', () => {
  it('places with Enter, Space and click on an empty cell', async () => {
    const { onPlace, user } = setup();
    emptyCell(2).focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    await user.click(emptyCell(6));
    expect(onPlace.mock.calls).toEqual([[2], [2], [6]]);
  });

  it('ignores click, Enter and Space on an occupied cell, which stays focusable', async () => {
    const board: BoardState = ['X', null, null, null, null, null, null, null, null];
    const { onPlace, user } = setup({ board });
    const occupied = screen.getByRole('button', { name: 'Row 1, column 1, X' });
    expect(occupied.getAttribute('aria-disabled')).toBe('true');
    expect(occupied.hasAttribute('disabled')).toBe(false);
    await user.click(occupied);
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(document.activeElement).toBe(occupied);
    expect(onPlace).not.toHaveBeenCalled();
  });

  it('ignores click, Enter and Space on every cell when locked, and focus still moves', async () => {
    const { onPlace, user } = setup({ locked: true });
    await user.click(emptyCell(0));
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(emptyCell(1));
    expect(emptyCell(1).getAttribute('aria-disabled')).toBe('true');
    expect(onPlace).not.toHaveBeenCalled();
  });
});

describe('Board names and highlight', () => {
  it('names each cell with row, column and empty, X or O', () => {
    const board: BoardState = ['X', null, 'O', null, null, null, null, null, null];
    setup({ board });
    expect(screen.getByRole('group', { name: 'Board' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Row 1, column 1, X' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Row 1, column 2, empty' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Row 1, column 3, O' })).toBeTruthy();
  });

  it('marks exactly the winning line cells as highlighted', () => {
    const board: BoardState = ['X', 'X', 'X', 'O', 'O', null, null, null, null];
    setup({ board, winningLine: [0, 1, 2] });
    const highlighted = cellButtons().filter((button) => button.dataset['winning'] === 'true');
    expect(highlighted).toEqual([0, 1, 2].map((cell) => screen.getByRole('button', { name: new RegExp(`^${cellName(cell as CellIndex)},`) })));
    expect(highlighted.every((button) => button.classList.contains('board__cell--winning'))).toBe(true);
  });

  it('highlights nothing without a winning line', () => {
    setup();
    expect(cellButtons().some((button) => button.dataset['winning'] === 'true')).toBe(false);
  });
});
