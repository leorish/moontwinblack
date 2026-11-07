/**
 * Garden of Black Roses - Main Application Entry
 * Cinematic generative dark romance garden of blooming velvet black roses
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { GardenCanvas } from './components/GardenCanvas';
import { RomanticTextReveal } from './components/RomanticTextReveal';
import { ControlsOverlay } from './components/ControlsOverlay';
import { PasswordGate } from './components/PasswordGate';
import { Gothic3DScene } from './components/Gothic3DScene';
import { parseGardenParams } from './garden/roseSimulation';
import { GardenParams } from './garden/types';

export default function App() {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);

  // Read initial parameters from URL query string (defaults to 99 black roses)
  const [params, setParams] = useState<GardenParams>(() => {
    return parseGardenParams(window.location.search);
  });

  // Session storage password lock persistence (sessionStorage)
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('garden_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  const [is3DMode, setIs3DMode] = useState<boolean>(false);
  const [replayKey, setReplayKey] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  // Detect prefers-reduced-motion or autostart
  useEffect(() => {
    if (params.autostart) {
      setPrefersReducedMotion(true);
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [params.autostart]);

  // Handle replay trigger
  const handleReplay = useCallback(() => {
    setReplayKey((prev) => prev + 1);
    setElapsedSeconds(0);
  }, []);

  // Update URL params without page reload
  const handleUpdateParams = useCallback((newParams: Partial<GardenParams>) => {
    setParams((prev) => ({
      ...prev,
      ...newParams,
    }));
  }, []);

  return (
    <main className="relative w-full h-[100dvh] min-h-[100dvh] bg-[#050507] overflow-hidden select-none touch-manipulation">
      {!isUnlocked ? (
        <PasswordGate onUnlock={() => setIsUnlocked(true)} />
      ) : is3DMode ? (
        <>
          {/* Three.js Studio PBR 3D Velvet Rose Sanctuary */}
          <Gothic3DScene
            moonPhase={params.moon || 'waxing-crescent'}
            onClose={() => setIs3DMode(false)}
          />

          {/* Controls Overlay with 3D mode active */}
          <ControlsOverlay
            onReplay={handleReplay}
            params={params}
            onUpdateParams={handleUpdateParams}
            onToggle3D={() => setIs3DMode(false)}
            is3DMode={true}
            getCanvas={() => canvasElementRef.current}
          />
        </>
      ) : (
        <>
          {/* 1. Cinematic 2D Canvas Scene (Dynamic Ambient Light Shift, 99 Roses, Sunflower, Scarlet Rose) */}
          <GardenCanvas
            params={params}
            replayKey={replayKey}
            onTimeUpdate={setElapsedSeconds}
            prefersReducedMotion={prefersReducedMotion}
            onCanvasReady={(c) => {
              canvasElementRef.current = c;
            }}
          />

          {/* 2. Film Grain texture overlay for subtle cinematic texture */}
          <div className="absolute inset-0 film-grain pointer-events-none z-[5]" />

          {/* 3. Romantic Poetic Text Reveal Sequence (Lines 1-5, dynamic query params) */}
          <RomanticTextReveal
            elapsedTime={elapsedSeconds}
            params={params}
            prefersReducedMotion={prefersReducedMotion}
          />

          {/* 4. Controls Overlay: Replay button, Dedication modal, Music toggle, 3D toggle, Snapshot Capture */}
          <ControlsOverlay
            onReplay={handleReplay}
            params={params}
            onUpdateParams={handleUpdateParams}
            onToggle3D={() => setIs3DMode(true)}
            is3DMode={false}
            getCanvas={() => canvasElementRef.current}
          />
        </>
      )}
    </main>
  );
}
