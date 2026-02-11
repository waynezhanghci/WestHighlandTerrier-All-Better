export type Vector2 = {
  x: number;
  y: number;
};

export enum DogState {
  IDLE = 'IDLE',
  CHASING = 'CHASING',
  CATCHING = 'CATCHING',
  RETRIEVING = 'RETRIEVING',
  DROPPING = 'DROPPING',
  CELEBRATING = 'CELEBRATING',
  ZOOMIES = 'ZOOMIES'
}

export enum ToyType {
  BALL = 'BALL',
  FRISBEE = 'FRISBEE',
  BONE = 'BONE',
  CARROT = 'CARROT',
  BELL = 'BELL',
  BEE = 'BEE',
  BUTTON = 'BUTTON'
}

export interface GameState {
  score: number;
  dogState: DogState;
  currentToy: ToyType;
}

export interface Ball {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  height: number; // For arc calculation
  rotation: number;
  isAirborne: boolean;
  t: number; // 0 to 1 interpolation factor
  trail: {x: number, y: number}[];
}

export interface Dog {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  facingRight: boolean;
  legFrame: number;
}