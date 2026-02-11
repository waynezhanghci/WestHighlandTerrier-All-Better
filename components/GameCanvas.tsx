import React, { useRef, useEffect } from 'react';
import { PHYSICS, DIMENSIONS } from '../constants';
import { DogState, ToyType } from '../types';

interface GameCanvasProps {
  score: number;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  dogState: DogState;
  setDogState: React.Dispatch<React.SetStateAction<DogState>>;
}

// Interaction Zones
type InteractionType = 'NONE' | 'HEAD' | 'EAR_L' | 'EAR_R' | 'BACK';

// Movement Types
type TargetType = 'GROUND' | 'TOY';

interface Heart {
  x: number;
  y: number;
  life: number; // 0 to 1
  id: number;
}

// Fireworks Particle
interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    alpha: number;
    decay: number;
    size: number;
}

interface SceneToy {
    id: number;
    x: number;
    y: number;
    type: ToyType;
    pressedTimer?: number; // Visual timer for button press animation
}

// Palette
const PALETTE = {
  DOG_WHITE_CORE: '#FFFFFF',
  DOG_HIGHLIGHT: '#F0F0F0',
  EAR_INNER_1: '#EEEEEE',
  EAR_INNER_2: '#F0F0F0',
  EAR_INNER_3: '#F5F5F5',
  SHADOW_DEEP: '#EEEEEE',
  SHADOW_MID: '#F5F5F5',
  SHADOW_LIGHT: '#F8F8F8',
  NOSE_CORE: '#000000',
  NOSE_EDGE: '#333333',
  NAIL_COLOR: '#000000',
  BLACK_INK: '#222222',     
  BLACK_FADE: 'rgba(34, 34, 34, 0.3)',    
  
  SKY_TOP: '#C8E6FF',       
  SKY_BOT: '#EAF6FF',       
  
  GRASS_BASE: '#9CCC65',    
  GRASS_TUFT: '#8BC34A',    
  
  HILL_DARK: '#82B366',     
  HILL_MID: '#9CCC65',      
  HILL_TOP: '#C5E1A5',

  BALL_RED: '#FF4444',
  BALL_BLUE: '#4444FF',
  BALL_YELLOW: '#FFFF44',
  BALL_GREEN: '#44FF44',
  
  FRISBEE_MAIN: '#E91E63', 
  FRISBEE_DARK: '#880E4F',
  FRISBEE_LIGHT: '#F48FB1',

  BONE_MAIN: '#F5F5F5',
  BONE_SHADOW: '#E0E0E0',
  BONE_OUTLINE: '#9E9E9E',

  CARROT_BODY: '#FF9800',
  CARROT_SHADOW: '#E65100',
  CARROT_GREEN: '#4CAF50',

  BELL_MAIN: '#FFD700',
  BELL_SHADOW: '#FFC107',
  BELL_DARK: '#FF6F00',
  BELL_HOLE: '#3E2723',

  BEE_YELLOW: '#FFEB3B',
  BEE_BLACK: '#212121',
  BEE_WING: '#E3F2FD',

  HEART: '#FF69B4',

  // Updated Button Palette (Match Reference Pixel Art)
  BUTTON_RED_TOP: '#C0392B',   // Vibrant Red
  BUTTON_RED_SIDE: '#922B21',  // Darker Red for cylinder depth
  BUTTON_GREY_TOP: '#BDC3C7',  // Silver Base Top
  BUTTON_GREY_SIDE: '#7F8C8D', // Dark Grey Base Side
  BUTTON_PAW: '#FFFFFF',       // White Paw
  
  // Fireworks Colors
  FW_COLORS: ['#FF5252', '#FFEB3B', '#69F0AE', '#40C4FF', '#E040FB', '#FFFFFF']
};

// Sprites
const BALL_SPRITE_3x3 = ["RYG","B R", "YGB"];
const BONE_SPRITE = [" OO OO ","OXXXXXO"," OO OO "];
const HEART_SPRITE = [" O O ","OOOOO","OOOOO"," OOO ","  O  "];
const CARROT_SPRITE = ["  G  "," OOO "," OOO ","  O  ","  O  "];
const BELL_SPRITE = ["  X  "," OOO ","OOOOO","O O O"];
const BEE_SPRITE = [" W W "," BYB "," YBY ","  B  "];

// Updated Button Sprite: Red Cylinder on Wider Grey Base
// Normal State
const BUTTON_SPRITE = [
  "      RRRR      ", 
  "    RRRRRRRR    ", 
  "   RRRWWRRWWR   ", 
  "   RRRWWWWWWR   ", 
  "   RRRRWWWRRR   ", 
  "   dddddddddd   ", // 2 rows of depth
  "   dddddddddd   ", 
  "  gggggggggggg  ", 
  " bbbbbbbbbbbbbb ", 
  " bbbbbbbbbbbbbb ",
  "  bbbbbbbbbbbb  "
];

// Pressed State: Red part shifts down 1 pixel, depth reduces by 1 pixel
const BUTTON_PRESSED_SPRITE = [
  "                ", // Empty space at top
  "      RRRR      ", 
  "    RRRRRRRR    ", 
  "   RRRWWRRWWR   ", 
  "   RRRWWWWWWR   ", 
  "   RRRRWWWRRR   ", 
  "   dddddddddd   ", // Only 1 row of depth
  "  gggggggggggg  ", 
  " bbbbbbbbbbbbbb ", 
  " bbbbbbbbbbbbbb ",
  "  bbbbbbbbbbbb  "
];


export const GameCanvas: React.FC<GameCanvasProps> = ({
  setScore,
  dogState,
  setDogState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRectRef = useRef<DOMRect | null>(null); // OPTIMIZATION: Cache Rect
  
  // Offscreen canvas for static background caching
  const bgCanvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  
  const initializedRef = useRef(false);
  const hasDroppedRef = useRef(false);
  
  // Track Device Pixel Ratio for coordinate conversions
  const dprRef = useRef(1);
  
  // Track previous window size for responsive scaling
  const prevSizeRef = useRef<{w: number, h: number} | null>(null);
  
  // Track hovered toy for scale effect
  const hoveredToyIdRef = useRef<number | null>(null);

  // OPTIMIZATION: Keep dogState in a ref for the animation loop
  // This prevents the useEffect loop from restarting every time React state changes.
  const dogStateRef = useRef(dogState);
  useEffect(() => {
    dogStateRef.current = dogState;
  }, [dogState]);
  
  const dogRef = useRef({
    x: 0,
    y: 0,
    initialX: 0, // Remembers home
    initialY: 0,
    targetX: 0,
    targetY: 0,
    scaleX: 1,
    scaleY: 1,
    facingRight: true,
    legFrame: 0,
    playTimer: 0,
    dropTimer: 0, 
    barkTimer: 0,
    zoomiesTimer: 0, // For the 5s run
    pettingCounter: 0, // Counts frames of petting
    // IDLE BEHAVIOR
    idleTimer: 0,
  });

  const interactionRef = useRef({
    current: 'NONE' as InteractionType,
    lastHeartTime: 0,
  });

  const targetRef = useRef<{type: TargetType, id?: number}>({ type: 'GROUND' });
  const sceneToysRef = useRef<SceneToy[]>([]);
  const heldToyRef = useRef<SceneToy | null>(null);
  const heartsRef = useRef<Heart[]>([]);
  const fireworksRef = useRef<Particle[]>([]);
  
  // Controls the multi-wave firework show
  const fireworkSeqRef = useRef({ count: 0, timer: 0 });

  // --- AUDIO REMOVED ---
  
  // Helper to clamp values within screen bounds with a margin
  const clamp = (value: number, min: number, max: number) => {
      return Math.max(min, Math.min(max, value));
  };

  // --- DRAWING HELPERS ---
  const drawSpriteFromGrid = (ctx: CanvasRenderingContext2D, grid: string[], startX: number, startY: number, pixelSize: number, colorMap: Record<string, string>) => {
      const offsetX = (grid[0].length * pixelSize) / 2;
      const offsetY = (grid.length * pixelSize) / 2;
      const x = startX - offsetX;
      const y = startY - offsetY;
      
      // OPTIMIZATION: RLE Batch Rendering for Sprites
      grid.forEach((row, rowIndex) => {
          let runStart = 0;
          let runChar = row[0];
          
          for(let col = 1; col < row.length; col++) {
              const char = row[col];
              if (char !== runChar) {
                  if (runChar !== ' ' && colorMap[runChar]) {
                      ctx.fillStyle = colorMap[runChar];
                      ctx.fillRect(
                          x + runStart * pixelSize, 
                          y + rowIndex * pixelSize, 
                          (col - runStart) * pixelSize + 0.5, 
                          pixelSize + 0.5
                      );
                  }
                  runChar = char;
                  runStart = col;
              }
          }
          if (runChar !== ' ' && colorMap[runChar]) {
              ctx.fillStyle = colorMap[runChar];
              ctx.fillRect(
                  x + runStart * pixelSize, 
                  y + rowIndex * pixelSize, 
                  (row.length - runStart) * pixelSize + 0.5, 
                  pixelSize + 0.5
              );
          }
      });
  };

  const drawSpecificToy = (ctx: CanvasRenderingContext2D, toyType: ToyType, centerX: number, centerY: number, scale: number, isPressed: boolean = false) => {
    const pixelSize = scale * 1.5; 
    if (toyType === ToyType.BALL) {
        const startX = centerX - (3*pixelSize)/2;
        const startY = centerY - (3*pixelSize)/2;
        BALL_SPRITE_3x3.forEach((row, ri) => {
            for(let ci=0; ci<row.length; ci++) {
                const c = row[ci];
                if(c===' ') ctx.fillStyle = PALETTE.BALL_RED;
                else if(c==='R') ctx.fillStyle=PALETTE.BALL_RED;
                else if(c==='G') ctx.fillStyle=PALETTE.BALL_GREEN;
                else if(c==='B') ctx.fillStyle=PALETTE.BALL_BLUE;
                else if(c==='Y') ctx.fillStyle=PALETTE.BALL_YELLOW;
                ctx.fillRect(startX+ci*pixelSize, startY+ri*pixelSize, pixelSize, pixelSize);
                ctx.strokeStyle = "rgba(0,0,0,0.1)"; ctx.lineWidth = 1;
                ctx.strokeRect(startX+ci*pixelSize, startY+ri*pixelSize, pixelSize, pixelSize);
            }
        });
        ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 2;
        ctx.strokeRect(startX, startY, pixelSize*3, pixelSize*3);
    } else if (toyType === ToyType.FRISBEE) {
        const width = pixelSize * 6;
        const x = centerX - width/2 + pixelSize * 1.5;
        const y = centerY - pixelSize;
        ctx.fillStyle = PALETTE.FRISBEE_LIGHT; ctx.fillRect(x+pixelSize, y, pixelSize*4, pixelSize);
        ctx.fillStyle = PALETTE.FRISBEE_MAIN; ctx.fillRect(x, y+pixelSize, width, pixelSize);
        ctx.fillStyle = PALETTE.FRISBEE_DARK; ctx.fillRect(x+pixelSize, y+pixelSize*1.5, pixelSize*4, pixelSize*0.5);
    } else if (toyType === ToyType.BONE) {
        drawSpriteFromGrid(ctx, BONE_SPRITE, centerX, centerY, pixelSize, {'O': PALETTE.BONE_SHADOW, 'X': PALETTE.BONE_MAIN});
    } else if (toyType === ToyType.CARROT) {
        drawSpriteFromGrid(ctx, CARROT_SPRITE, centerX, centerY, pixelSize, {'O': PALETTE.CARROT_BODY, 'G': PALETTE.CARROT_GREEN});
    } else if (toyType === ToyType.BELL) {
        drawSpriteFromGrid(ctx, BELL_SPRITE, centerX, centerY, pixelSize, {'O': PALETTE.BELL_MAIN, 'X': PALETTE.BELL_DARK});
    } else if (toyType === ToyType.BEE) {
        drawSpriteFromGrid(ctx, BEE_SPRITE, centerX, centerY, pixelSize, {'Y': PALETTE.BEE_YELLOW, 'B': PALETTE.BEE_BLACK, 'W': PALETTE.BEE_WING});
    } else if (toyType === ToyType.BUTTON) {
        // Draw the button
        const btnPixelSize = scale * 0.8; 
        const sprite = isPressed ? BUTTON_PRESSED_SPRITE : BUTTON_SPRITE;
        drawSpriteFromGrid(ctx, sprite, centerX, centerY, btnPixelSize, {
            'R': PALETTE.BUTTON_RED_TOP,
            'd': PALETTE.BUTTON_RED_SIDE,
            'g': PALETTE.BUTTON_GREY_TOP,
            'b': PALETTE.BUTTON_GREY_SIDE,
            'W': PALETTE.BUTTON_PAW
        });
    }
  };

  const drawHearts = (ctx: CanvasRenderingContext2D, scale: number) => {
      heartsRef.current.forEach(h => {
          ctx.save(); ctx.globalAlpha = h.life;
          drawSpriteFromGrid(ctx, HEART_SPRITE, h.x, h.y, scale*0.8, { 'O': PALETTE.HEART });
          ctx.restore();
      });
  };
  
  const spawnFireworkWave = (w: number, h: number) => {
      // Spawn 5 bursts
      for(let i=0; i<5; i++) {
          const cx = Math.random() * w;
          // RESTRICTION: Sky is top 40%, so we multiply by 0.35 to keep it safely in the sky
          const cy = Math.random() * (h * 0.35); 
          const color = PALETTE.FW_COLORS[Math.floor(Math.random() * PALETTE.FW_COLORS.length)];
          
          // 25 particles per burst
          for(let p=0; p<25; p++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = Math.random() * 4 + 2;
              fireworksRef.current.push({
                  x: cx,
                  y: cy,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  color: color,
                  alpha: 1.0,
                  decay: Math.random() * 0.005 + 0.005, // Slow decay (approx 3-4s)
                  size: Math.random() * 3 + 2
              });
          }
      }
  };

  const startFireworkShow = () => {
      // Setup 4 waves
      fireworkSeqRef.current.count = 4;
      fireworkSeqRef.current.timer = 0; // Immediate start
  };

  const drawFireworks = (ctx: CanvasRenderingContext2D) => {
      if (fireworksRef.current.length === 0) return;
      
      for (let i = fireworksRef.current.length - 1; i >= 0; i--) {
          const p = fireworksRef.current[i];
          
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.04; // Low gravity for "floaty" feel
          p.vx *= 0.98; // Air resistance
          p.alpha -= p.decay;
          
          if (p.alpha <= 0) {
              fireworksRef.current.splice(i, 1);
              continue;
          }
          
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size);
      }
      ctx.globalAlpha = 1.0;
  };

  const drawDog = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number) => {
    const d = dogRef.current;
    const currentState = dogStateRef.current; // Use Ref
    const ia = interactionRef.current.current;
    
    ctx.save();
    ctx.translate(centerX, centerY);
    const dir = d.facingRight ? 1 : -1;
    ctx.scale(dir * d.scaleX, d.scaleY);
    const microScale = scale / 6; 

    // Mini-pixel drawing helper
    const mp = (dx: number, dy: number, w: number, h: number, colorOrFn: any) => {
        const drawX = dx * microScale; const drawY = dy * microScale;
        const cFn = typeof colorOrFn === 'string' ? () => colorOrFn : colorOrFn;
        
        // PERFORMANCE OPTIMIZATION: RLE (Run Length Encoding) Rendering
        for(let iy=0; iy<h; iy++) {
            let runStart = 0;
            let runColor = cFn(0, iy);

            for(let ix=1; ix<w; ix++) {
                const nextColor = cFn(ix, iy);
                if (nextColor !== runColor) {
                    ctx.fillStyle = runColor;
                    ctx.fillRect(
                        drawX + runStart * microScale, 
                        drawY + iy * microScale, 
                        (ix - runStart) * microScale + 0.5, 
                        microScale + 0.5
                    );
                    runStart = ix;
                    runColor = nextColor;
                }
            }
            ctx.fillStyle = runColor;
            ctx.fillRect(
                drawX + runStart * microScale, 
                drawY + iy * microScale, 
                (w - runStart) * microScale + 0.5, 
                microScale + 0.5
            );
        }
    };

    // Shared Head Drawer
    const drawHead = (hx: number, hy: number, tilt: number, yOffset: number) => {
        ctx.save();
        ctx.translate(0, yOffset * microScale);
        ctx.rotate(tilt);
        
        // Head Main Block
        mp(hx, hy, 56, 52, (x:any,y:any) => (y > 44 && x < 10) ? PALETTE.SHADOW_LIGHT : PALETTE.DOG_WHITE_CORE);
        
        // Ears
        const drawEar = (ex: number, ey: number, isRight: boolean) => {
             let earH = 20; let earYOffset = 0;
             if ((ia === 'EAR_L' && !isRight) || (ia === 'EAR_R' && isRight)) { earH = 12; earYOffset = 8; }
             mp(ex, ey + earYOffset, 16, earH, (x:any, y:any) => (x>4 && x<12 && y>4) ? (y>12 ? PALETTE.EAR_INNER_3 : (y>8? PALETTE.EAR_INNER_2:PALETTE.EAR_INNER_1)) : PALETTE.DOG_WHITE_CORE);
        };
        drawEar(hx + 4, hy - 20, false); drawEar(hx + 36, hy - 20, true);

        // Snout
        mp(hx + 40, hy + 24, 24, 20, PALETTE.DOG_WHITE_CORE);
        // Nose
        mp(hx + 56, hy + 22, 12, 10, (x:any, y:any) => (Math.abs(x-6)+Math.abs(y-5)<4) ? PALETTE.NOSE_CORE : PALETTE.NOSE_EDGE);
        // Eye
        mp(hx + 36, hy + 16, 8, 8, (x:any, y:any) => (x>=4 && x<=6 && y>=0 && y<=2) ? PALETTE.DOG_HIGHLIGHT : PALETTE.BLACK_INK);
        
        // Head Interaction Highlight
        if (ia === 'HEAD') {
             ctx.lineWidth = 3; ctx.strokeStyle = PALETTE.BLACK_INK;
             ctx.beginPath(); ctx.moveTo((hx+36)*microScale, (hy+20)*microScale); ctx.lineTo((hx+44)*microScale, (hy+20)*microScale); ctx.stroke();
        }

        // Held Toy
        const hasToy = heldToyRef.current && (
            currentState === DogState.CATCHING ||
            currentState === DogState.RETRIEVING || 
            (currentState === DogState.DROPPING && d.dropTimer < 0.5)
        );

        if (hasToy && heldToyRef.current) {
             ctx.save();
             const holdX = (hx + 66)*microScale; const holdY = (hy + 30)*microScale;
             drawSpecificToy(ctx, heldToyRef.current.type, holdX, holdY, scale);
             ctx.restore();
        }

        ctx.restore();
    };


    // Shadow
    ctx.fillStyle = 'rgba(100, 130, 80, 0.3)'; 
    ctx.beginPath(); ctx.ellipse(0, 0, scale * 6, scale * 1.5, 0, 0, Math.PI * 2); ctx.fill();

    // Interaction vars
    let headOffsetY = 0; let headTilt = 0;
    if (ia === 'HEAD') { headOffsetY = Math.sin(Date.now()/200)*5 - 5; headTilt = -0.1; }
    if (ia === 'EAR_L') headTilt = -0.15;
    if (ia === 'EAR_R') headTilt = 0.15;
    if (ia === 'BACK') headOffsetY = 5; 
    
    // --- DRAWING BODY & LEGS ---
    const isStanding = currentState === DogState.CHASING || currentState === DogState.ZOOMIES; 

    if (isStanding) {
        // RUNNING / STANDING POSE
        const legCycle = d.legFrame;
        const by = -40; 
        const tailWag = Math.sin(legCycle * 0.8) * 10;
        
        mp(-80, by - 10 + tailWag/2, 24, 12, PALETTE.DOG_WHITE_CORE); // Tail
        // Thick Body
        mp(-48, by - 8, 80, 48, (x:any,y:any) => (y > 38 ? PALETTE.SHADOW_DEEP : (y > 32 ? PALETTE.SHADOW_MID : PALETTE.DOG_WHITE_CORE))); 

        const leftLegAngle = Math.sin(legCycle) * 0.8;
        const rightLegAngle = Math.sin(legCycle + Math.PI) * 0.8;

        const drawRunningLeg = (lx: number, ly: number, angle: number) => {
             const footLift = Math.max(0, -Math.sin(angle)) * 10;
             ctx.save();
             ctx.translate(lx * microScale, (ly - footLift) * microScale);
             ctx.rotate(angle * 0.5); 
             ctx.translate(-lx * microScale, -ly * microScale);
             mp(lx, ly, 20, 28, (x:any,y:any) => (y>24 && x<4)? PALETTE.NAIL_COLOR : PALETTE.DOG_WHITE_CORE);
             ctx.restore();
        };
        drawRunningLeg(-60, by + 32, rightLegAngle);
        drawRunningLeg(20, by + 32, leftLegAngle);

        // Draw Head (Reusing shared logic)
        // Adjust bobbing for run
        const runBob = Math.abs(Math.sin(legCycle)) * 4;
        drawHead(16, -80, headTilt, headOffsetY - runBob); 
        
        // Collar (Drawn AFTER head to ensure visibility over neck area)
        // Slanted shape for natural look
        const collarColor = PALETTE.BLACK_INK;
        mp(14, by - 2, 6, 6, collarColor); // Top-back part
        mp(16, by + 4, 6, 6, collarColor); // Bottom-front part

    } else {
        // SITTING / IDLE POSE (Includes CATCHING/RETRIEVING/DROPPING/CELEBRATING)
        const isHappy = currentState === DogState.CELEBRATING || currentState === DogState.CATCHING;
        const bounce = isHappy ? Math.sin(Date.now() / 60) * 2 : 0;
        
        const by = -80 + bounce * 8; 
        
        let tailSpeed = isHappy ? 40 : 300;
        if (ia === 'BACK') tailSpeed = 30;
        const tailWag = Math.sin(Date.now() / tailSpeed) * 10;
        
        mp(-60 + tailWag, by + 50, 16, 28, PALETTE.DOG_WHITE_CORE);

        let bodyYOffset = ia === 'BACK' ? Math.sin(Date.now()/50)*2 : 0;
        // Body
        mp(-56, by + 60 + bodyYOffset, 40, 36, (x:any, y:any) => (x < 8 ? PALETTE.SHADOW_DEEP : (y > 28 ? PALETTE.SHADOW_MID : PALETTE.DOG_WHITE_CORE)));
        // Back Foot
        mp(-64, by + 92, 24, 12, (x:any, y:any) => (x < 4 && y > 6) ? PALETTE.NAIL_COLOR : PALETTE.DOG_WHITE_CORE);
        // Chest
        mp(-32, by + 20 + bodyYOffset, 48, 76, (x:any, y:any) => {
            if (x < 12) return PALETTE.SHADOW_DEEP; 
            if (x < 20) return PALETTE.SHADOW_MID;
            if (y > 60) return PALETTE.SHADOW_LIGHT;
            return PALETTE.DOG_WHITE_CORE;
        });
        // Front Legs
        mp(-12, by + 56, 16, 40, PALETTE.DOG_WHITE_CORE);
        mp(-16, by + 96, 20, 8, (x:any,y:any) => (x<4 && y>4) ? PALETTE.NAIL_COLOR : PALETTE.DOG_WHITE_CORE);
        mp(16, by + 56, 16, 40, PALETTE.DOG_WHITE_CORE);
        mp(12, by + 96, 20, 8, (x:any,y:any) => (x<4 && y>4) ? PALETTE.NAIL_COLOR : PALETTE.DOG_WHITE_CORE);
        // Collar
        mp(-28, by + 16, 48, 12, (x:any, y:any) => (y < 2 || y > 10) ? PALETTE.BLACK_FADE : PALETTE.BLACK_INK);

        // Draw Head (Sitting position)
        // Sitting head is anchored differently, at hx=-20, hy=by-32
        // We pass the raw coords that match the sitting body
        drawHead(-20, by - 32, headTilt, headOffsetY);

        if (currentState === DogState.CELEBRATING && d.barkTimer > 0) {
           ctx.scale(dir, 1); 
           ctx.fillStyle = PALETTE.BLACK_INK; 
           ctx.textAlign = 'center';
           ctx.font = `bold ${scale * 4}px "Press Start 2P"`;
           // Position text above head
           ctx.fillText("WOOF!", 0, -28 * scale); 
           d.barkTimer--;
        }
    }
    ctx.restore();
  };

  const drawSceneToys = (ctx: CanvasRenderingContext2D, scale: number) => {
      sceneToysRef.current.forEach(toy => {
          // Check hover
          const isHovered = hoveredToyIdRef.current === toy.id;
          const currentScale = isHovered ? scale * 1.2 : scale;

          ctx.fillStyle = "rgba(0,0,0,0.15)"; 
          ctx.beginPath(); 
          ctx.ellipse(toy.x, toy.y + 5, currentScale * 1.5, currentScale * 0.5, 0, 0, Math.PI*2); 
          ctx.fill();
          
          ctx.save();
          // Button doesn't bob up and down
          const bob = toy.type === ToyType.BUTTON ? 0 : Math.sin((Date.now() + toy.id * 100) / 400) * 2;
          
          // Pass pressed state for rendering
          const isPressed = toy.type === ToyType.BUTTON && (toy.pressedTimer !== undefined && toy.pressedTimer > 0);
          drawSpecificToy(ctx, toy.type, toy.x, toy.y + bob, currentScale, isPressed);
          ctx.restore();
      });
  };

  // Pre-render static background to offscreen canvas
  // NOW GENERATES AT LOGICAL SIZE TO MAINTAIN PIXEL ART LOOK AND CORRECT SCALING
  const renderBackgroundToOffscreen = (w: number, h: number) => {
    const bgCtx = bgCanvasRef.current.getContext('2d', { alpha: false }); // Optimization: Opaque background
    if (!bgCtx) return;
    
    // Resize offscreen canvas
    bgCanvasRef.current.width = w;
    bgCanvasRef.current.height = h;

    const horizon = h * DIMENSIONS.GROUND_HORIZON_Y_RATIO;
    const skyGrad = bgCtx.createLinearGradient(0, 0, 0, horizon);
    skyGrad.addColorStop(0, PALETTE.SKY_TOP); skyGrad.addColorStop(1, PALETTE.SKY_BOT);
    bgCtx.fillStyle = skyGrad; 
    bgCtx.fillRect(0, 0, w, horizon);
    
    // Static Sky Particles (Clouds/Wind)
    for(let i=0; i<horizon; i+=10) {
        if (Math.random() > 0.5) {
            bgCtx.fillStyle = "rgba(255, 255, 255, 0.05)";
            bgCtx.fillRect(Math.random() * w, i, Math.random() * 200 + 50, 8);
        }
    }
    
    const hillStep = 4;
    for(let x=0; x<w; x+=hillStep) {
        const n1 = Math.sin(x*0.002+0.5)*50; const n2 = Math.cos(x*0.005)*20;
        const hillH = Math.floor((Math.abs(n1+n2)+30)/4)*4; const hillY = horizon - hillH * 0.6; 
        bgCtx.fillStyle = PALETTE.HILL_DARK; bgCtx.fillRect(x, hillY, hillStep, horizon - hillY + 20);
        const topLayerH = Math.floor((Math.sin(x*0.01)*10+10)/4)*4;
        if (topLayerH > 0) { bgCtx.fillStyle = PALETTE.HILL_MID; bgCtx.fillRect(x, hillY, hillStep, topLayerH); }
        if (Math.sin(x*0.002+0.5) > 0.5) { bgCtx.fillStyle = PALETTE.HILL_TOP; bgCtx.globalAlpha = 0.8; bgCtx.fillRect(x, hillY, hillStep, 4); bgCtx.globalAlpha = 1.0; }
    }
    
    bgCtx.fillStyle = PALETTE.GRASS_BASE; bgCtx.fillRect(0, horizon, w, h - horizon);
    
    const grid = 5; 
    for(let y = Math.floor(horizon); y < h; y += grid) {
        const rowOffset = (y % (grid * 3)) * 2;
        for(let x = -20; x < w; x += grid) {
             const val = (Math.sin( (x+rowOffset)*12.9898 + y*78.233 ) * 43758.5453) % 1; 
             if (val > 0.4) {
                 const tuftH = 4 + (val * 3.5); 
                 bgCtx.fillStyle = PALETTE.GRASS_TUFT; bgCtx.globalAlpha = 0.2 + (val * 0.3); 
                 bgCtx.fillRect(x+rowOffset, y - tuftH/2, 2, tuftH); bgCtx.globalAlpha = 1.0;
             }
        }
    }
  };

  const updatePhysics = (width: number, height: number) => {
    const d = dogRef.current;
    const currentState = dogStateRef.current; // Use Ref for Physics checks

    // --- FIREWORKS SEQUENCE UPDATE ---
    if (fireworkSeqRef.current.count > 0) {
        fireworkSeqRef.current.timer--;
        if (fireworkSeqRef.current.timer <= 0) {
            spawnFireworkWave(width, height);
            fireworkSeqRef.current.count--;
            fireworkSeqRef.current.timer = 30; // Reset timer for next wave (approx 0.5s at 60fps)
        }
    }
    
    // OPTIMIZATION: Reverse loop with splice for better GC than filter
    for (let i = heartsRef.current.length - 1; i >= 0; i--) {
        const h = heartsRef.current[i];
        h.y -= 1;
        h.life -= 0.015;
        if (h.life <= 0) {
            heartsRef.current.splice(i, 1);
        }
    }
    
    // --- VISUAL TIMER UPDATES (BUTTON PRESS) ---
    sceneToysRef.current.forEach(t => {
        if (t.pressedTimer && t.pressedTimer > 0) {
            t.pressedTimer--;
        }
    });

    // --- PETTING LOGIC ---
    if (interactionRef.current.current !== 'NONE') {
        d.pettingCounter++;
        // Emit hearts occasionally
        if (d.pettingCounter % 15 === 0) {
            heartsRef.current.push({ x: d.x + (Math.random()*40-20), y: d.y - 120, life: 1.0, id: Date.now() });
        }
        // Score every 1 second (approx 60 frames)
        if (d.pettingCounter >= 60) {
            setScore(prev => {
                if (prev >= 99999) return 99999;
                const next = Math.min(99999, prev + 1);
                // Firework logic: check if we crossed a multiple of 10
                if (Math.floor(next / 10) > Math.floor(prev / 10)) {
                    startFireworkShow();
                }
                return next;
            });
            d.pettingCounter = 0;
        }
    } else {
        d.pettingCounter = 0;
    }
    
    // --- HEARTS DURING PLAY (CATCHING) ---
    // Emit hearts when happy with toy
    if (currentState === DogState.CATCHING) {
        // playTimer counts down from 60 (1s)
        if (d.playTimer % 15 === 0) {
             heartsRef.current.push({ x: d.x + (Math.random()*40-20), y: d.y - 120, life: 1.0, id: Date.now() + Math.random() });
        }
    }

    // --- RESPONSIVE BOUNDARY CLAMPING ---
    // Ensure entities stay visible when window resizes (Critical for Browser Homepage usage)
    const horizon = height * DIMENSIONS.GROUND_HORIZON_Y_RATIO;
    const floorLimit = height - 20;

    // Clamp Dog Position
    // Allow entering from sides slightly (-100, width+100) but prevent getting lost
    if (d.x < -100) d.x = -100;
    if (d.x > width + 100) d.x = width + 100;
    
    // Clamp Dog Vertical (Must stay on grass area)
    if (d.y < horizon - 50) d.y = horizon - 50; 
    if (d.y > height + 50) d.y = height + 50;

    // Sanitize Target Position (In case resize moved it off-screen)
    d.targetX = clamp(d.targetX, 0, width);
    d.targetY = clamp(d.targetY, horizon, height);

    // Clamp Toys
    if (width > 300) {
        sceneToysRef.current.forEach(toy => {
            // Horizontal clamp (Keep well within screen)
            toy.x = clamp(toy.x, 30, width - 30);
            // Vertical clamp (Keep on grass)
            toy.y = clamp(toy.y, horizon + 20, floorLimit); 
        });
    }

    const moveDogTo = (tx: number, ty: number, speedMult: number = 1, tolerance: number = 2) => {
        const dx = tx - d.x; const dy = ty - d.y; const dist = Math.sqrt(dx*dx + dy*dy);
        if (Math.abs(dx) > 1) d.facingRight = dx > 0;
        if (dist > tolerance) {
            const speed = PHYSICS.DOG_SPEED * speedMult;
            if (dist < speed) {
               d.x = tx; d.y = ty; d.scaleY = 1; d.legFrame = 0; 
               return true; 
            }
            d.x += (dx / dist) * speed; d.y += (dy / dist) * speed * 0.7; 
            d.legFrame += 0.3 * speedMult; d.scaleY = 1; 
            return false;
        } else {
            d.x = tx; d.y = ty; d.scaleY = 1; d.legFrame = 0; 
            return true;
        }
    };

    switch (currentState) {
        case DogState.IDLE:
            d.scaleY = 1 + Math.sin(Date.now() / 400) * 0.03;
            
            // --- IDLE BEHAVIOR (Turn Around Every 5s) ---
            d.idleTimer++;
            if (d.idleTimer > 300) { // > 5 seconds (60fps * 5)
                d.facingRight = !d.facingRight; // Just flip
                d.idleTimer = 0; // Reset timer
            }
            break;
        case DogState.ZOOMIES:
            d.zoomiesTimer--;
            // Emit hearts constantly while running (Zoomies Love!)
            if (d.zoomiesTimer % 10 === 0) {
                heartsRef.current.push({ x: d.x, y: d.y - 60, life: 1.0, id: Math.random() });
            }

            if (d.zoomiesTimer > 0) {
                // RUN AROUND
                const distToT = Math.sqrt(Math.pow(d.x - d.targetX, 2) + Math.pow(d.y - d.targetY, 2));
                // If reached current target or very close, pick new random target
                if (distToT < 20) {
                     d.targetX = Math.random() * (width - 100) + 50;
                     d.targetY = Math.random() * (floorLimit - (horizon + 20)) + horizon + 20;
                }
                
                // REVERTED: Constant fast speed for ZOOMIES
                moveDogTo(d.targetX, d.targetY, 1.5, 5);

            } else {
                // RETURN HOME
                const distHome = Math.sqrt(Math.pow(d.x - d.initialX, 2) + Math.pow(d.y - d.initialY, 2));
                if (distHome < 10) {
                    // Success!
                    setScore(prev => {
                        if (prev >= 99999) return 99999;
                        const next = Math.min(99999, prev + 5);
                        // Firework logic
                        if (Math.floor(next / 10) > Math.floor(prev / 10)) {
                            startFireworkShow();
                        }
                        return next;
                    });
                    
                    // NEW: Celebrate with WOOF after Zoomies
                    setDogState(DogState.CELEBRATING);
                    d.barkTimer = 40; // ~0.7s display time
                    // Sound removed
                } else {
                    moveDogTo(d.initialX, d.initialY, 1.2, 5);
                }
            }
            break;
        case DogState.CHASING:
            const arrived = moveDogTo(d.targetX, d.targetY, 0.8, 2);
            if (arrived) {
                if (targetRef.current.type === 'TOY' && targetRef.current.id !== undefined) {
                    const toyIndex = sceneToysRef.current.findIndex(t => t.id === targetRef.current.id);
                    if (toyIndex !== -1) {
                        const toy = sceneToysRef.current[toyIndex];
                        // Cannot pick up the Button
                        if (toy.type === ToyType.BUTTON) {
                            setDogState(DogState.IDLE);
                        } else {
                            heldToyRef.current = toy;
                            sceneToysRef.current = sceneToysRef.current.filter(t => t.id !== toy.id);
                            // Transition to CATCHING (Happy Celebration) instead of Retrieving
                            d.playTimer = 60; // 1 second roughly
                            setDogState(DogState.CATCHING);
                        }
                    } else { setDogState(DogState.IDLE); }
                } else { setDogState(DogState.IDLE); }
            }
            break;
        case DogState.CATCHING:
            // Happy with toy
            d.playTimer--;
            if (d.playTimer <= 0) {
                setDogState(DogState.DROPPING);
                d.dropTimer = 0;
                hasDroppedRef.current = false;
            }
            break;
        case DogState.RETRIEVING:
            // kept for compatibility if needed, but not used in this flow
            d.playTimer--;
            if (d.playTimer <= 0) { setDogState(DogState.DROPPING); d.dropTimer = 0; hasDroppedRef.current = false; }
            break;
        case DogState.DROPPING:
            d.dropTimer += 0.03; 
            if (d.dropTimer >= 0.5 && !hasDroppedRef.current) {
                if (heldToyRef.current) {
                    let dropX = d.x + (d.facingRight ? 45 : -45);
                    // CLAMP Logic: Ensure toy stays within 50px margins
                    dropX = clamp(dropX, 50, width - 50);

                    const droppedToy = { ...heldToyRef.current, x: dropX, y: d.y + 10 };
                    sceneToysRef.current.push(droppedToy); 
                    heldToyRef.current = null;
                    hasDroppedRef.current = true;
                }
                
                // --- SCORE UPDATE WITH CAP & FIREWORKS ---
                setScore(prev => {
                    if (prev >= 99999) return 99999;
                    const next = Math.min(99999, prev + 5); // Updated to +5
                    // Trigger fireworks whenever we cross a multiple of 10
                    // Example: 8 -> 13 (crosses 10), 28 -> 33 (crosses 30)
                    if (Math.floor(next / 10) > Math.floor(prev / 10)) {
                        startFireworkShow();
                    }
                    return next;
                });
                
                // Sound removed
            }
            if (d.dropTimer >= 1.0) { setDogState(DogState.CELEBRATING); d.barkTimer = 40; /* Sound removed */ }
            break;
        case DogState.CELEBRATING:
            if (d.barkTimer <= 0) setDogState(DogState.IDLE);
            break;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    // Optimization: alpha: false usually gives a speed boost on Windows Chromium
    if (!canvas || !canvas.getContext('2d', { alpha: false })) return;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    ctx.imageSmoothingEnabled = false;
    let animId: number;
    
    const render = () => {
      try {
          const w = canvas.width; const h = canvas.height;
          // IMPORTANT: Convert physical dimensions back to LOGICAL dimensions for physics
          // This fixes the issue where high DPI screens would simulate physics in a larger world,
          // or where background would look zoomed in if drawn with physical dimensions.
          const logicalW = w / dprRef.current;
          const logicalH = h / dprRef.current;
          
          updatePhysics(logicalW, logicalH);
          
          // Clear logical area
          ctx.clearRect(0, 0, logicalW, logicalH);
          
          // Draw Static Background from Offscreen Canvas
          // Check if background needs regen (e.g. if window resized)
          if (bgCanvasRef.current.width !== Math.floor(logicalW) && bgCanvasRef.current.width !== Math.ceil(logicalW)) {
             // Fallback regen if sizes desync
             renderBackgroundToOffscreen(logicalW, logicalH);
          }
          
          // Draw background to fill the logical screen
          // Since ctx is scaled, drawing a logical-sized image at 0,0 fills the screen correctly.
          // imageSmoothingEnabled=false ensures the low-res pixel art background looks crisp when upscaled by dpr.
          ctx.drawImage(bgCanvasRef.current, 0, 0, logicalW, logicalH);
          
          drawFireworks(ctx);
          drawSceneToys(ctx, DIMENSIONS.DOG_SIZE);
          drawDog(ctx, dogRef.current.x, dogRef.current.y, DIMENSIONS.DOG_SIZE);
          drawHearts(ctx, DIMENSIONS.DOG_SIZE);
      } catch (err) {
          console.error("Render loop error:", err);
      }
      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
    // OPTIMIZATION: Dependency array is empty. The loop runs independently of React renders.
    // It reads fresh state from dogStateRef.
  }, []); 

  // -- Input Handlers --
  useEffect(() => {
    const handleResize = () => {
        if(canvasRef.current) {
            // OPTIMIZATION: High DPI Cap
            // Windows screens often have fractional scaling (1.25, 1.5).
            // Limiting the DPR max to 2 prevents creating massive textures.
            const dpr = Math.min(window.devicePixelRatio || 1, 2); 
            dprRef.current = dpr;
            
            const w = window.innerWidth;
            const h = window.innerHeight;
            
            // Set logic size (physical pixels)
            canvasRef.current.width = w * dpr;
            canvasRef.current.height = h * dpr;
            
            // Scale context to match LOGICAL coordinates
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);
            
            // Update cached rect for input events
            if (containerRef.current) {
                canvasRectRef.current = containerRef.current.getBoundingClientRect();
            }

            // SCALE LOGIC: If we have a previous size, scale entities
            if (prevSizeRef.current && prevSizeRef.current.w > 0 && prevSizeRef.current.h > 0) {
                const ratioX = w / prevSizeRef.current.w;
                const ratioY = h / prevSizeRef.current.h;
                
                // Scale Dog
                dogRef.current.x *= ratioX;
                dogRef.current.y *= ratioY;
                dogRef.current.initialX *= ratioX;
                dogRef.current.initialY *= ratioY;
                dogRef.current.targetX *= ratioX;
                dogRef.current.targetY *= ratioY;
                
                // Scale Toys
                sceneToysRef.current.forEach(toy => {
                    toy.x *= ratioX;
                    toy.y *= ratioY;
                });
                
                // Scale Held Toy
                if (heldToyRef.current) {
                    heldToyRef.current.x *= ratioX;
                    heldToyRef.current.y *= ratioY;
                }
            }
            
            // Update Previous Size
            prevSizeRef.current = { w, h };
            
            // Re-render static background on resize at LOGICAL size
            // This maintains the "big pixel" look and ensures correct coverage
            renderBackgroundToOffscreen(w, h);
            
            // --- TOY INITIALIZATION (Only if empty) ---
            const horizon = h * DIMENSIONS.GROUND_HORIZON_Y_RATIO;
            
            // Setup Dog Home
            if (!initializedRef.current) {
                dogRef.current.x = 100; // Left
                dogRef.current.y = window.innerHeight - 150; // Bottom-ish
                dogRef.current.initialX = 100;
                dogRef.current.initialY = window.innerHeight - 150;
                dogRef.current.facingRight = true;
                initializedRef.current = true;
            }

            // Generate Toys if empty
            if (sceneToysRef.current.length === 0) {
                 const allTypes = [ToyType.BALL, ToyType.FRISBEE, ToyType.BONE, ToyType.CARROT, ToyType.BELL, ToyType.BEE];
                 const rand = (min: number, max: number) => Math.random() * (max - min) + min;
                 
                 const shuffledTypes = [...allTypes].sort(() => Math.random() - 0.5);

                 // Layout: 6 Zones
                 const toys = shuffledTypes.map((type, i) => {
                    const grassTop = horizon + 40;
                    const grassBottom = h - 40;
                    const grassH = grassBottom - grassTop;
                    const rowH = grassH / 2;
                    
                    const pw = (pct: number) => w * pct;
                    
                    let minX, maxX, minY, maxY;
                    
                    switch(i) {
                        case 0: minX = pw(0.05); maxX = pw(0.25); minY = grassTop; maxY = grassTop + rowH; break;
                        case 1: minX = pw(0.05); maxX = pw(0.25); minY = grassTop + rowH; maxY = grassBottom; break;
                        case 2: minX = pw(0.75); maxX = pw(0.95); minY = grassTop; maxY = grassTop + rowH; break;
                        case 3: minX = pw(0.75); maxX = pw(0.95); minY = grassTop + rowH; maxY = grassBottom; break;
                        case 4: minX = pw(0.25); maxX = pw(0.50); minY = grassTop + rowH * 0.5; maxY = grassBottom; break;
                        case 5: minX = pw(0.50); maxX = pw(0.75); minY = grassTop + rowH * 0.5; maxY = grassBottom; break;
                        default: minX = 50; maxX = w-50; minY = grassTop; maxY = grassBottom;
                    }
                    const pad = 15;
                    if (maxX < minX + pad) maxX = minX + pad + 1;
                    if (maxY < minY + pad) maxY = minY + pad + 1;

                    return {
                        id: i,
                        x: rand(minX + pad, maxX - pad),
                        y: rand(minY + pad, maxY - pad),
                        type
                    };
                 });
                 sceneToysRef.current = toys;
            }

            // --- ADD 'PLAY' BUTTON TOY ---
            // Only add if it doesn't exist (to prevent dupes on resize, though we filter above)
            // Note: We don't remove and re-add on resize anymore to preserve scale position, 
            // unless it's initialization.
            if (!sceneToysRef.current.some(t => t.type === ToyType.BUTTON)) {
                sceneToysRef.current.push({
                    id: 999,
                    x: 60,
                    y: dogRef.current.initialY + 60,
                    type: ToyType.BUTTON
                });
            }
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Run once to setup resize listener

  const onPointerDown = (e: React.PointerEvent) => {
      // Prevent browser default drag behavior which changes cursor
      e.preventDefault();

      const rect = canvasRectRef.current; // Use Cached Rect
      if (!rect) return;
      const clickX = e.clientX - rect.left; const clickY = e.clientY - rect.top;
      const horizon = window.innerHeight * DIMENSIONS.GROUND_HORIZON_Y_RATIO;

      if (clickY > horizon) {
          // *** Drop current toy if interrupted ***
          if (heldToyRef.current) {
              const w = window.innerWidth; 
              let dropX = dogRef.current.x + (dogRef.current.facingRight ? 20 : -20);
              dropX = clamp(dropX, 50, w - 50);

              const droppedToy = { ...heldToyRef.current, x: dropX, y: dogRef.current.y + 20 };
              sceneToysRef.current.push(droppedToy);
              heldToyRef.current = null;
              hasDroppedRef.current = false; 
          }

          let clickedToy = null;
          for (const toy of sceneToysRef.current) {
              const dx = clickX - toy.x; const dy = clickY - toy.y;
              if (Math.sqrt(dx*dx + dy*dy) < 50) { clickedToy = toy; break; }
          }
          
          if (clickedToy && clickedToy.type === ToyType.BUTTON) {
              // CLICKED PLAY BUTTON -> ZOOMIES
              // 1. Trigger Animation
              clickedToy.pressedTimer = 10; // ~160ms animation

              // 2. Set State
              setDogState(DogState.ZOOMIES);
              dogRef.current.zoomiesTimer = 300; // 5 seconds * 60fps
              
              // REVERTED: Remove acceleration init
              // dogRef.current.currentSpeed = 0.5; 
              
              dogRef.current.targetX = Math.random() * (window.innerWidth - 100) + 50;
              dogRef.current.targetY = Math.random() * (window.innerHeight - horizon - 40) + horizon + 20;
              // Sound removed
          } else if (clickedToy) {
              // Fetch normal toy
              dogRef.current.targetX = clickedToy.x; dogRef.current.targetY = clickedToy.y;
              targetRef.current = { type: 'TOY', id: clickedToy.id };
              setDogState(DogState.CHASING);
          } else {
              // Go to ground
              dogRef.current.targetX = clickX; dogRef.current.targetY = clickY;
              targetRef.current = { type: 'GROUND' };
              setDogState(DogState.CHASING);
          }
      }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = canvasRectRef.current; // Use Cached Rect
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 1. Check Toy Hover
    let foundHover = null;
    // Check toys
    for (const toy of sceneToysRef.current) {
         const dx = x - toy.x;
         const dy = y - toy.y;
         // Hit radius 50 to match onPointerDown logic
         if (Math.sqrt(dx*dx + dy*dy) < 50) {
             foundHover = toy.id;
             break; 
         }
    }
    hoveredToyIdRef.current = foundHover;

    if (dogState === DogState.IDLE) {
        const d = dogRef.current;
        const scale = DIMENSIONS.DOG_SIZE;
        const microScale = scale / 6; 
        
        // Use calculated x/y relative to container
        const dx = x - d.x; 
        const dy = y - d.y;
        
        const facing = d.facingRight ? 1 : -1;
        const lx = (dx / facing) / microScale; const ly = dy / microScale;

        let detected: InteractionType = 'NONE';
        if (lx >= -20 && lx <= 36 && ly >= -120 && ly <= -60) {
             if (ly < -100) detected = (lx<0)?'EAR_L':((lx>16)?'EAR_R':'HEAD'); else detected = 'HEAD';
        } else if (lx >= -60 && lx <= -20 && ly >= -40 && ly <= 50) detected = 'BACK';
        interactionRef.current.current = (Math.sqrt(dx*dx + dy*dy) > 150) ? 'NONE' : detected;
    } else {
        interactionRef.current.current = 'NONE';
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-pointer" onPointerDown={onPointerDown} onPointerMove={onPointerMove}>
      <canvas ref={canvasRef} className="block w-full h-full touch-none" style={{ width: '100%', height: '100%' }} />
    </div>
  );
};