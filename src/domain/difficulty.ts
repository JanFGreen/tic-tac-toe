export const difficulties = ['easy', 'medium', 'hard'] as const;

export type Difficulty = (typeof difficulties)[number];
