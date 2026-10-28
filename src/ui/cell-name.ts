import { cellPosition, type CellIndex } from '@/domain/board';

/** Spoken position of a cell, e.g. "Row 1, column 2". The only place a cell position becomes text. */
export function cellName(cell: CellIndex): string {
  const { row, column } = cellPosition(cell);
  return `Row ${String(row)}, column ${String(column)}`;
}
