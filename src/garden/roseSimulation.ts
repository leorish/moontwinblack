/**
 * Pure simulation logic and calculations for the Garden of Black Roses.
 * Decoupled from canvas/DOM for deterministic testing and peak performance.
 */

import { GARDEN_CONFIG } from './config';
import {
  EmberParticle,
  GardenParams,
  GrassBlade,
  Hemisphere,
  MoonPhase,
  MoonState,
  Particle,
  PetalLayer,
  RoseData,
  Sparkle,
  WindGustState,
} from './types';

export const ALL_MOON_PHASES: MoonPhase[] = [
  'new',
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
  'full',
  'waning-gibbous',
  'last-quarter',
  'waning-crescent',
];

export function normalizeMoonPhase(input: string | null | undefined): MoonPhase | 'auto' {
  if (!input) return 'waxing-crescent';
  const clean = input.toLowerCase().trim();
  if (clean === 'auto') return 'auto';
  if (clean === 'new') return 'new';
  if (clean === 'crescent' || clean === 'waxing-crescent') return 'waxing-crescent';
  if (clean === 'quarter' || clean === 'first-quarter') return 'first-quarter';
  if (clean === 'gibbous' || clean === 'waxing-gibbous') return 'waxing-gibbous';
  if (clean === 'full') return 'full';
  if (clean === 'waning-gibbous') return 'waning-gibbous';
  if (clean === 'last-quarter') return 'last-quarter';
  if (clean === 'waning-crescent') return 'waning-crescent';
  return 'waxing-crescent';
}

/**
 * Linear congruential generator for deterministic pseudo-random sequences when needed
 */
export function createPRNG(seed: number = 1337) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Parses URL query parameters with robust fallbacks
 */
export function parseGardenParams(searchString: string): GardenParams {
  const params = new URLSearchParams(searchString.startsWith('?') ? searchString.slice(1) : searchString);
  
  const toParam = params.get('to');
  const countParam = params.get('count');
  const messageParam = params.get('message');
  const autostartParam = params.get('autostart');
  const moonParam = params.get('moon');
  const hemisphereParam = params.get('hemisphere');

  let count: number = GARDEN_CONFIG.defaults.count;
  if (countParam) {
    const parsed = parseInt(countParam, 10);
    if (!isNaN(parsed) && parsed > 0) {
      count = Math.max(
        GARDEN_CONFIG.roses.minCount,
        Math.min(GARDEN_CONFIG.roses.maxCount, parsed)
      );
    }
  }

  const to = toParam && toParam.trim().length > 0 ? toParam.trim() : GARDEN_CONFIG.defaults.to;
  const customMessage = messageParam && messageParam.trim().length > 0 ? messageParam.trim() : undefined;
  const autostart = autostartParam === '1' || autostartParam === 'true';
  const moon = normalizeMoonPhase(moonParam);
  const hemisphere: Hemisphere = hemisphereParam?.toLowerCase() === 'south' ? 'south' : 'north';

  return {
    to,
    count,
    customMessage,
    autostart,
    moon,
    hemisphere,
  };
}

/**
 * Easing: easeOutCubic for natural floral organic growth without abrupt jumps
 */
export function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
}

/**
 * Easing: easeInOutSine for gentle breathing glow and natural wind sway
 */
export function easeInOutSine(x: number): number {
  return (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, x)))) / 2;
}

/**
 * Quadratic bezier point calculation
 */
export function getBezierPoint(
  t: number,
  p0: number,
  p1: number,
  p2: number
): number {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

/**
 * Quadratic bezier tangent vector calculation
 */
export function getBezierTangent(
  t: number,
  p0: number,
  p1: number,
  p2: number
): number {
  return 2 * (1 - t) * (p1 - p0) + 2 * t * (p2 - p1);
}

/**
 * Calculates current growth status for a rose based on elapsed simulation time
 */
export function getGrowthState(
  elapsedTime: number,
  rose: RoseData,
  prefersReducedMotion: boolean = false
) {
  if (prefersReducedMotion) {
    return {
      stemProgress: 1,
      budScale: 1,
      bloomProgress: 1,
      isFullyBloomed: true,
    };
  }

  // Phase 1: Stem Growth (0 to ~2s staggered)
  const stemTime = Math.max(0, elapsedTime - rose.stemStartDelay);
  const rawStemProgress = Math.min(1, stemTime / rose.stemDuration);
  const stemProgress = easeOutCubic(rawStemProgress);

  // Phase 2: Bud scaling up at stem tip (1.5 to ~3s)
  const budTime = Math.max(0, elapsedTime - rose.budStartDelay);
  const rawBudProgress = Math.min(1, budTime / GARDEN_CONFIG.timing.budScaleDuration);
  const budScale = easeOutCubic(rawBudProgress);

  // Phase 3: Blooming into black rose (2.5 to ~5s staggered)
  const bloomTime = Math.max(0, elapsedTime - rose.bloomStartDelay);
  const rawBloomProgress = Math.min(1, bloomTime / rose.bloomDuration);
  const bloomProgress = easeOutCubic(rawBloomProgress);

  return {
    stemProgress,
    budScale,
    bloomProgress,
    isFullyBloomed: rawBloomProgress >= 1.0,
  };
}

/**
 * Generates layered petal geometry configurations (5-7 overlapping petals)
 */
export function createPetalLayers(rng: () => number): PetalLayer[] {
  const layerCount = 6 + (rng() > 0.5 ? 1 : 0);
  const layers: PetalLayer[] = [];

  for (let i = 0; i < layerCount; i++) {
    const normalizedIndex = i / (layerCount - 1); // 0 = outer, 1 = inner
    const angleOffset = i * 2.39996 + (rng() * 0.4 - 0.2);
    const baseRadius = 26;
    const rx = baseRadius * (1 - normalizedIndex * 0.58) * (0.9 + rng() * 0.2);
    const ry = (baseRadius * 0.72) * (1 - normalizedIndex * 0.55) * (0.9 + rng() * 0.2);
    const curlFactor = (1 - normalizedIndex) * (0.35 + rng() * 0.2);
    const overlapOffset = rng() * 0.2;

    layers.push({
      petalIndex: i,
      angleOffset,
      rx,
      ry,
      curlFactor,
      overlapOffset,
    });
  }

  return layers;
}

/**
 * Generates the full field of roses with 3 depth layers and staggered delays
 */
export function generateRoses(
  targetCount: number | undefined,
  width: number,
  height: number,
  seed: number = 42
): RoseData[] {
  const isMobile = width < 768 || width < height;
  const count = targetCount !== undefined
    ? targetCount
    : GARDEN_CONFIG.defaults.count;

  const rng = createPRNG(seed);
  const roses: RoseData[] = [];
  const depthLayerConfigs = GARDEN_CONFIG.roses.depthLayers;

  // Calculate rose counts per depth layer
  const countsPerLayer = depthLayerConfigs.map(layer => 
    Math.max(2, Math.round(count * layer.countRatio))
  );

  let allocated = countsPerLayer.reduce((a, b) => a + b, 0);
  while (allocated < count) {
    countsPerLayer[1]++; // Add to mid layer
    allocated++;
  }
  while (allocated > count && countsPerLayer[1] > 2) {
    countsPerLayer[1]--;
    allocated--;
  }

  let idCounter = 0;

  depthLayerConfigs.forEach((layerCfg, layerIndex) => {
    const layerCount = countsPerLayer[layerIndex];
    
    for (let i = 0; i < layerCount; i++) {
      idCounter++;
      // 10-15% chance of deep wine / dark crimson rose (#2a0610)
      const isWine = rng() < GARDEN_CONFIG.roses.wineRoseRatio;

      // Distribute evenly across horizontal width with natural jitter
      const horizontalSlice = width / layerCount;
      const xJitter = (rng() - 0.5) * horizontalSlice * 0.85;
      const tipX = Math.max(25, Math.min(width - 25, (i + 0.5) * horizontalSlice + xJitter));

      // Height distribution based on depth layer and mobile/PC portrait/landscape
      const yRatios = isMobile ? layerCfg.yPositionRatioMobile : layerCfg.yPositionRatioPC;
      const [minYRatio, maxYRatio] = yRatios;
      const targetYRatio = minYRatio + rng() * (maxYRatio - minYRatio);
      const tipY = height * targetYRatio;

      // Root anchors along bottom edge with slight organic spread
      const rootX = tipX + (rng() - 0.5) * (width * 0.12);
      const rootY = height + 10 + rng() * 15;

      // Bezier control point for organic natural stem curve
      const stemHeight = rootY - tipY;
      const curveDir = rng() > 0.5 ? 1 : -1;
      const curveAmount = (25 + rng() * 50) * curveDir;
      const cpX = (rootX + tipX) / 2 + curveAmount;
      const cpY = tipY + stemHeight * (0.45 + rng() * 0.2);

      // Scale variation
      const scaleRange = isMobile ? layerCfg.scaleRangeMobile : layerCfg.scaleRangePC;
      const [minScale, maxScale] = scaleRange;
      const scale = minScale + rng() * (maxScale - minScale);

      // Staggered timing for realistic phase transitions
      const stemStartDelay = rng() * 0.85;
      const stemDuration = 1.0 + rng() * 0.8;
      const budStartDelay = stemStartDelay + stemDuration * 0.75;
      const bloomStartDelay = 2.2 + rng() * 1.6;
      const bloomDuration = 1.1 + rng() * 0.7;

      // Small pointed leaves along stem
      const leafCount = 2 + Math.floor(rng() * 3);
      const leaves: RoseData['leaves'] = [];
      for (let l = 0; l < leafCount; l++) {
        leaves.push({
          t: 0.25 + (l / (leafCount + 1)) * 0.55 + (rng() - 0.5) * 0.08,
          side: l % 2 === 0 ? 1 : -1,
          length: (12 + rng() * 10) * scale,
          angle: (0.35 + rng() * 0.35) * (l % 2 === 0 ? 1 : -1),
        });
      }

      // Sprite index for cached offscreen sprite rendering
      // e.g. layer 0, 1, 2 x wine / black
      const spriteIndex = (layerIndex * 2) + (isWine ? 1 : 0);
      const flowerKind = isWine ? 'wineRose' : 'blackRose';

      roses.push({
        id: idCounter,
        layer: layerIndex,
        isWine,
        flowerKind,
        rootX,
        rootY,
        tipX,
        tipY,
        cpX,
        cpY,
        stemStartDelay,
        stemDuration,
        budStartDelay,
        bloomStartDelay,
        bloomDuration,
        scale,
        baseAngle: (rng() - 0.5) * 0.15,
        phase: rng() * Math.PI * 2,
        stemWidth: layerCfg.stemWidth * (0.85 + rng() * 0.3),
        opacity: layerCfg.opacity,
        spriteIndex,
        pointerDeflection: 0,
        pointerVelocity: 0,
        leaves,
        petalLayers: createPetalLayers(rng),
      });
    }
  });

  // Add exactly ONE SUNFLOWER prominently featured in the front-mid row
  idCounter++;
  const sfTipX = width * 0.36 + (rng() - 0.5) * (width * 0.08);
  const sfTipY = height * (isMobile ? 0.72 : 0.74);
  const sfRootX = sfTipX + (rng() - 0.5) * 20;
  const sfRootY = height + 10;
  const sfCpX = (sfRootX + sfTipX) / 2 + 30;
  const sfCpY = sfTipY + (sfRootY - sfTipY) * 0.5;
  const sfScale = (isMobile ? 1.25 : 1.38);

  const sfLeaves: RoseData['leaves'] = [
    { t: 0.35, side: -1, length: 24 * sfScale, angle: -0.45 },
    { t: 0.60, side: 1, length: 26 * sfScale, angle: 0.45 },
  ];

  roses.push({
    id: idCounter,
    layer: 2, // Front layer for prominent visibility
    isWine: false,
    flowerKind: 'sunflower',
    rootX: sfRootX,
    rootY: sfRootY,
    tipX: sfTipX,
    tipY: sfTipY,
    cpX: sfCpX,
    cpY: sfCpY,
    stemStartDelay: 0.25,
    stemDuration: 1.5,
    budStartDelay: 1.8,
    bloomStartDelay: 2.8,
    bloomDuration: 1.4,
    scale: sfScale,
    baseAngle: 0.04,
    phase: rng() * Math.PI * 2,
    stemWidth: 3.5,
    opacity: 1.0,
    spriteIndex: 6, // Dedicated Sunflower Sprite
    pointerDeflection: 0,
    pointerVelocity: 0,
    leaves: sfLeaves,
    petalLayers: createPetalLayers(rng),
  });

  // Add exactly ONE SPECIAL ROSE (Radiant Scarlet Rose) alongside the black roses
  idCounter++;
  const srTipX = width * 0.64 + (rng() - 0.5) * (width * 0.08);
  const srTipY = height * (isMobile ? 0.78 : 0.80);
  const srRootX = srTipX + (rng() - 0.5) * 20;
  const srRootY = height + 10;
  const srCpX = (srRootX + srTipX) / 2 - 25;
  const srCpY = srTipY + (srRootY - srTipY) * 0.5;
  const srScale = (isMobile ? 1.20 : 1.32);

  const srLeaves: RoseData['leaves'] = [
    { t: 0.38, side: 1, length: 22 * srScale, angle: 0.4 },
    { t: 0.65, side: -1, length: 25 * srScale, angle: -0.4 },
  ];

  roses.push({
    id: idCounter,
    layer: 2, // Front layer
    isWine: false,
    flowerKind: 'scarletRose',
    rootX: srRootX,
    rootY: srRootY,
    tipX: srTipX,
    tipY: srTipY,
    cpX: srCpX,
    cpY: srCpY,
    stemStartDelay: 0.35,
    stemDuration: 1.5,
    budStartDelay: 1.9,
    bloomStartDelay: 2.9,
    bloomDuration: 1.4,
    scale: srScale,
    baseAngle: -0.05,
    phase: rng() * Math.PI * 2,
    stemWidth: 3.2,
    opacity: 1.0,
    spriteIndex: 7, // Dedicated Scarlet Rose Sprite
    pointerDeflection: 0,
    pointerVelocity: 0,
    leaves: srLeaves,
    petalLayers: createPetalLayers(rng),
  });

  // Sort by layer order (0: back, 1: mid, 2: front)
  roses.sort((a, b) => a.layer - b.layer || a.tipY - b.tipY);

  return roses;
}

/**
 * Generates sparkles attached specifically to front-row roses (15-25 sparkles)
 */
export function generateSparkles(roses: RoseData[], seed: number = 777): Sparkle[] {
  const rng = createPRNG(seed);
  const frontRoses = roses.filter(r => r.layer === 2);
  if (frontRoses.length === 0) return [];

  const sparkles: Sparkle[] = [];
  const sparkleCount = GARDEN_CONFIG.sparkles.count;

  for (let i = 0; i < sparkleCount; i++) {
    const rose = frontRoses[Math.floor(rng() * frontRoses.length)];
    const angle = rng() * Math.PI * 2;
    const dist = (rng() * 18 + 4) * rose.scale;

    sparkles.push({
      id: i,
      roseId: rose.id,
      relX: Math.cos(angle) * dist,
      relY: Math.sin(angle) * dist - 8 * rose.scale,
      period: GARDEN_CONFIG.sparkles.minPeriod + rng() * (GARDEN_CONFIG.sparkles.maxPeriod - GARDEN_CONFIG.sparkles.minPeriod),
      phase: rng() * Math.PI * 2,
      baseSize: 3 + rng() * 3, // 3 - 6px star
    });
  }

  return sparkles;
}

/**
 * Generates floating particles (embers/fireflies)
 */
export function generateParticles(count: number, width: number, height: number): Particle[] {
  const rng = createPRNG(999);
  const particles: Particle[] = [];
  const emberColors = GARDEN_CONFIG.colors.embers;

  for (let i = 0; i < count; i++) {
    particles.push({
      x: rng() * width,
      y: rng() * height,
      size: 1 + rng() * 2.0, // 1 - 3px
      vx: (rng() - 0.5) * 0.35,
      vy: -(0.35 + rng() * 0.65),
      phase: rng() * Math.PI * 2,
      twinkleSpeed: 1.2 + rng() * 2.0,
      color: emberColors[Math.floor(rng() * emberColors.length)],
      alpha: 0.3 + rng() * 0.7,
    });
  }

  return particles;
}

/**
 * Generates grounding grass blades along bottom
 */
export function generateGrass(count: number, width: number, height: number): GrassBlade[] {
  const rng = createPRNG(456);
  const grass: GrassBlade[] = [];
  const greens = [
    GARDEN_CONFIG.colors.stems.deepGreen,
    GARDEN_CONFIG.colors.stems.midGreen,
    GARDEN_CONFIG.colors.stems.lightGreen,
  ];

  for (let i = 0; i < count; i++) {
    grass.push({
      startX: rng() * width,
      startY: height + 2,
      height: 30 + rng() * 70,
      curve: (rng() - 0.5) * 25,
      phase: rng() * Math.PI * 2,
      width: 1.2 + rng() * 1.6,
      color: greens[Math.floor(rng() * greens.length)],
    });
  }

  return grass;
}

/**
 * Computes wind deflection angle and offset for stems and roses using easeInOutSine
 */
export function computeWindOffset(
  timeSeconds: number,
  rosePhase: number,
  windAmplitudeDeg: number = GARDEN_CONFIG.wind.baseAmplitudeDeg
) {
  const globalWind = Math.sin(timeSeconds * GARDEN_CONFIG.wind.baseFrequency);
  const individualSway = Math.sin(timeSeconds * 1.1 + rosePhase);
  
  const angleRad = ((globalWind * 0.65 + individualSway * 0.35) * windAmplitudeDeg * Math.PI) / 180;
  
  return {
    angleRad,
    dx: Math.sin(angleRad) * 22,
    dy: (1 - Math.cos(angleRad)) * 8,
  };
}

/**
 * Breathing deep-red candle glow intensity over 6 seconds between 85% and 100%
 */
export function computeCandleBreathingIntensity(timeSeconds: number): number {
  const cfg = GARDEN_CONFIG.colors.candleDeepRedGlow;
  // Normalized 0 to 1 cycle
  const rawSine = (Math.sin((timeSeconds * Math.PI * 2) / cfg.breathPeriod) + 1) * 0.5;
  const eased = easeInOutSine(rawSine);
  return cfg.minBreath + (cfg.maxBreath - cfg.minBreath) * eased;
}

/**
 * Updates pointer spring deflection for responsive lean away from mouse or touch
 */
export function updatePointerSprings(
  roses: RoseData[],
  pointerX: number | null,
  pointerY: number | null,
  dt: number
) {
  const radius = GARDEN_CONFIG.pointer.radius;
  const maxPush = GARDEN_CONFIG.pointer.maxPushAngle;
  const spring = GARDEN_CONFIG.pointer.spring;
  const damping = GARDEN_CONFIG.pointer.damping;
  // dt normalized to ~60fps step
  const dtFactor = Math.min(2.5, dt / 0.016);

  for (let i = 0; i < roses.length; i++) {
    const rose = roses[i];
    let targetAngle = 0;

    if (pointerX !== null && pointerY !== null) {
      const dx = rose.tipX - pointerX;
      const dy = rose.tipY - pointerY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radius * radius && distSq > 1) {
        const dist = Math.sqrt(distSq);
        const factor = (1 - dist / radius);
        // Push away horizontally
        const pushSign = dx >= 0 ? 1 : -1;
        targetAngle = pushSign * maxPush * factor;
      }
    }

    // Spring physics update
    const displacement = targetAngle - rose.pointerDeflection;
    rose.pointerVelocity += displacement * spring * dtFactor;
    rose.pointerVelocity *= Math.pow(damping, dtFactor);
    rose.pointerDeflection += rose.pointerVelocity * dtFactor;
  }
}

/**
 * Generates glowing 'ember' particles that drift sporadically from the bottom of the canvas,
 * adding to the gothic candlelit atmosphere.
 */
export function generateEmberParticles(
  count: number = GARDEN_CONFIG.embers.count,
  width: number,
  height: number,
  seed: number = 888
): EmberParticle[] {
  const rng = createPRNG(seed);
  const embers: EmberParticle[] = [];

  const coreTones = [
    'rgba(255, 240, 200, ', // Pale golden white core
    'rgba(255, 215, 150, ', // Amber golden core
    'rgba(255, 185, 120, ', // Warm fiery core
  ];

  const glowTones = [
    'rgba(230, 45, 20, ',   // Crimson flame halo
    'rgba(255, 80, 25, ',   // Vibrant ember orange-red
    'rgba(180, 20, 35, ',   // Deep gothic wine/ruby
  ];

  for (let i = 0; i < count; i++) {
    const baseSize =
      GARDEN_CONFIG.embers.minSize +
      rng() * (GARDEN_CONFIG.embers.maxSize - GARDEN_CONFIG.embers.minSize);
    const maxLife = 5.0 + rng() * 6.5; // 5 - 11.5 seconds lifespan
    // Stagger initial progress so particles are immediately organically present
    const initialLife = rng() * maxLife;
    const initialY = height - (initialLife / maxLife) * (height * 0.95);

    embers.push({
      id: i,
      x: rng() * width,
      y: initialY,
      size: baseSize,
      baseSize,
      vx: (rng() - 0.5) * 0.45,
      vy:
        GARDEN_CONFIG.embers.minVy +
        rng() * (GARDEN_CONFIG.embers.maxVy - GARDEN_CONFIG.embers.minVy),
      swayFreq: 0.8 + rng() * 1.6,
      swayAmp: 0.4 + rng() * 0.9,
      phase: rng() * Math.PI * 2,
      alpha: 0,
      maxAlpha: 0.65 + rng() * 0.35,
      glowRadius:
        GARDEN_CONFIG.embers.minGlow +
        rng() * (GARDEN_CONFIG.embers.maxGlow - GARDEN_CONFIG.embers.minGlow),
      colorCore: coreTones[Math.floor(rng() * coreTones.length)],
      colorGlow: glowTones[Math.floor(rng() * glowTones.length)],
      life: initialLife,
      maxLife,
    });
  }

  return embers;
}

/**
 * Updates positions, turbulence, lifecycle, and respawning of glowing embers
 */
export function updateEmberParticles(
  embers: EmberParticle[],
  width: number,
  height: number,
  dt: number,
  simTime: number
) {
  for (let i = 0; i < embers.length; i++) {
    const e = embers[i];
    e.life += dt;

    if (e.life >= e.maxLife || e.y < -30) {
      // Sporadically respawn from the bottom (clustering towards the bottom candle glow area)
      e.life = 0;
      e.maxLife = 5.0 + Math.random() * 6.5;
      e.y = height + 5 + Math.random() * 20;
      // 60% chance to spawn near the bottom center warm candle glow
      if (Math.random() < 0.6) {
        e.x = width * 0.5 + (Math.random() - 0.5) * (width * 0.5);
      } else {
        e.x = Math.random() * width;
      }
      e.vx = (Math.random() - 0.5) * 0.5;
      e.vy =
        GARDEN_CONFIG.embers.minVy +
        Math.random() * (GARDEN_CONFIG.embers.maxVy - GARDEN_CONFIG.embers.minVy);
      e.swayFreq = 0.8 + Math.random() * 1.6;
      e.swayAmp = 0.4 + Math.random() * 0.9;
      e.phase = Math.random() * Math.PI * 2;
    }

    // Sporadic horizontal draft & sway
    const organicDrift = Math.sin(simTime * e.swayFreq + e.phase) * e.swayAmp;
    const timeScale = dt / 0.016;
    e.x += (e.vx + organicDrift) * timeScale;
    e.y += e.vy * timeScale;

    // Life progress [0, 1]
    const progress = Math.min(1, Math.max(0, e.life / e.maxLife));
    // Fade in gently over first 15%, burn bright in mid, fade out as it dissipates in top 35%
    if (progress < 0.15) {
      e.alpha = (progress / 0.15) * e.maxAlpha;
    } else if (progress > 0.65) {
      e.alpha = ((1 - progress) / 0.35) * e.maxAlpha;
    } else {
      e.alpha = e.maxAlpha;
    }

    // Subtle flicker/twinkle on ember size
    const flicker = 1.0 + Math.sin(simTime * 4.5 + e.phase) * 0.18;
    e.size = e.baseSize * flicker;

    // Wrap horizontal boundaries
    if (e.x < -20) e.x = width + 20;
    if (e.x > width + 20) e.x = -20;
  }
}

/**
 * Computes organic breathing pulse for fully bloomed roses in the moonlight
 */
export function computeRoseBreathingPulse(
  simTime: number,
  phase: number,
  bloomProgress: number
): { scalePulse: number; sheen: number } {
  if (bloomProgress < 0.9) {
    return { scalePulse: 1.0, sheen: 0 };
  }

  const cfg = GARDEN_CONFIG.roses.breathing;
  // Blend in smoothly as bloom completes
  const blend = Math.min(1, (bloomProgress - 0.9) / 0.1);

  // Slow, rhythmic, organic wave
  const breathWave = Math.sin(simTime * cfg.frequency + phase);
  const scalePulse = 1.0 + breathWave * cfg.scaleAmplitude * blend;
  const sheen = Math.max(0, breathWave) * cfg.moonlightSheenMax * blend;

  return { scalePulse, sheen };
}

/**
 * Returns illumination ratio [0.06 to 1.0] for a given moon phase
 */
export function getPhaseIllumination(phase: MoonPhase): number {
  const p = GARDEN_CONFIG.moon.phases.find((item) => item.id === phase);
  return p ? p.illumination : 1.0;
}

/**
 * Creates initial state for the dynamic gothic moon
 */
export function createInitialMoonState(
  paramMoon?: MoonPhase | 'auto',
  paramHemisphere?: Hemisphere
): MoonState {
  const isAuto = paramMoon === 'auto';
  const initialPhase: MoonPhase = isAuto || !paramMoon ? 'waxing-crescent' : paramMoon;
  const hemisphere: Hemisphere = paramHemisphere || 'north';
  return {
    currentPhase: initialPhase,
    targetPhase: initialPhase,
    transitionProgress: 1.0,
    illumination: getPhaseIllumination(initialPhase),
    isAuto,
    autoTimer: 0,
    driftX: 0,
    driftY: 0,
    breatheAlpha: 1.0,
    hemisphere,
  };
}

/**
 * Updates moon state, handling smooth 1.2s crossfading, slow celestial drift, and 20s auto-cycling
 */
export function updateMoonState(
  state: MoonState,
  simTime: number,
  dt: number
): MoonState {
  let { currentPhase, targetPhase, transitionProgress, isAuto, autoTimer, hemisphere } = state;
  let transitionDt = dt;

  // Handle auto-advance every 20 seconds
  if (isAuto) {
    autoTimer += dt;
    if (autoTimer >= GARDEN_CONFIG.moon.autoCycleDuration) {
      autoTimer = autoTimer % GARDEN_CONFIG.moon.autoCycleDuration;
      const currentIndex = ALL_MOON_PHASES.indexOf(targetPhase);
      const nextIndex = (currentIndex + 1) % ALL_MOON_PHASES.length;
      currentPhase = targetPhase;
      targetPhase = ALL_MOON_PHASES[nextIndex];
      transitionProgress = 0;
      transitionDt = 0; // Start new transition cleanly
    }
  }

  // Advance transition progress
  if (transitionProgress < 1.0) {
    transitionProgress = Math.min(
      1.0,
      transitionProgress + transitionDt / GARDEN_CONFIG.moon.crossfadeDuration
    );
    if (transitionProgress >= 1.0) {
      currentPhase = targetPhase;
    }
  }

  // Calculate blended illumination
  const curIllum = getPhaseIllumination(currentPhase);
  const tgtIllum = getPhaseIllumination(targetPhase);
  const blendFactor = easeInOutSine(transitionProgress);
  const illumination = curIllum + (tgtIllum - curIllum) * blendFactor;

  // Slow lunar drift over 60s
  const driftX = Math.sin(simTime * (Math.PI * 2 / GARDEN_CONFIG.moon.driftPeriod)) * GARDEN_CONFIG.moon.driftRangeX;
  const driftY = Math.cos(simTime * (Math.PI * 2 / (GARDEN_CONFIG.moon.driftPeriod * 1.2))) * GARDEN_CONFIG.moon.driftRangeY;

  // Breathing outer glow (7.0s cycle)
  const breatheSine = (Math.sin(simTime * (Math.PI * 2 / GARDEN_CONFIG.moon.breathePeriod)) + 1) * 0.5;
  const breatheAlpha =
    GARDEN_CONFIG.moon.breatheMinAlpha +
    (GARDEN_CONFIG.moon.breatheMaxAlpha - GARDEN_CONFIG.moon.breatheMinAlpha) * easeInOutSine(breatheSine);

  return {
    currentPhase,
    targetPhase,
    transitionProgress,
    illumination,
    isAuto,
    autoTimer,
    driftX,
    driftY,
    breatheAlpha,
    hemisphere,
  };
}

/**
 * Creates initial state for traveling wind gusts
 */
export function createInitialWindGustState(simTime: number = 0): WindGustState {
  return {
    active: false,
    startTime: 0,
    duration:
      GARDEN_CONFIG.wind.gust.rampUpDuration + GARDEN_CONFIG.wind.gust.fadeOutDuration,
    nextGustTime: simTime + 6.0 + Math.random() * 6.0,
    direction: Math.random() < 0.75 ? 1 : -1,
    peakStrengthDeg:
      GARDEN_CONFIG.wind.gust.peakLeanMinDeg +
      Math.random() *
        (GARDEN_CONFIG.wind.gust.peakLeanMaxDeg -
          GARDEN_CONFIG.wind.gust.peakLeanMinDeg),
    waveSpeed: 1.8,
  };
}

/**
 * Updates wind gust lifecycle, periodically triggering traveling gusts across the field
 */
export function updateWindGustState(
  state: WindGustState,
  simTime: number
): { state: WindGustState; activeGustForce: number; shouldSpawnPetal: boolean } {
  let { active, startTime, duration, nextGustTime, direction, peakStrengthDeg, waveSpeed } =
    state;
  let shouldSpawnPetal = false;

  // Check if it's time to start a new gust
  if (!active && simTime >= nextGustTime) {
    active = true;
    startTime = simTime;
    direction = Math.random() < 0.75 ? 1 : -1;
    peakStrengthDeg =
      GARDEN_CONFIG.wind.gust.peakLeanMinDeg +
      Math.random() *
        (GARDEN_CONFIG.wind.gust.peakLeanMaxDeg -
          GARDEN_CONFIG.wind.gust.peakLeanMinDeg);
  }

  let activeGustForce = 0;
  if (active) {
    const gustAge = simTime - startTime;
    const totalWaveLifetime = duration + waveSpeed;

    if (gustAge > totalWaveLifetime) {
      active = false;
      const nextInterval =
        GARDEN_CONFIG.wind.gust.minInterval +
        Math.random() *
          (GARDEN_CONFIG.wind.gust.maxInterval -
            GARDEN_CONFIG.wind.gust.minInterval);
      nextGustTime = simTime + nextInterval;
    } else {
      // Calculate overall gust force
      if (gustAge <= GARDEN_CONFIG.wind.gust.rampUpDuration) {
        activeGustForce = easeInOutSine(gustAge / GARDEN_CONFIG.wind.gust.rampUpDuration);
      } else {
        const fadeAge = gustAge - GARDEN_CONFIG.wind.gust.rampUpDuration;
        activeGustForce = Math.max(
          0,
          1.0 - easeInOutSine(Math.min(1.0, fadeAge / (duration - GARDEN_CONFIG.wind.gust.rampUpDuration)))
        );
      }

      // Detach a velvet petal near peak intensity (around 1.4s - 1.8s into gust)
      if (gustAge >= 1.4 && gustAge <= 1.55 && Math.random() < 0.25) {
        shouldSpawnPetal = true;
      }
    }
  }

  return {
    state: {
      active,
      startTime,
      duration,
      nextGustTime,
      direction,
      peakStrengthDeg,
      waveSpeed,
    },
    activeGustForce,
    shouldSpawnPetal,
  };
}

/**
 * Computes localized wind angle at an X coordinate with organic wave propagation
 */
export function computeTravelingWindGust(
  simTime: number,
  xPos: number,
  width: number,
  gustState: WindGustState,
  basePhase: number
): number {
  // 1. Base constant gentle breeze (1-2 degrees)
  const baseWind =
    Math.sin(simTime * GARDEN_CONFIG.wind.baseFrequency + basePhase) *
    ((GARDEN_CONFIG.wind.baseAmplitudeDeg * Math.PI) / 180);

  if (!gustState.active) {
    return baseWind;
  }

  // 2. Localized wave delay across screen width
  const gustAge = simTime - gustState.startTime;
  const xNorm = Math.max(0, Math.min(1, xPos / Math.max(1, width)));
  const waveDelay =
    gustState.direction === 1
      ? xNorm * gustState.waveSpeed
      : (1 - xNorm) * gustState.waveSpeed;

  const localTime = gustAge - waveDelay;

  if (localTime <= 0 || localTime >= gustState.duration) {
    return baseWind;
  }

  // 3. Local envelope calculation (ramp up 1.5s, fade out 2.5s)
  const rampUp = GARDEN_CONFIG.wind.gust.rampUpDuration;
  const fadeOut = GARDEN_CONFIG.wind.gust.fadeOutDuration;
  let envelope = 0;

  if (localTime <= rampUp) {
    envelope = easeInOutSine(localTime / rampUp);
  } else {
    envelope = 1.0 - easeInOutSine((localTime - rampUp) / fadeOut);
  }

  const gustLeanRad =
    (envelope * gustState.peakStrengthDeg * gustState.direction * Math.PI) / 180;

  return baseWind + gustLeanRad;
}

