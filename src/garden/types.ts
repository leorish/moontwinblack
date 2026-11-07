/**
 * Data structures and types for the Garden of Black Roses.
 */

export interface PetalLayer {
  petalIndex: number;
  angleOffset: number; // Rotational offset around center
  rx: number;          // Radius X (scale-independent relative size)
  ry: number;          // Radius Y
  curlFactor: number;  // Outer petal curl outward amount
  overlapOffset: number;
}

export interface Sparkle {
  id: number;
  roseId: number;
  relX: number;       // relative X on flower head
  relY: number;       // relative Y on flower head
  period: number;     // 2 - 4s
  phase: number;
  baseSize: number;
}

export interface RoseData {
  id: number;
  layer: number;       // 0: back, 1: mid, 2: front
  isWine: boolean;     // 10-15% deep wine / dark crimson variant
  flowerKind: 'blackRose' | 'wineRose' | 'sunflower' | 'scarletRose';
  
  // Base root position (anchored along bottom)
  rootX: number;
  rootY: number;

  // Tip target position (flower head)
  tipX: number;
  tipY: number;

  // Bezier stem control point
  cpX: number;
  cpY: number;

  // Staggered timing delays (seconds)
  stemStartDelay: number;
  stemDuration: number;
  budStartDelay: number;
  bloomStartDelay: number;
  bloomDuration: number;

  // Physical attributes
  scale: number;
  baseAngle: number;
  phase: number;       // Sine wave phase for wind sway
  stemWidth: number;
  opacity: number;
  spriteIndex: number; // Index into pre-rendered cached sprites

  // Pointer spring deflection
  pointerDeflection: number;
  pointerVelocity: number;

  // Leaves along stem
  leaves: Array<{
    t: number;         // Parameter along bezier [0, 1]
    side: 1 | -1;      // Left or Right
    length: number;
    angle: number;
  }>;

  // Layers of petals
  petalLayers: PetalLayer[];
}

export interface GrassBlade {
  startX: number;
  startY: number;
  height: number;
  curve: number;
  phase: number;
  width: number;
  color: string;
}

export interface Particle {
  x: number;
  y: number;
  size: number;
  vx: number;
  vy: number;
  phase: number;
  twinkleSpeed: number;
  color: string;
  alpha: number;
}

export interface EmberParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  baseSize: number;
  vx: number;
  vy: number;
  swayFreq: number;
  swayAmp: number;
  phase: number;
  alpha: number;
  maxAlpha: number;
  glowRadius: number;
  colorCore: string;
  colorGlow: string;
  life: number;
  maxLife: number;
}

export interface FallingPetal {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  scale: number;
  opacity: number;
  isWine: boolean;
  curl: number;
}

export type Hemisphere = 'north' | 'south';

export type MoonPhase =
  | 'new'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent';

export interface MoonState {
  currentPhase: MoonPhase;
  targetPhase: MoonPhase;
  transitionProgress: number; // 0 to 1
  illumination: number;       // 0 to 1 (full = 1.0, new = 0.05)
  isAuto: boolean;
  autoTimer: number;
  driftX: number;
  driftY: number;
  breatheAlpha: number;
  hemisphere: Hemisphere;     // 'north' = 'D' shape (right side lit), 'south' = 'C' shape (left side lit)
}

export interface WindGustState {
  active: boolean;
  startTime: number;
  duration: number;
  nextGustTime: number;
  direction: 1 | -1;
  peakStrengthDeg: number;
  waveSpeed: number;
}

export interface GardenParams {
  to: string;
  count?: number;
  customMessage?: string;
  autostart?: boolean;
  moon?: MoonPhase | 'auto';
  hemisphere?: Hemisphere;
}
