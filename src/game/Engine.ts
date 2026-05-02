import { GRID_COLS, MESSAGES } from './constants';
import { GameState, Lane, Obstacle, LaneType, ObstacleType } from './types';

export class Engine {
  public state: GameState;
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private onChange: (state: GameState) => void;
  private onPlayAudio: (text: string) => void;
  // Combo tracking
  private lastMoveTime: number = 0;
  private consecutiveHops: number = 0;
  
  // Camera
  private cameraOffsetY: number = 0;

  constructor(onChange: (state: GameState) => void, onPlayAudio: (text: string) => void) {
    this.onChange = onChange;
    this.onPlayAudio = onPlayAudio;
    this.state = this.getInitialState();
  }

  getInitialState(): GameState {
    const highScore = parseInt(localStorage.getItem('karachi-cross-highscore') || '0', 10);
    const lanes: Lane[] = [];
    
    // Generate initial lanes
    for (let i = -5; i < 30; i++) {
       lanes.push(this.generateLane(i, 0));
    }

    return {
      player: {
        x: Math.floor(GRID_COLS / 2),
        y: 0,
        targetX: Math.floor(GRID_COLS / 2),
        targetY: 0,
        moving: false,
        score: 0,
        highScore,
        combo: 0,
      },
      cameraY: 0,
      isGameOver: false,
      hasStarted: false,
      lanes,
      message: MESSAGES.START,
      comboActive: false,
    };
  }

  private showMessage(msg: {ur: string, en: string}) {
    this.state.message = msg;
    this.onPlayAudio(msg.ur);
    setTimeout(() => {
      // Clear message if it hasn't changed
      if (this.state.message === msg) {
        this.state.message = null;
        this.triggerChange();
      }
    }, 4000);
  }

  private getLevelMultiplier(playerY?: number): number {
    const y = playerY !== undefined ? playerY : (this.state ? this.state.player.y : 0);
    const level = Math.floor(y / 10) + 1;
    return 1 + (level * 0.2); // Speed increases per level
  }

  private generateLane(y: number, playerY?: number): Lane {
    // Generate safe lanes initially
    if (y <= 1) {
      return { y, type: 'SAFE', direction: 1, speed: 0, obstacles: [] };
    }

    const type: LaneType = Math.random() > 0.3 ? 'ROAD' : 'SAFE';
    const numObstacles = type === 'ROAD' ? Math.floor(Math.random() * 3) + 1 : 0;
    const direction = Math.random() > 0.5 ? 1 : -1;
    const speed = (2 + Math.random() * 3) * this.getLevelMultiplier(playerY); // baseline units per second

    const obstacles: Obstacle[] = [];
    if (type === 'ROAD') {
      let currentX = Math.random() * GRID_COLS;
      for (let i = 0; i < numObstacles; i++) {
        const obsTypeRaw = Math.random();
        let obsType: ObstacleType = 'CAR';
        let width = 1.2;
        if (obsTypeRaw > 0.9) { obsType = 'TRUCK'; width = 3.5; }
        else if (obsTypeRaw > 0.75) { obsType = 'BUS'; width = 2.8; }
        else if (obsTypeRaw > 0.45) { obsType = 'RICKSHAW'; width = 1.2; }
        else { obsType = 'BIKE'; width = 0.8; }

        obstacles.push({
          x: currentX,
          y,
          width,
          type: obsType,
          speed,
          direction
        });
        currentX += Math.random() * 5 + 3; // Space out obstacles
      }
    } else if (type === 'SAFE' && y > 1) {
       // Beggar roaming on zebra crossing
       if (Math.random() > 0.7) {
          obstacles.push({
             x: Math.random() * GRID_COLS,
             y,
             width: 0.6,
             type: 'BEGGAR',
             speed: Math.max(1, speed * 0.3), // Slower than cars
             direction // Will be set appropriately below
          });
       }
    }

    return { y, type, direction, speed, obstacles };
  }

  public start() {
    this.lastTime = performance.now();
    this.showMessage(MESSAGES.L1);
    this.state.hasStarted = true;
    this.loop(performance.now());
  }

  public restart() {
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.state = this.getInitialState();
    this.start();
  }

  private triggerChange() {
    this.onChange({ ...this.state });
  }

  public movePlayer(dx: number, dy: number) {
    if (this.state.isGameOver || !this.state.hasStarted || this.state.player.moving) return;

    const newX = this.state.player.x + dx;
    const newY = this.state.player.y + dy;

    if (newX < 0 || newX >= GRID_COLS || newY < -1) return;

    // Movement tracking
    const now = performance.now();
    
    // Check combo
    if (dy > 0) {
      if (now - this.lastMoveTime < 1000) {
        this.consecutiveHops++;
        if (this.consecutiveHops >= 3) {
          this.state.player.combo++;
          this.state.comboActive = true;
          this.consecutiveHops = 0; // reset hops count but keep combo
          // Hide combo effect after a bit
          setTimeout(() => {
            this.state.comboActive = false;
            this.triggerChange();
          }, 1000);
        }
      } else {
        this.consecutiveHops = 1; // start new chain
        this.state.player.combo = 0; // broken combo
      }
      this.lastMoveTime = now;
    }

    // Level alerts
    const previousLevel = Math.floor(this.state.player.y / 10);
    const newLevel = Math.floor(newY / 10);

    if (newLevel > previousLevel) {
       if (newLevel === 2) this.showMessage(MESSAGES.L3);
       else if (newLevel === 4) this.showMessage(MESSAGES.L5);
    }

    // Move player
    this.state.player.targetX = newX;
    this.state.player.targetY = newY;
    this.state.player.moving = true;
    
    // Simple instant move for logical state, animation can be handled by renderer
    this.state.player.x = newX;
    this.state.player.y = newY;
    
    // Score update
    if (newY > this.state.player.score) {
      this.state.player.score = newY;
    }

    // Generate upcoming lanes if needed
    const highestLaneGenerated = this.state.lanes[this.state.lanes.length - 1].y;
    if (newY + 20 > highestLaneGenerated) {
      for (let i = 1; i <= 10; i++) {
        this.state.lanes.push(this.generateLane(highestLaneGenerated + i));
      }
    }

    // Rickshaw warning
    const currentLane = this.state.lanes.find(l => l.y === newY);
    if (currentLane) {
      if (currentLane.type === 'ROAD' && currentLane.obstacles.some(o => o.type === 'RICKSHAW')) {
         if (Math.random() > 0.5) { // don't spam it
            this.showMessage(MESSAGES.WARNING);
         }
      }
    }

    setTimeout(() => {
       this.state.player.moving = false;
    }, 150); // move duration 150ms

    this.triggerChange();
  }

  private update(dt: number) {
    if (this.state.isGameOver) return;

    // Move obstacles
    for (const lane of this.state.lanes) {
      if (lane.type === 'ROAD') {
        for (const obs of lane.obstacles) {
          obs.x += (obs.speed * lane.direction * dt);
          
          // Wrap around logic
          if (lane.direction === 1 && obs.x > GRID_COLS + 8) {
             obs.x = -obs.width - 2 - Math.random() * 4;
          } else if (lane.direction === -1 && obs.x < -obs.width - 8) {
             obs.x = GRID_COLS + 4 + Math.random() * 4;
          }
        }
      }
    }

    // Collision Check
    const py = this.state.player.y;
    const px = this.state.player.x;
    
    const playerLane = this.state.lanes.find(l => l.y === py);
    let collided = false;
    let nearMiss = false;

    if (playerLane && playerLane.type === 'ROAD') {
      for (const obs of playerLane.obstacles) {
        const obsLeft = obs.x;
        const obsRight = obs.x + obs.width;
        
        // Exact overlap condition (simplified 1D AABB per row)
        // Player width is considered 1 (from px to px+1)
        if (px + 0.8 > obsLeft && px + 0.2 < obsRight) {
          collided = true;
          break;
        }

        // Near miss detection
        if (!collided && (px + 1.5 > obsLeft && px - 0.5 < obsRight)) {
           nearMiss = true;
        }
      }
    }

    if (collided) {
       this.gameOver();
    } else if (nearMiss && !this.state.comboActive && Math.random() < 0.01) { // Throttle near miss messages
       this.showMessage(MESSAGES.CLOSE_CALL);
    }

    // Camera follow
    if (this.state.player.y > this.state.cameraY + 3) {
      this.state.cameraY = this.state.player.y - 3;
    }

    this.triggerChange();
  }

  private gameOver() {
    this.state.isGameOver = true;
    if (this.state.player.score > this.state.player.highScore) {
       this.state.player.highScore = this.state.player.score;
       localStorage.setItem('karachi-cross-highscore', this.state.player.score.toString());
       this.showMessage(MESSAGES.HIGH_SCORE);
    } else {
       this.showMessage(MESSAGES.GAME_OVER);
    }
    this.triggerChange();
  }

  private loop = (time: number) => {
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    
    this.update(dt);
    
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  public cleanup() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
