import React, { useEffect, useRef, useCallback, useState } from 'react';
import { GARDEN_CONFIG } from '../garden/config';
import {
  EmberParticle,
  FallingPetal,
  GardenParams,
  GrassBlade,
  Particle,
  RoseData,
  Sparkle,
  MoonPhase,
  MoonState,
  WindGustState,
} from '../garden/types';
import {
  computeRoseBreathingPulse,
  generateEmberParticles,
  generateGrass,
  generateParticles,
  generateRoses,
  generateSparkles,
  getGrowthState,
  updateEmberParticles,
  updatePointerSprings,
  createInitialMoonState,
  updateMoonState,
  createInitialWindGustState,
  updateWindGustState,
  computeTravelingWindGust,
} from '../garden/roseSimulation';
import { RoseRenderer } from '../garden/RoseRenderer';
import { ambientMusic } from '../utils/ambientAudio';

interface GardenCanvasProps {
  params: GardenParams;
  replayKey: number;
  onTimeUpdate: (elapsedSeconds: number) => void;
  prefersReducedMotion: boolean;
  seekTime?: { target: number; id: number } | null;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
}

export const GardenCanvas: React.FC<GardenCanvasProps> = ({
  params,
  replayKey,
  onTimeUpdate,
  prefersReducedMotion,
  seekTime,
  onCanvasReady,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    onCanvasReady?.(canvasRef.current);
  }, [onCanvasReady, replayKey]);

  // Entities stored in refs for 60fps loop with zero per-frame allocation
  const rosesRef = useRef<RoseData[]>([]);
  const sparklesRef = useRef<Sparkle[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const embersRef = useRef<EmberParticle[]>([]);
  const grassRef = useRef<GrassBlade[]>([]);
  const fallingPetalsRef = useRef<FallingPetal[]>([]);
  const lastPetalSpawnRef = useRef<number>(0);

  // Rendering & Animation timing refs
  const rendererRef = useRef<RoseRenderer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const elapsedSimTimeRef = useRef<number>(0);
  const dimensionsRef = useRef<{ width: number; height: number; isMobile: boolean }>({
    width: 0,
    height: 0,
    isMobile: false,
  });

  // Pointer position for spring push physics
  const pointerPosRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });

  // Dynamic Gothic Moon & Traveling Wind Gust states
  const moonStateRef = useRef<MoonState>(createInitialMoonState(params.moon, params.hemisphere));
  const windGustStateRef = useRef<WindGustState>(createInitialWindGustState(0));

  // Sync external moon changes from URL / ControlsOverlay
  useEffect(() => {
    const isAuto = params.moon === 'auto';
    const target: MoonPhase = isAuto || !params.moon || params.moon === 'auto' ? 'waxing-crescent' : params.moon;
    const current = moonStateRef.current;
    const nextHemisphere = params.hemisphere || 'north';
    if (
      current.isAuto !== isAuto ||
      (target !== current.targetPhase && !isAuto) ||
      current.hemisphere !== nextHemisphere
    ) {
      moonStateRef.current = {
        ...current,
        currentPhase: current.targetPhase,
        targetPhase: target,
        transitionProgress: current.hemisphere !== nextHemisphere ? 1.0 : 0,
        isAuto,
        autoTimer: 0,
        hemisphere: nextHemisphere,
      };
    }
  }, [params.moon, params.hemisphere]);

  // Adaptive quality state
  const frameTimesRef = useRef<number[]>([]);
  const lastAdaptiveCheckRef = useRef<number>(performance.now());
  const isReducedQualityRef = useRef<boolean>(false);

  // Sync seek time from timeline interaction
  useEffect(() => {
    if (seekTime) {
      elapsedSimTimeRef.current = seekTime.target;
      lastTimeRef.current = performance.now();
      onTimeUpdate(seekTime.target);
    }
  }, [seekTime, onTimeUpdate]);

  // Setup / re-seed entities when dimensions or count changes
  const initSimulation = useCallback((width: number, height: number) => {
    if (width <= 0 || height <= 0) return;
    const isMobile = width < 768 || width < height;
    dimensionsRef.current = { width, height, isMobile };

    // Generate roses with responsive PC vs Mobile count
    const roses = generateRoses(params.count, width, height, replayKey * 1000 + 42);
    rosesRef.current = roses;

    // Generate sparkles on front-row roses
    sparklesRef.current = generateSparkles(roses, replayKey * 1000 + 777);

    // Generate particles
    particlesRef.current = generateParticles(GARDEN_CONFIG.atmosphere.particleCount, width, height);

    // Generate glowing ember particles that drift sporadically from the bottom
    embersRef.current = generateEmberParticles(GARDEN_CONFIG.embers.count, width, height, replayKey * 1000 + 888);

    // Generate grounding grass
    grassRef.current = generateGrass(GARDEN_CONFIG.atmosphere.grassCount, width, height);

    // Reset falling petals and clock
    fallingPetalsRef.current = [];
    lastPetalSpawnRef.current = 0;
    elapsedSimTimeRef.current = prefersReducedMotion ? 10.0 : 0;
    lastTimeRef.current = performance.now();
  }, [params.count, prefersReducedMotion, replayKey]);

  // Handle high-DPI sizing and rebuild sprites only on dimension change
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const isMobile = width < 768 || width < height;

    // Scale by devicePixelRatio capped at 2.0 on mobile, 2.5 on PC
    const rawDpr = window.devicePixelRatio || 1;
    const dpr = Math.min(isMobile ? 2.0 : 2.5, rawDpr);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.resetTransform?.();
      ctx.scale(dpr, dpr);
      if (!rendererRef.current) {
        rendererRef.current = new RoseRenderer(ctx);
      }
      rendererRef.current.resize(width, height, dpr);
    }

    initSimulation(width, height);
  }, [initSimulation]);

  // Unified Pointer Event Handlers for responsive spring deflection
  const handlePointerMove = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    pointerPosRef.current.x = e.clientX - rect.left;
    pointerPosRef.current.y = e.clientY - rect.top;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    handlePointerMove(e);
    const clickX = pointerPosRef.current.x;
    const clickY = pointerPosRef.current.y;
    if (clickX !== null && clickY !== null) {
      let nearestRose: RoseData | null = null;
      let minDistance = 120; // Hit detection radius around rose head
      for (const r of rosesRef.current) {
        const dist = Math.hypot(r.tipX - clickX, r.tipY - clickY);
        if (dist < minDistance) {
          minDistance = dist;
          nearestRose = r;
        }
      }
      if (nearestRose) {
        spawnFallingPetal(nearestRose.tipX, nearestRose.tipY, nearestRose.isWine, nearestRose.scale);
      } else {
        spawnFallingPetal(clickX, clickY);
      }
    }
  };

  const handlePointerLeave = () => {
    pointerPosRef.current.x = null;
    pointerPosRef.current.y = null;
  };

  // Spawn a floating detached petal
  const spawnFallingPetal = (x?: number, y?: number, isWineParam?: boolean, scaleParam?: number) => {
    const dim = dimensionsRef.current;
    if (dim.width <= 0) return;

    let spawnX = x;
    let spawnY = y;
    let isWine = isWineParam ?? false;
    let baseScale = scaleParam ?? 1.0;

    if (spawnX === undefined || spawnY === undefined) {
      const candidates = rosesRef.current.filter(r => r.layer >= 1);
      if (candidates.length === 0) return;
      const targetRose = candidates[Math.floor(Math.random() * candidates.length)];
      spawnX = targetRose.tipX;
      spawnY = targetRose.tipY;
      isWine = targetRose.isWine;
      baseScale = targetRose.scale;
    }

    fallingPetalsRef.current.push({
      id: Math.random(),
      x: spawnX,
      y: spawnY,
      vx: (Math.random() - 0.5) * 0.9,
      vy: 0.6 + Math.random() * 0.6,
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.04,
      scale: baseScale * (0.75 + Math.random() * 0.45),
      opacity: 0.95,
      isWine,
      curl: Math.random() * 0.3,
    });

    // Play subtle audio cue for interactive petal detachment
    ambientMusic.playPetalDetachSound();
  };

  // 60fps Animation Loop with Delta-Time (dt) and Adaptive Quality
  useEffect(() => {
    handleResize();

    let resizeTimer: number;
    const onDebouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(handleResize, 150);
    };

    window.addEventListener('resize', onDebouncedResize);
    window.addEventListener('orientationchange', onDebouncedResize);

    // Handle tab visibility changes cleanly
    const handleVisibility = () => {
      if (!document.hidden) {
        lastTimeRef.current = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    let isRunning = true;
    lastTimeRef.current = performance.now();

    const renderFrame = (now: number) => {
      if (!isRunning) return;

      // Delta time in seconds, clamped to max 50ms (0.05s) to avoid jumps
      const rawDt = (now - lastTimeRef.current) / 1000;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));
      lastTimeRef.current = now;

      // Adaptive quality monitoring (checks frame time over 2s window)
      frameTimesRef.current.push(rawDt * 1000);
      if (now - lastAdaptiveCheckRef.current > GARDEN_CONFIG.adaptiveQuality.checkWindowSeconds * 1000) {
        const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
        if (avgFrameTime > GARDEN_CONFIG.adaptiveQuality.targetFrameTimeMs) {
          isReducedQualityRef.current = true;
        }
        frameTimesRef.current = [];
        lastAdaptiveCheckRef.current = now;
      }

      // Advance simulation clock
      if (!prefersReducedMotion) {
        elapsedSimTimeRef.current += dt;
      } else {
        elapsedSimTimeRef.current = 10.0;
      }
      const simTime = elapsedSimTimeRef.current;
      onTimeUpdate(simTime);

      const renderer = rendererRef.current;
      const { width, height } = dimensionsRef.current;

      if (renderer && width > 0 && height > 0) {
        // Update Moon and Wind Gust states
        moonStateRef.current = updateMoonState(moonStateRef.current, simTime, dt);
        const { state: nextGust, activeGustForce, shouldSpawnPetal } = updateWindGustState(
          windGustStateRef.current,
          simTime
        );
        windGustStateRef.current = nextGust;

        if (shouldSpawnPetal) {
          spawnFallingPetal();
        }

        // 1. Draw near-black stage backdrop, soft vignette, and breathing deep-red candle glow
        renderer.drawAtmosphere(simTime);

        // 1b. Render Dynamic Gothic Moon behind the rose silhouettes
        renderer.drawGothicMoon(moonStateRef.current, simTime, prefersReducedMotion);

        // 2. Update and draw floating embers/fireflies (drifting sideways faster during gusts)
        const particles = particlesRef.current;
        const particleLimit = isReducedQualityRef.current
          ? Math.round(particles.length * (1 - GARDEN_CONFIG.adaptiveQuality.reductionFactor))
          : particles.length;

        const gustParticleBoost =
          activeGustForce * nextGust.direction * GARDEN_CONFIG.wind.gust.particleBoostVx;

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.x += p.vx + Math.sin(simTime * 1.5 + p.phase) * 0.35 + gustParticleBoost;
          p.y += p.vy;
          if (p.y < -10) {
            p.y = height + 10;
            p.x = Math.random() * width;
          }
          if (p.x < -10) p.x = width + 10;
          if (p.x > width + 10) p.x = -10;
        }
        renderer.drawParticles(particles, simTime, particleLimit);

        // 2b. Update and draw glowing 'ember' particles drifting sporadically from bottom
        const embers = embersRef.current;
        updateEmberParticles(embers, width, height, dt, simTime);
        const emberLimit = isReducedQualityRef.current
          ? Math.round(embers.length * (1 - GARDEN_CONFIG.adaptiveQuality.reductionFactor))
          : embers.length;
        renderer.drawEmbers(embers, emberLimit);

        // 3. Draw grounding grass blades swaying with wind and gusts
        renderer.drawGrass(grassRef.current, simTime, 1.0 + activeGustForce * 0.8);

        // 4. Update pointer spring physics on roses
        const roses = rosesRef.current;
        updatePointerSprings(roses, pointerPosRef.current.x, pointerPosRef.current.y, dt);

        // 5. Render roses with traveling wave wind gusts and moon illumination
        const roseCount = roses.length;
        const currentIllum = moonStateRef.current.illumination;

        for (let i = 0; i < roseCount; i++) {
          const rose = roses[i];
          // If adaptive reduction is active, skip ~30% of back-row roses
          if (isReducedQualityRef.current && rose.layer === 0 && rose.id % 3 === 0) {
            continue;
          }
          // Compute organic moonlight breathing pulse once roses are fully bloomed
          const { bloomProgress } = getGrowthState(simTime, rose, prefersReducedMotion);
          const breathingPulse = computeRoseBreathingPulse(simTime, rose.phase, bloomProgress);

          // Localized wind angle propagating as an organic wave across the field
          const localizedWindAngle = computeTravelingWindGust(
            simTime,
            rose.tipX,
            width,
            windGustStateRef.current,
            rose.phase
          );
          const windOffset = {
            dx: Math.sin(localizedWindAngle) * 20,
            dy: 0,
            angleRad: localizedWindAngle,
          };

          renderer.renderRose(
            rose,
            simTime,
            prefersReducedMotion,
            breathingPulse,
            windOffset,
            currentIllum,
            moonStateRef.current.currentPhase
          );
        }

        // 6. Draw silver sparkles on front-row roses (once blooming begins)
        if (simTime > 2.6) {
          const sparkles = sparklesRef.current;
          const sparkleLimit = isReducedQualityRef.current
            ? Math.round(sparkles.length * (1 - GARDEN_CONFIG.adaptiveQuality.reductionFactor))
            : sparkles.length;
          renderer.drawSparkles(sparkles, roses, simTime, sparkleLimit);
        }

        // 7. Periodic falling petal detachment after bloom
        if (simTime > 3.2 && now - lastPetalSpawnRef.current > GARDEN_CONFIG.timing.petalDetachInterval * 1000) {
          lastPetalSpawnRef.current = now;
          spawnFallingPetal();
        }

        // 8. Update and draw falling petals
        const fallingPetals = fallingPetalsRef.current;
        for (let i = fallingPetals.length - 1; i >= 0; i--) {
          const petal = fallingPetals[i];
          petal.x += petal.vx + Math.sin(simTime * 2.0 + petal.rotation) * 0.7;
          petal.y += petal.vy;
          petal.rotation += petal.vRot;

          if (petal.y > height - 40) {
            petal.opacity -= 0.02;
          }

          if (petal.opacity <= 0 || petal.y > height + 20) {
            fallingPetals.splice(i, 1);
          } else {
            renderer.drawFallingPetal(petal);
          }
        }

        // 9. Pre-rendered film grain overlay
        renderer.drawFilmGrain();
      }

      animFrameIdRef.current = requestAnimationFrame(renderFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(renderFrame);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      clearTimeout(resizeTimer);
      window.removeEventListener('resize', onDebouncedResize);
      window.removeEventListener('orientationchange', onDebouncedResize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [handleResize, onTimeUpdate, prefersReducedMotion, replayKey]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full cursor-pointer touch-manipulation select-none overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerLeave}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      role="img"
      aria-label="Cinematic Garden of Black Roses canvas stage"
    >
      <canvas ref={canvasRef} className="block w-full h-full pointer-events-none" />
    </div>
  );
};
