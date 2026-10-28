import { DatabaseSync } from 'node:sqlite';
import type { Difficulty } from '../domain/difficulty';
import { nicknameKey, type LeaderboardEntry, type PlayerOutcome } from '../domain/leaderboard';

export type StoredResult = { nickname: string; difficulty: Difficulty; outcome: PlayerOutcome };

/** The only access to saved results; route handlers depend on this port, never on SQLite. */
export interface ResultsStore {
  saveResult(result: StoredResult): void;
  leaderboard(difficulty: Difficulty): LeaderboardEntry[];
  close(): void;
}

const leaderboardSize = 20;

const schema = `
  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY,
    nickname_key TEXT NOT NULL,
    nickname TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    outcome TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS results_difficulty_nickname ON results (difficulty, nickname_key);
`;

const insertSql = `
  INSERT INTO results (nickname_key, nickname, difficulty, outcome, created_at)
  VALUES (?, ?, ?, ?, ?)
`;

// One row per player: totals per outcome, and the spelling of the group's latest save.
const leaderboardSql = `
  SELECT
    (SELECT latest.nickname FROM results AS latest
      WHERE latest.difficulty = r.difficulty AND latest.nickname_key = r.nickname_key
      ORDER BY latest.id DESC LIMIT 1) AS nickname,
    SUM(CASE WHEN r.outcome = 'win' THEN 1 ELSE 0 END) AS wins,
    SUM(CASE WHEN r.outcome = 'draw' THEN 1 ELSE 0 END) AS draws,
    SUM(CASE WHEN r.outcome = 'loss' THEN 1 ELSE 0 END) AS losses
  FROM results AS r
  WHERE r.difficulty = ?
  GROUP BY r.nickname_key
  ORDER BY wins DESC, losses ASC, r.nickname_key ASC
  LIMIT ?
`;

function toEntry(row: Record<string, unknown>): LeaderboardEntry {
  return {
    nickname: String(row.nickname),
    wins: Number(row.wins),
    draws: Number(row.draws),
    losses: Number(row.losses),
  };
}

/** Opens (and creates if missing) the results database at `path`; ':memory:' for tests. */
export function openResultsStore(path: string, now: () => number = Date.now): ResultsStore {
  const db = new DatabaseSync(path);
  db.exec(schema);
  const insert = db.prepare(insertSql);
  const select = db.prepare(leaderboardSql);
  return {
    saveResult({ nickname, difficulty, outcome }) {
      insert.run(nicknameKey(nickname), nickname, difficulty, outcome, now());
    },
    leaderboard(difficulty) {
      return select.all(difficulty, leaderboardSize).map(toEntry);
    },
    close() {
      db.close();
    },
  };
}
