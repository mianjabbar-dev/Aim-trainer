export interface HighScore {
  score: number;
  accuracy: number;
  avgReaction: number;
  date: string;
  difficulty: string;
}

const STORAGE_KEY = 'aimblitz_highscores';

export function getHighScores(): HighScore[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return [];
}

export function saveHighScore(entry: HighScore): HighScore[] {
  const scores = getHighScores();
  scores.push(entry);
  scores.sort((a, b) => b.score - a.score);
  const trimmed = scores.slice(0, 10);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {}
  return trimmed;
}

export function clearHighScores(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
