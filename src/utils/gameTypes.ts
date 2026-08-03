export interface Target {
  id: number;
  x: number;
  y: number;
  radius: number;
  spawnTime: number;
  lifespan: number;
  color: string;
  hit: boolean;
  scale: number;
  pulsePhase: number;
  points: number;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface DifficultyConfig {
  name: string;
  label: string;
  targetLifespan: number;
  spawnInterval: number;
  minRadius: number;
  maxRadius: number;
  maxTargets: number;
  gameDuration: number;
  speedMultiplier: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  easy: {
    name: 'easy',
    label: 'Easy',
    targetLifespan: 3.0,
    spawnInterval: 1.2,
    minRadius: 30,
    maxRadius: 50,
    maxTargets: 3,
    gameDuration: 30,
    speedMultiplier: 0,
  },
  normal: {
    name: 'normal',
    label: 'Normal',
    targetLifespan: 2.0,
    spawnInterval: 0.8,
    minRadius: 20,
    maxRadius: 40,
    maxTargets: 5,
    gameDuration: 30,
    speedMultiplier: 0.3,
  },
  hard: {
    name: 'hard',
    label: 'Hard',
    targetLifespan: 1.2,
    spawnInterval: 0.5,
    minRadius: 12,
    maxRadius: 28,
    maxTargets: 8,
    gameDuration: 30,
    speedMultiplier: 0.7,
  },
};

export const TARGET_COLORS = [
  '#ff3366',
  '#ff6633',
  '#ffcc00',
  '#33ff66',
  '#3366ff',
  '#cc33ff',
  '#ff3399',
  '#00ccff',
];
