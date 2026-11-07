/**
 * High-Performance Canvas 2D Renderer for the Garden of Black Roses.
 * Implements offscreen sprite caching for 60fps smoothness on PC & Mobile:
 * - Dynamic ambient light change based on elapsedSeconds (deep navy -> warm midnight purple)
 * - Pre-rendered rose sprites (Black & Wine, front/mid/back)
 * - Pre-rendered special Sunflower & Scarlet Rose sprites
 * - Pre-rendered deep-red breathing glow sprite (zero runtime gradient cost)
 * - Pre-rendered silver sparkles (4-point star with soft aura)
 * - Pre-rendered film grain pattern
 * - Zero ctx.filter or shadowBlur in animation loop
 * - Zero per-frame object allocation
 */

import { GARDEN_CONFIG } from './config';
import {
  EmberParticle,
  FallingPetal,
  GrassBlade,
  MoonPhase,
  MoonState,
  Particle,
  RoseData,
  Sparkle,
} from './types';
import {
  ALL_MOON_PHASES,
  computeCandleBreathingIntensity,
  computeRoseBreathingPulse,
  computeWindOffset,
  easeInOutSine,
  getBezierPoint,
  getGrowthState,
} from './roseSimulation';

export interface RosePalette {
  base: string;
  mid1: string;
  mid2: string;
  burgundyShade: string;
  rimHighlight: string;
  rimCandleHighlight: string;
  velvetSheen: string;
}

export class RoseRenderer {
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  // Offscreen Pre-rendered Sprites
  // Sprites:
  // 0-1: Layer 0 (Black, Wine)
  // 2-3: Layer 1 (Black, Wine)
  // 4-5: Layer 2 (Black, Wine)
  // 6: Special Sunflower
  // 7: Special Scarlet Rose
  private roseSprites: HTMLCanvasElement[] = [];
  // Buds: 0: Black, 1: Wine, 2: Sunflower, 3: Scarlet Rose
  private budSprites: HTMLCanvasElement[] = [];
  private glowSprite: HTMLCanvasElement | null = null;
  private sparkleSprite: HTMLCanvasElement | null = null;
  private grainPattern: CanvasPattern | null = null;
  private moonBaseCanvas: HTMLCanvasElement | null = null;
  private cachedMoonRadius: number = 0;
  private realMoonImg: HTMLImageElement | null = null;
  private isRealMoonLoaded: boolean = false;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.initStaticCaches();
    this.loadRealMoonTexture();
  }

  private loadRealMoonTexture() {
    if (typeof Image !== 'undefined') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = GARDEN_CONFIG.moon.texturePath;
      img.onload = () => {
        this.realMoonImg = img;
        this.isRealMoonLoaded = true;
      };
    }
  }

  /**
   * Generates static offscreen sprites for grain, glow, and sparkles
   */
  private initStaticCaches() {
    // 1. Film grain (128x128 pre-rendered once)
    try {
      const gCanvas = document.createElement('canvas');
      gCanvas.width = 128;
      gCanvas.height = 128;
      const gCtx = gCanvas.getContext('2d');
      if (gCtx) {
        const imgData = gCtx.createImageData(128, 128);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const val = Math.floor(Math.random() * 255);
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
          data[i + 3] = Math.floor(Math.random() * 14); // subtle 5%
        }
        gCtx.putImageData(imgData, 0, 0);
        this.grainPattern = this.ctx.createPattern(gCanvas, 'repeat');
      }
    } catch {
      // Ignore pattern error
    }

    // 2. Pre-rendered Silver Sparkle Sprite (4-point star with soft aura)
    try {
      const sCanvas = document.createElement('canvas');
      sCanvas.width = 32;
      sCanvas.height = 32;
      const sCtx = sCanvas.getContext('2d');
      if (sCtx) {
        const cx = 16;
        const cy = 16;
        const aura = sCtx.createRadialGradient(cx, cy, 1, cx, cy, 14);
        aura.addColorStop(0, 'rgba(216, 220, 230, 0.9)');
        aura.addColorStop(0.3, 'rgba(180, 190, 215, 0.35)');
        aura.addColorStop(1, 'rgba(216, 220, 230, 0)');
        sCtx.fillStyle = aura;
        sCtx.beginPath();
        sCtx.arc(cx, cy, 14, 0, Math.PI * 2);
        sCtx.fill();

        sCtx.fillStyle = '#ffffff';
        sCtx.beginPath();
        sCtx.moveTo(cx, cy - 10);
        sCtx.quadraticCurveTo(cx, cy, cx + 10, cy);
        sCtx.quadraticCurveTo(cx, cy, cx, cy + 10);
        sCtx.quadraticCurveTo(cx, cy, cx - 10, cy);
        sCtx.quadraticCurveTo(cx, cy, cx - 10, cy);
        sCtx.fill();
        this.sparkleSprite = sCanvas;
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Builds the offscreen Deep Red Candle Glow sprite
   */
  private buildGlowSprite(width: number, height: number) {
    const glowSize = Math.max(512, Math.round(Math.max(width * 0.7, height * 0.65)));
    const gCanvas = document.createElement('canvas');
    gCanvas.width = glowSize;
    gCanvas.height = glowSize;
    const gCtx = gCanvas.getContext('2d');
    if (!gCtx) return;

    const cx = glowSize / 2;
    const cy = glowSize / 2;
    const rad = glowSize / 2;

    const grad = gCtx.createRadialGradient(cx, cy, 5, cx, cy, rad);
    grad.addColorStop(0, 'rgba(122, 12, 28, 1)');      // #7a0c1c
    grad.addColorStop(0.32, 'rgba(75, 8, 16, 0.85)');
    grad.addColorStop(0.68, 'rgba(42, 5, 8, 0.45)');   // #2a0508
    grad.addColorStop(1, 'rgba(5, 5, 7, 0)');

    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, glowSize, glowSize);
    this.glowSprite = gCanvas;
  }

  /**
   * Pre-renders rose sprites across layers and color variants into offscreen canvases
   */
  public buildRoseSprites(dpr: number) {
    this.roseSprites = [];
    this.budSprites = [];

    const spriteSize = Math.round(96 * dpr);
    const center = spriteSize / 2;

    // 1. Layer 0, 1, 2 x [Black, Wine] roses (indices 0 to 5)
    for (let layer = 0; layer < 3; layer++) {
      for (const isWine of [false, true]) {
        const canvas = document.createElement('canvas');
        canvas.width = spriteSize;
        canvas.height = spriteSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
          this.drawPrerenderedRose(ctx, center / dpr, center / dpr, layer, isWine);
        }
        this.roseSprites.push(canvas);

        // Pre-render rose buds
        const bCanvas = document.createElement('canvas');
        bCanvas.width = Math.round(48 * dpr);
        bCanvas.height = Math.round(48 * dpr);
        const bCtx = bCanvas.getContext('2d');
        if (bCtx) {
          bCtx.scale(dpr, dpr);
          this.drawPrerenderedBud(bCtx, 24, 24, isWine ? '#2a0610' : '#1a1a1f');
        }
        this.budSprites.push(bCanvas);
      }
    }

    // 2. Pre-render ONE SUNFLOWER (Sprite Index 6)
    const sfCanvas = document.createElement('canvas');
    sfCanvas.width = Math.round(112 * dpr);
    sfCanvas.height = Math.round(112 * dpr);
    const sfCtx = sfCanvas.getContext('2d');
    if (sfCtx) {
      sfCtx.scale(dpr, dpr);
      this.drawPrerenderedSunflower(sfCtx, 56, 56);
    }
    this.roseSprites.push(sfCanvas);

    // Sunflower bud (Bud Index 2)
    const sfBud = document.createElement('canvas');
    sfBud.width = Math.round(48 * dpr);
    sfBud.height = Math.round(48 * dpr);
    const sfBudCtx = sfBud.getContext('2d');
    if (sfBudCtx) {
      sfBudCtx.scale(dpr, dpr);
      this.drawPrerenderedBud(sfBudCtx, 24, 24, '#7a4a12');
    }
    this.budSprites.push(sfBud);

    // 3. Pre-render ONE SPECIAL SCARLET ROSE (Sprite Index 7)
    const srCanvas = document.createElement('canvas');
    srCanvas.width = spriteSize;
    srCanvas.height = spriteSize;
    const srCtx = srCanvas.getContext('2d');
    if (srCtx) {
      srCtx.scale(dpr, dpr);
      this.drawPrerenderedScarletRose(srCtx, center / dpr, center / dpr);
    }
    this.roseSprites.push(srCanvas);

    // Scarlet rose bud (Bud Index 3)
    const srBud = document.createElement('canvas');
    srBud.width = Math.round(48 * dpr);
    srBud.height = Math.round(48 * dpr);
    const srBudCtx = srBud.getContext('2d');
    if (srBudCtx) {
      srBudCtx.scale(dpr, dpr);
      this.drawPrerenderedBud(srBudCtx, 24, 24, '#8a0618');
    }
    this.budSprites.push(srBud);
  }

  /**
   * Pre-renders standard black or wine velvet rose
   */
  private drawPrerenderedRose(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    layer: number,
    isWine: boolean
  ) {
    const palette = isWine ? GARDEN_CONFIG.colors.wineRose : GARDEN_CONFIG.colors.blackRose;
    const isBackLayer = layer === 0;

    ctx.save();
    ctx.translate(cx, cy);

    // Calyx
    ctx.fillStyle = GARDEN_CONFIG.colors.stems.deepGreen;
    for (let s = 0; s < 5; s++) {
      ctx.save();
      ctx.rotate((s * Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-4, 6, -10, 14);
      ctx.quadraticCurveTo(-2, 8, 0, 0);
      ctx.fill();
      ctx.restore();
    }

    // Petals
    const petalCounts = 6;
    for (let i = 0; i < petalCounts; i++) {
      const norm = i / (petalCounts - 1);
      const angle = i * 2.39996;
      const rx = 26 * (1 - norm * 0.58);
      const ry = 19 * (1 - norm * 0.55);
      const curl = (1 - norm) * 0.38;

      ctx.save();
      ctx.rotate(angle + curl * 0.25);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-rx * 0.9, -ry * 0.4, -rx * (1.0 + curl * 0.3), -ry * (1.1 + curl * 0.4), 0, -ry * (1.2 + curl * 0.3));
      ctx.bezierCurveTo(rx * (1.0 + curl * 0.3), -ry * (1.1 + curl * 0.4), rx * 0.9, -ry * 0.4, 0, 0);
      ctx.closePath();

      const grad = ctx.createRadialGradient(0, -ry * 0.35, 2, 0, -ry * 0.75, rx * 1.3);
      grad.addColorStop(0, palette.burgundyShade);
      grad.addColorStop(0.35, palette.base);
      grad.addColorStop(0.72, palette.mid1);
      grad.addColorStop(1, palette.mid2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Velvet sheen
      if (i < petalCounts - 2) {
        ctx.save();
        ctx.clip();
        const sheen = ctx.createLinearGradient(-rx * 0.5, -ry, rx * 0.5, 0);
        sheen.addColorStop(0, 'rgba(255, 255, 255, 0)');
        sheen.addColorStop(0.5, palette.velvetSheen);
        sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sheen;
        ctx.fill();
        ctx.restore();
      }

      ctx.strokeStyle = isBackLayer ? 'rgba(120, 120, 135, 0.22)' : palette.rimHighlight;
      ctx.lineWidth = isBackLayer ? 0.8 : (i >= petalCounts - 2 ? 0.9 : 1.3);
      ctx.stroke();

      ctx.restore();
    }

    // Center spiral core
    ctx.beginPath();
    ctx.arc(0, -3, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = palette.base;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, -3, 2.4, 0.4, Math.PI * 1.6);
    ctx.strokeStyle = palette.rimHighlight;
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Pre-renders the radiant golden SUNFLOWER
   */
  private drawPrerenderedSunflower(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    const pal = GARDEN_CONFIG.colors.sunflower;
    ctx.save();
    ctx.translate(cx, cy);

    // Warm golden ambient glow behind petals
    const aura = ctx.createRadialGradient(0, 0, 12, 0, 0, 48);
    aura.addColorStop(0, 'rgba(255, 200, 50, 0.35)');
    aura.addColorStop(0.6, 'rgba(245, 166, 35, 0.12)');
    aura.addColorStop(1, 'rgba(245, 166, 35, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fill();

    // Calyx sepals
    ctx.fillStyle = GARDEN_CONFIG.colors.stems.deepGreen;
    for (let s = 0; s < 12; s++) {
      ctx.save();
      ctx.rotate((s * Math.PI * 2) / 12);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-4, 8, -6, 26);
      ctx.quadraticCurveTo(0, 18, 0, 0);
      ctx.fill();
      ctx.restore();
    }

    // Outer & inner rows of radiant golden ray petals (22 petals total)
    const petalCount = 20;
    for (let pass = 0; pass < 2; pass++) {
      const isOuter = pass === 0;
      const pLen = isOuter ? 36 : 30;
      const pWidth = isOuter ? 8 : 7;
      const offsetAng = isOuter ? 0 : Math.PI / petalCount;

      for (let p = 0; p < petalCount; p++) {
        const ang = (p * Math.PI * 2) / petalCount + offsetAng;
        ctx.save();
        ctx.rotate(ang);

        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.quadraticCurveTo(-pWidth, pLen * 0.55, 0, pLen);
        ctx.quadraticCurveTo(pWidth, pLen * 0.55, 0, 8);
        ctx.closePath();

        const petGrad = ctx.createLinearGradient(0, 8, 0, pLen);
        petGrad.addColorStop(0, pal.petalBase);
        petGrad.addColorStop(0.55, pal.petalMid);
        petGrad.addColorStop(1, pal.petalHighlight);
        ctx.fillStyle = petGrad;
        ctx.fill();

        // Delicate golden rim highlight
        ctx.strokeStyle = pal.rimHighlight;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        ctx.restore();
      }
    }

    // Large dark textured chocolate seed disk floret
    const centerRadius = 16;
    const diskGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, centerRadius);
    diskGrad.addColorStop(0, pal.centerMid);
    diskGrad.addColorStop(0.75, pal.centerBase);
    diskGrad.addColorStop(1, '#180a03');

    ctx.fillStyle = diskGrad;
    ctx.beginPath();
    ctx.arc(0, 0, centerRadius, 0, Math.PI * 2);
    ctx.fill();

    // Seed florets speckles (phyllotaxis spiral pattern)
    ctx.fillStyle = pal.centerSeeds;
    for (let dot = 1; dot <= 42; dot++) {
      const r = Math.sqrt(dot) * 2.2;
      const theta = dot * 2.39996; // Golden angle
      const dx = Math.cos(theta) * r;
      const dy = Math.sin(theta) * r;
      ctx.beginPath();
      ctx.arc(dx, dy, 0.75, 0, Math.PI * 2);
      ctx.fill();
    }

    // Outer disk ring edge
    ctx.strokeStyle = 'rgba(245, 166, 35, 0.4)';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Pre-renders the radiant SCARLET ROSE
   */
  private drawPrerenderedScarletRose(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    const pal = GARDEN_CONFIG.colors.scarletRose;
    ctx.save();
    ctx.translate(cx, cy);

    // Warm crimson aura
    const aura = ctx.createRadialGradient(0, 0, 6, 0, 0, 42);
    aura.addColorStop(0, 'rgba(215, 20, 50, 0.35)');
    aura.addColorStop(0.7, 'rgba(160, 10, 30, 0.12)');
    aura.addColorStop(1, 'rgba(160, 10, 30, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.fill();

    // Calyx
    ctx.fillStyle = GARDEN_CONFIG.colors.stems.deepGreen;
    for (let s = 0; s < 5; s++) {
      ctx.save();
      ctx.rotate((s * Math.PI * 2) / 5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-4, 6, -10, 14);
      ctx.quadraticCurveTo(-2, 8, 0, 0);
      ctx.fill();
      ctx.restore();
    }

    // Petals in rich scarlet ruby velvet
    const petalCounts = 6;
    for (let i = 0; i < petalCounts; i++) {
      const norm = i / (petalCounts - 1);
      const angle = i * 2.39996;
      const rx = 27 * (1 - norm * 0.58);
      const ry = 20 * (1 - norm * 0.55);
      const curl = (1 - norm) * 0.38;

      ctx.save();
      ctx.rotate(angle + curl * 0.25);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-rx * 0.9, -ry * 0.4, -rx * (1.0 + curl * 0.3), -ry * (1.1 + curl * 0.4), 0, -ry * (1.2 + curl * 0.3));
      ctx.bezierCurveTo(rx * (1.0 + curl * 0.3), -ry * (1.1 + curl * 0.4), rx * 0.9, -ry * 0.4, 0, 0);
      ctx.closePath();

      const grad = ctx.createRadialGradient(0, -ry * 0.35, 2, 0, -ry * 0.75, rx * 1.3);
      grad.addColorStop(0, pal.burgundyShade);
      grad.addColorStop(0.35, pal.base);
      grad.addColorStop(0.72, pal.mid1);
      grad.addColorStop(1, pal.mid2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Velvet sheen
      if (i < petalCounts - 2) {
        ctx.save();
        ctx.clip();
        const sheen = ctx.createLinearGradient(-rx * 0.5, -ry, rx * 0.5, 0);
        sheen.addColorStop(0, 'rgba(255, 255, 255, 0)');
        sheen.addColorStop(0.5, pal.velvetSheen);
        sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sheen;
        ctx.fill();
        ctx.restore();
      }

      ctx.strokeStyle = pal.rimHighlight;
      ctx.lineWidth = i >= petalCounts - 2 ? 0.9 : 1.3;
      ctx.stroke();

      ctx.restore();
    }

    // Center spiral
    ctx.beginPath();
    ctx.arc(0, -3, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = pal.base;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, -3, 2.4, 0.4, Math.PI * 1.6);
    ctx.strokeStyle = pal.rimHighlight;
    ctx.lineWidth = 0.9;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Internal pre-render helper: draws closed bud into offscreen canvas
   */
  private drawPrerenderedBud(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    fillColor: string
  ) {
    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = GARDEN_CONFIG.colors.stems.midGreen;
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(-6, 2, -5, -8);
    ctx.quadraticCurveTo(0, -2, 0, 4);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(6, 2, 5, -8);
    ctx.quadraticCurveTo(0, -2, 0, 4);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(-8, -12, -8, -1, 0, 2);
    ctx.bezierCurveTo(8, -1, 8, -12, 0, -18);
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.strokeStyle = 'rgba(200, 200, 220, 0.4)';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Resizes viewport and rebuilds cached offscreen sprites on dimension changes
   */
  public resize(width: number, height: number, dpr: number = window.devicePixelRatio || 1) {
    const isMobile = width < 768 || width < height;
    const cappedDpr = Math.min(isMobile ? 2.0 : 2.5, dpr);
    const targetMoonRadius = Math.round(
      Math.max(
        GARDEN_CONFIG.moon.minRadius,
        Math.min(
          GARDEN_CONFIG.moon.maxRadius,
          Math.min(width, height) * GARDEN_CONFIG.moon.radiusRatio
        )
      )
    );

    if (
      this.width !== width ||
      this.height !== height ||
      this.dpr !== cappedDpr ||
      this.cachedMoonRadius !== targetMoonRadius
    ) {
      this.width = width;
      this.height = height;
      this.dpr = cappedDpr;

      this.buildGlowSprite(width, height);
      this.buildRoseSprites(cappedDpr);
      this.buildMoonSprite(targetMoonRadius, cappedDpr);
    }
  }

  /**
   * Builds high-resolution cached offscreen moon sprite:
   * - Pale silver-white disc (#e8eaf2)
   * - Soft grey maria / crater texture (low contrast)
   * - Cold-silver rim light
   * - Soft radiant silver outer glow with outermost crimson tint
   */
  private buildMoonSprite(radius: number, dpr: number) {
    this.cachedMoonRadius = radius;
    const canvas = document.createElement('canvas');
    const padding = Math.round(radius * 1.5);
    const size = Math.round((radius + padding) * 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;

    // 1. Soft Outer Radiant Glow (silver with faint crimson tint at outermost edge ~8% opacity)
    const haloGrad = ctx.createRadialGradient(cx, cy, radius * 0.7, cx, cy, radius + padding);
    haloGrad.addColorStop(0, 'rgba(235, 240, 255, 0.28)');
    haloGrad.addColorStop(0.35, GARDEN_CONFIG.moon.colors.outerHalo);
    haloGrad.addColorStop(0.75, 'rgba(190, 200, 230, 0.08)');
    haloGrad.addColorStop(0.92, GARDEN_CONFIG.moon.colors.outerCrimson);
    haloGrad.addColorStop(1.0, 'rgba(165, 30, 48, 0)');

    ctx.fillStyle = haloGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + padding, 0, Math.PI * 2);
    ctx.fill();

    // 2. Base Pale Silver-White Disc
    const discGrad = ctx.createRadialGradient(
      cx - radius * 0.25,
      cy - radius * 0.25,
      radius * 0.1,
      cx,
      cy,
      radius
    );
    discGrad.addColorStop(0, '#f2f4fc');
    discGrad.addColorStop(0.75, GARDEN_CONFIG.moon.colors.disc);
    discGrad.addColorStop(1.0, '#dde0ed');

    ctx.fillStyle = discGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Soft Grey Maria / Crater Texture (low contrast, atmospheric)
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Procedural lunar seas (Maria)
    const mariaPatches = [
      { x: cx - radius * 0.28, y: cy - radius * 0.22, rx: radius * 0.32, ry: radius * 0.24, rot: 0.3 },
      { x: cx + radius * 0.15, y: cy - radius * 0.30, rx: radius * 0.26, ry: radius * 0.18, rot: -0.2 },
      { x: cx + radius * 0.35, y: cy - radius * 0.05, rx: radius * 0.22, ry: radius * 0.28, rot: 0.1 },
      { x: cx - radius * 0.12, y: cy + radius * 0.18, rx: radius * 0.38, ry: radius * 0.25, rot: -0.4 },
      { x: cx + radius * 0.22, y: cy + radius * 0.25, rx: radius * 0.20, ry: radius * 0.18, rot: 0.5 },
      { x: cx - radius * 0.38, y: cy + radius * 0.05, rx: radius * 0.18, ry: radius * 0.22, rot: -0.1 },
    ];

    ctx.fillStyle = GARDEN_CONFIG.moon.colors.crater;
    for (const m of mariaPatches) {
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, m.rx, m.ry, m.rot, 0, Math.PI * 2);
      ctx.fill();
    }

    // Faint subtle impact ray
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.arc(cx + radius * 0.18, cy + radius * 0.42, radius * 0.07, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 4. Delicate Cold-Silver Rim Light Ring
    ctx.strokeStyle = GARDEN_CONFIG.moon.colors.rimLight;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    this.moonBaseCanvas = canvas;
  }

  /**
   * Draws the gothic moon behind the roses silhouette with dynamic 8-phase terminator,
   * breathing outer glow, and slow celestial drift.
   */
  public drawGothicMoon(
    moonState: MoonState,
    time: number,
    prefersReducedMotion: boolean = false
  ) {
    if (!this.moonBaseCanvas) return;

    const ctx = this.ctx;
    const isMobile = this.width < 768 || this.width < this.height;
    const posCfg = isMobile ? GARDEN_CONFIG.moon.portraitPos : GARDEN_CONFIG.moon.landscapePos;

    const baseX = this.width * posCfg.xRatio;
    const baseY = this.height * posCfg.yRatio;

    const cx = baseX + (prefersReducedMotion ? 0 : moonState.driftX);
    const cy = baseY + (prefersReducedMotion ? 0 : moonState.driftY);
    const radius = this.cachedMoonRadius;

    const spriteSize = this.moonBaseCanvas.width / this.dpr;

    // 1. Draw base moon sprite (with glowing halo and lunar disc)
    ctx.save();
    ctx.globalAlpha = prefersReducedMotion ? 1.0 : moonState.breatheAlpha;
    ctx.drawImage(
      this.moonBaseCanvas,
      cx - spriteSize / 2,
      cy - spriteSize / 2,
      spriteSize,
      spriteSize
    );
    ctx.restore();

    // 2. Photorealistic Waxing Crescent Render
    // When waxing-crescent is active (or transitioning), render the user's authentic moon texture
    const isWaxingCrescentActive =
      moonState.currentPhase === 'waxing-crescent' ||
      moonState.targetPhase === 'waxing-crescent';

    if (isWaxingCrescentActive && this.isRealMoonLoaded && this.realMoonImg) {
      let realMoonAlpha = 1.0;
      if (moonState.currentPhase === 'waxing-crescent' && moonState.targetPhase !== 'waxing-crescent') {
        realMoonAlpha = 1.0 - easeInOutSine(moonState.transitionProgress);
      } else if (moonState.targetPhase === 'waxing-crescent' && moonState.currentPhase !== 'waxing-crescent') {
        realMoonAlpha = easeInOutSine(moonState.transitionProgress);
      }

      if (realMoonAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha = (prefersReducedMotion ? 1.0 : moonState.breatheAlpha) * realMoonAlpha;

        // Apply Hemisphere Rule:
        // • Northern Hemisphere: illumination is on the right side ('D' shape, default)
        // • Southern Hemisphere: illumination is on the left side ('C' shape, horizontally mirrored)
        if (moonState.hemisphere === 'south') {
          ctx.translate(cx, cy);
          ctx.scale(-1, 1);
          ctx.translate(-cx, -cy);
        }

        // Circular clip for clean spherical disc
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.clip();

        // Draw photorealistic waxing crescent texture
        ctx.drawImage(
          this.realMoonImg,
          cx - radius,
          cy - radius,
          radius * 2,
          radius * 2
        );

        ctx.restore();

        // Cold-silver rim light over photorealistic edge
        ctx.save();
        ctx.strokeStyle = GARDEN_CONFIG.moon.colors.rimLight;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // When fully in waxing-crescent phase, the real photo already provides the authentic shadow & earthshine
        if (realMoonAlpha >= 0.99) {
          return;
        }
      }
    }

    // 3. Draw 8-Phase Terminator Shadow Curve for other phases & smooth crossfades
    // Map phase IDs to astronomical phase angle phi in [0, 2*PI)
    // 0 = new, PI/2 = first quarter, PI = full, 3*PI/2 = last quarter
    const phaseAngles: Record<MoonPhase, number> = {
      'new': 0,
      'waxing-crescent': Math.PI * 0.25,
      'first-quarter': Math.PI * 0.50,
      'waxing-gibbous': Math.PI * 0.75,
      'full': Math.PI,
      'waning-gibbous': Math.PI * 1.25,
      'last-quarter': Math.PI * 1.50,
      'waning-crescent': Math.PI * 1.75,
    };

    let angle1 = phaseAngles[moonState.currentPhase] ?? Math.PI;
    let angle2 = phaseAngles[moonState.targetPhase] ?? Math.PI;

    // Forward path wrapping
    if (angle2 < angle1 && angle1 - angle2 > Math.PI) {
      angle2 += Math.PI * 2;
    } else if (angle2 > angle1 && angle2 - angle1 > Math.PI) {
      angle1 += Math.PI * 2;
    }

    const t = easeInOutSine(moonState.transitionProgress);
    const phi = (((angle1 + (angle2 - angle1) * t) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // If practically full moon, no shadow terminator needed
    if (Math.abs(phi - Math.PI) < 0.03) {
      return;
    }

    ctx.save();

    // Respect hemisphere rule for procedural terminator
    if (moonState.hemisphere === 'south') {
      ctx.translate(cx, cy);
      ctx.scale(-1, 1);
      ctx.translate(-cx, -cy);
    }

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = GARDEN_CONFIG.moon.colors.shadowDark;

    const isWaxing = phi <= Math.PI;
    const k = -Math.cos(phi); // -1.0 (new) to +1.0 (full)
    const rX = Math.abs(k) * radius;

    ctx.beginPath();
    if (isWaxing) {
      // In waxing, the right side is lit; shadow covers left side ('D' shape)
      ctx.arc(cx, cy, radius + 1, -Math.PI / 2, Math.PI / 2, true);
    } else {
      // In waning, the left side is lit; shadow covers right side ('C' shape)
      ctx.arc(cx, cy, radius + 1, -Math.PI / 2, Math.PI / 2, false);
    }

    // Elliptical terminator boundary returning from bottom to top
    ctx.ellipse(
      cx,
      cy,
      Math.max(0.1, rX),
      radius + 1,
      0,
      Math.PI / 2,
      -Math.PI / 2,
      k > 0 ? isWaxing : !isWaxing
    );
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  /**
   * Clears canvas and draws dynamic ambient light shift based on elapsedSeconds:
   * Slowly shifts background vignette from deep navy to warmer midnight purple as roses bloom.
   */
  public drawAtmosphere(time: number) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Dynamic ambient light shift from Deep Navy to Midnight Purple over 5s
    const shiftProgress = Math.min(1, Math.max(0, time / GARDEN_CONFIG.colors.ambientLight.transitionDuration));
    const p = easeInOutSine(shiftProgress);

    // Navy base: rgb(4, 5, 9) -> Midnight purple base: rgb(7, 4, 11)
    const bgR = Math.round(4 + (7 - 4) * p);
    const bgG = Math.round(5 + (4 - 5) * p);
    const bgB = Math.round(9 + (11 - 9) * p);
    ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
    ctx.fillRect(0, 0, w, h);

    // Interpolate Radial Vignette
    // Inner: Navy rgb(9, 15, 32) -> Purple rgb(36, 12, 42)
    const inR = Math.round(9 + (36 - 9) * p);
    const inG = Math.round(15 + (12 - 15) * p);
    const inB = Math.round(32 + (42 - 32) * p);
    const inA = (0.48 + 0.04 * p).toFixed(3);

    // Mid: Navy rgb(5, 8, 20) -> Purple rgb(18, 6, 24)
    const midR = Math.round(5 + (18 - 5) * p);
    const midG = Math.round(8 + (6 - 8) * p);
    const midB = Math.round(20 + (24 - 20) * p);
    const midA = (0.86 + 0.02 * p).toFixed(3);

    const vigGrad = ctx.createRadialGradient(
      w * 0.5,
      h * 0.42,
      w * 0.1,
      w * 0.5,
      h * 0.45,
      Math.max(w, h) * 0.75
    );
    vigGrad.addColorStop(0, `rgba(${inR}, ${inG}, ${inB}, ${inA})`);
    vigGrad.addColorStop(0.65, `rgba(${midR}, ${midG}, ${midB}, ${midA})`);
    vigGrad.addColorStop(1, `rgb(${bgR}, ${bgG}, ${bgB})`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Bottom-center breathing DEEP RED candle glow:
    // Breathing smoothly between 85% and 100% intensity over 6 seconds
    if (this.glowSprite) {
      const breathingFactor = computeCandleBreathingIntensity(time);
      const glowW = this.glowSprite.width / this.dpr;
      const glowH = this.glowSprite.height / this.dpr;

      ctx.save();
      ctx.globalAlpha = 0.20 * breathingFactor;
      ctx.drawImage(
        this.glowSprite,
        w * 0.5 - glowW * 0.5,
        h - glowH * 0.55,
        glowW,
        glowH
      );
      ctx.restore();
    }
  }

  /**
   * Draws floating embers/particles drifting upward
   */
  public drawParticles(particles: Particle[], time: number, maxCount?: number) {
    const ctx = this.ctx;
    ctx.save();
    const count = maxCount !== undefined ? Math.min(particles.length, maxCount) : particles.length;

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const twinkle = (Math.sin(time * p.twinkleSpeed + p.phase) + 1) * 0.5;
      const alpha = p.alpha * (0.35 + 0.65 * twinkle);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace(/[\d\.]+\)$/, `${alpha})`);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Draws glowing ember particles drifting sporadically from the bottom of the canvas.
   * Features a soft radiant warm halo with an intense incandescent core.
   */
  public drawEmbers(embers: EmberParticle[], maxCount?: number) {
    const ctx = this.ctx;
    ctx.save();
    const count = maxCount !== undefined ? Math.min(embers.length, maxCount) : embers.length;

    for (let i = 0; i < count; i++) {
      const e = embers[i];
      if (e.alpha <= 0.01) continue;

      // 1. Soft glowing outer ember halo
      const haloRadius = e.glowRadius * (e.size / e.baseSize);
      const grad = ctx.createRadialGradient(e.x, e.y, 0.5, e.x, e.y, haloRadius);
      grad.addColorStop(0, `${e.colorGlow}${(e.alpha * 0.7).toFixed(3)})`);
      grad.addColorStop(0.4, `${e.colorGlow}${(e.alpha * 0.35).toFixed(3)})`);
      grad.addColorStop(1, `${e.colorGlow}0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(e.x, e.y, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Bright intense glowing core
      ctx.fillStyle = `${e.colorCore}${e.alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Draws ground grass blades swaying in the breeze
   */
  public drawGrass(grassList: GrassBlade[], time: number, windStrength: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineCap = 'round';

    for (let i = 0; i < grassList.length; i++) {
      const g = grassList[i];
      const sway = Math.sin(time * 1.2 + g.phase) * g.curve * windStrength;
      const tipX = g.startX + sway;
      const tipY = g.startY - g.height;
      const cpX = g.startX + sway * 0.45;
      const cpY = g.startY - g.height * 0.5;

      ctx.beginPath();
      ctx.moveTo(g.startX, g.startY);
      ctx.quadraticCurveTo(cpX, cpY, tipX, tipY);
      ctx.strokeStyle = g.color;
      ctx.lineWidth = g.width;
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Draws a growing stem along quadratic bezier, with leaves and highlight stroke
   */
  public drawStem(
    rose: RoseData,
    stemProgress: number,
    windOffset: { dx: number; dy: number }
  ) {
    if (stemProgress <= 0) return;

    const ctx = this.ctx;
    ctx.save();

    const currentTipX = rose.tipX + windOffset.dx * stemProgress;
    const currentTipY = rose.tipY + windOffset.dy * stemProgress;
    const currentCpX = rose.cpX + (windOffset.dx * 0.5 + rose.pointerDeflection * 18) * stemProgress;
    const currentCpY = rose.cpY;

    const numSteps = Math.max(8, Math.floor(20 * stemProgress));
    ctx.beginPath();
    ctx.moveTo(rose.rootX, rose.rootY);

    for (let step = 1; step <= numSteps; step++) {
      const t = (step / numSteps) * stemProgress;
      const px = getBezierPoint(t, rose.rootX, currentCpX, currentTipX);
      const py = getBezierPoint(t, rose.rootY, currentCpY, currentTipY);
      ctx.lineTo(px, py);
    }

    ctx.strokeStyle = GARDEN_CONFIG.colors.stems.midGreen;
    ctx.lineWidth = rose.stemWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    if (rose.stemWidth >= 2) {
      ctx.beginPath();
      for (let step = 1; step <= numSteps; step++) {
        const t = (step / numSteps) * stemProgress;
        const px = getBezierPoint(t, rose.rootX, currentCpX, currentTipX) - (rose.stemWidth * 0.35);
        const py = getBezierPoint(t, rose.rootY, currentCpY, currentTipY);
        if (step === 1) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = GARDEN_CONFIG.colors.stems.highlight;
      ctx.lineWidth = Math.max(0.7, rose.stemWidth * 0.3);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Draws a flower head (either sprite-cached bloomed rose, sunflower, or scaling bud)
   */
  public renderRose(
    rose: RoseData,
    elapsedTime: number,
    prefersReducedMotion: boolean = false,
    breathingPulse?: { scalePulse: number; sheen: number },
    windOffset?: { dx: number; dy: number; angleRad: number },
    moonIllumination: number = 1.0,
    moonPhase?: MoonPhase
  ) {
    const { stemProgress, budScale, bloomProgress } = getGrowthState(
      elapsedTime,
      rose,
      prefersReducedMotion
    );

    const wind = windOffset ?? computeWindOffset(elapsedTime, rose.phase);
    const headX = rose.tipX + wind.dx * stemProgress + rose.pointerDeflection * 20;
    const headY = rose.tipY + wind.dy * stemProgress;

    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = rose.opacity;

    // 1. Draw Stem
    this.drawStem(rose, stemProgress, wind);

    // 2. Draw Bloomed Flower or Bud
    const combinedAngle = rose.baseAngle + wind.angleRad + rose.pointerDeflection;

    if (bloomProgress > 0) {
      const sprite = this.roseSprites[rose.spriteIndex];
      if (sprite) {
        // Subtle pulsing animation effect for fully bloomed roses ("breathing in moonlight")
        const pulse =
          breathingPulse ??
          computeRoseBreathingPulse(elapsedTime, rose.phase, bloomProgress);
        const effectiveScale =
          rose.scale *
          bloomProgress *
          (prefersReducedMotion ? 1.0 : pulse.scalePulse);

        const sw = (sprite.width / this.dpr) * effectiveScale;
        const sh = (sprite.height / this.dpr) * effectiveScale;

        ctx.save();
        ctx.translate(headX, headY);
        ctx.rotate(combinedAngle);
        ctx.drawImage(sprite, -sw / 2, -sh / 2, sw, sh);

        // Soft moonlit breathing sheen overlay when fully bloomed (modulated with lunar illumination)
        if (!prefersReducedMotion && pulse.sheen > 0.01 && rose.layer >= 1) {
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          const moonFactor = 0.5 + 0.5 * Math.max(0.06, moonIllumination);
          ctx.globalAlpha = pulse.sheen * rose.opacity * 0.55 * moonFactor;
          ctx.drawImage(sprite, -sw / 2, -sh / 2, sw, sh);
          ctx.restore();
        }

        // Subtle, slow-pulsing bioluminescent effect that activates only during 'new' or 'crescent' moon phases
        const isBioluminescentPhase =
          moonPhase === 'new' ||
          moonPhase === 'waxing-crescent' ||
          moonPhase === 'waning-crescent';

        if (isBioluminescentPhase && bloomProgress >= 0.70) {
          const bioBreath = (Math.sin(elapsedTime * 0.9 + rose.phase) + 1) * 0.5;
          const bioAlpha = (0.16 + 0.28 * bioBreath) * rose.opacity * ((bloomProgress - 0.70) / 0.30);
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = bioAlpha;

          // Radial bioluminescent aura in mystical moonlit cyan / teal or amethyst
          const auraRadius = (sw / 2) * 1.22;
          const auraGrad = ctx.createRadialGradient(0, 0, sw * 0.15, 0, 0, auraRadius);
          if (rose.isWine) {
            auraGrad.addColorStop(0, 'rgba(195, 85, 230, 0.45)');
            auraGrad.addColorStop(0.55, 'rgba(120, 45, 180, 0.22)');
            auraGrad.addColorStop(1, 'rgba(60, 20, 100, 0)');
          } else {
            auraGrad.addColorStop(0, 'rgba(64, 224, 208, 0.50)');
            auraGrad.addColorStop(0.55, 'rgba(28, 160, 185, 0.25)');
            auraGrad.addColorStop(1, 'rgba(10, 80, 100, 0)');
          }
          ctx.fillStyle = auraGrad;
          ctx.beginPath();
          ctx.arc(0, 0, auraRadius, 0, Math.PI * 2);
          ctx.fill();

          // Lighter screen pass for glowing petal edge definition
          ctx.drawImage(sprite, -sw / 2, -sh / 2, sw, sh);
          ctx.restore();
        }

        ctx.restore();
      }
    } else if (budScale > 0) {
      let budIdx = 0;
      if (rose.flowerKind === 'sunflower') budIdx = 2;
      else if (rose.flowerKind === 'scarletRose') budIdx = 3;
      else if (rose.isWine) budIdx = 1;

      const bSprite = this.budSprites[budIdx] || this.budSprites[0];
      if (bSprite) {
        const bw = (bSprite.width / this.dpr) * rose.scale * budScale;
        const bh = (bSprite.height / this.dpr) * rose.scale * budScale;

        ctx.save();
        ctx.translate(headX, headY);
        ctx.rotate(combinedAngle);
        ctx.drawImage(bSprite, -bw / 2, -bh / 2, bw, bh);
        ctx.restore();
      }
    }

    ctx.restore();
  }

  /**
   * Draws silver sparkles on front-row roses (4-point star pulsing on sine cycle)
   */
  public drawSparkles(sparkles: Sparkle[], roses: RoseData[], time: number, maxCount?: number) {
    if (!this.sparkleSprite) return;

    const ctx = this.ctx;
    const count = maxCount !== undefined ? Math.min(sparkles.length, maxCount) : sparkles.length;

    for (let i = 0; i < count; i++) {
      const sp = sparkles[i];
      const rose = roses.find(r => r.id === sp.roseId);
      if (!rose) continue;

      const cycle = ((time + sp.phase) % sp.period) / sp.period;
      const sineVal = (Math.sin(cycle * Math.PI * 2) + 1) * 0.5;
      const opacity = sineVal * GARDEN_CONFIG.sparkles.maxOpacity;
      const scale = GARDEN_CONFIG.sparkles.minScale + sineVal * (GARDEN_CONFIG.sparkles.maxScale - GARDEN_CONFIG.sparkles.minScale);

      if (opacity <= 0.05) continue;

      const wind = computeWindOffset(time, rose.phase);
      const headX = rose.tipX + wind.dx + rose.pointerDeflection * 20;
      const headY = rose.tipY + wind.dy;
      const sx = headX + sp.relX;
      const sy = headY + sp.relY;

      const drawSize = sp.baseSize * scale * 2.2;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.drawImage(this.sparkleSprite, sx - drawSize / 2, sy - drawSize / 2, drawSize, drawSize);
      ctx.restore();
    }
  }

  /**
   * Draws falling detached petals
   */
  public drawFallingPetal(petal: FallingPetal) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(petal.x, petal.y);
    ctx.rotate(petal.rotation);
    ctx.scale(petal.scale, petal.scale);
    ctx.globalAlpha = petal.opacity;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-12, -8, -14, -20, 0, -22);
    ctx.bezierCurveTo(14, -20, 12, -8, 0, 0);
    ctx.closePath();

    ctx.fillStyle = petal.isWine ? '#2a0610' : '#14141a';
    ctx.fill();

    ctx.strokeStyle = petal.isWine ? 'rgba(180, 120, 140, 0.4)' : 'rgba(140, 140, 155, 0.35)';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draws pre-rendered film grain overlay
   */
  public drawFilmGrain() {
    if (!this.grainPattern) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = this.grainPattern;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }
}
