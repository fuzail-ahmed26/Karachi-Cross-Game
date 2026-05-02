export type ObstacleType = 'RICKSHAW' | 'CAR' | 'BUS' | 'BIKE' | 'TRUCK' | 'BEGGAR';
export type LaneType = 'SAFE' | 'ROAD';

export interface Obstacle {
  x: number;
  y: number;
  width: number; // in grid spaces
  type: ObstacleType;
  speed: number;
  direction: 1 | -1;
}

export interface Lane {
  y: number;
  type: LaneType;
  direction: 1 | -1; // 1 = going right, -1 = going left
  speed: number;
  obstacles: Obstacle[];
}

export interface GameState {
  player: {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    moving: boolean;
    score: number;
    highScore: number;
    combo: number;
  };
  cameraY: number;
  isGameOver: boolean;
  hasStarted: boolean;
  lanes: Lane[];
  message: { ur: string; en: string } | null;
  comboActive: boolean;
}
