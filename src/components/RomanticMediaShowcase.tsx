import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Maximize2, X, Heart, Sparkles } from 'lucide-react';
import { GARDEN_CONFIG } from '../garden/config';

interface RomanticMediaShowcaseProps {
  elapsedTime: number;
  prefersReducedMotion: boolean;
}

export const RomanticMediaShowcase: React.FC<RomanticMediaShowcaseProps> = ({
  elapsedTime,
  prefersReducedMotion,
}) => {
  const [activeAudioVideo, setActiveAudioVideo] = useState<'video' | 'videoMirror' | null>(null);
  const [lightboxItem, setLightboxItem] = useState<'photo' | 'video' | 'videoMirror' | null>(null);
  const videoRef1 = useRef<HTMLVideoElement | null>(null);
  const videoRef2 = useRef<HTMLVideoElement | null>(null);
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

  const startTime = GARDEN_CONFIG.timing.mediaRevealStart; // 3.8s
  const fadeDuration = GARDEN_CONFIG.timing.mediaRevealDuration; // 1.6s

  // Compute entrance opacity & scale
  const progress = prefersReducedMotion
    ? 1
    : Math.min(1, Math.max(0, (elapsedTime - startTime) / fadeDuration));

  // Sync mute states between the two video elements
  useEffect(() => {
    if (videoRef1.current) {
      const isMuted1 = activeAudioVideo !== 'video';
      videoRef1.current.muted = isMuted1;
      if (!isMuted1) {
        videoRef1.current.play().catch(() => {});
      }
    }
    if (videoRef2.current) {
      const isMuted2 = activeAudioVideo !== 'videoMirror';
      videoRef2.current.muted = isMuted2;
      if (!isMuted2) {
        videoRef2.current.play().catch(() => {});
      }
    }
  }, [activeAudioVideo]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (progress <= 0 && !prefersReducedMotion) {
    return null;
  }

  const toggleSound1 = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveAudioVideo((prev) => (prev === 'video' ? null : 'video'));
  };

  const toggleSound2 = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveAudioVideo((prev) => (prev === 'videoMirror' ? null : 'videoMirror'));
  };

  return (
    <>
      {/* Floating Media Showcase Stage */}
      <div
        className="w-full flex flex-col items-center justify-center mb-4 sm:mb-6 transition-all duration-1000"
        style={{
          opacity: progress,
          transform: `translateY(${(1 - progress) * 14}px) scale(${0.94 + progress * 0.06})`,
        }}
        aria-label="Romantic photo and video memories"
      >
        {/* Memory Header Kicker */}
        <div className="flex items-center gap-2 mb-2.5 sm:mb-3 text-center">
          <Sparkles className="w-3 h-3 text-[#f0b0bd] opacity-75 animate-pulse" />
          <span className="font-cinzel text-[10px] sm:text-xs uppercase tracking-[0.32em] text-[#d6b4bf] drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            Our Memories · Forever & Always
          </span>
          <Sparkles className="w-3 h-3 text-[#f0b0bd] opacity-75 animate-pulse" />
        </div>

        {/* Media Cards Trio Container */}
        <div className="flex flex-row items-center justify-center gap-2 sm:gap-4 md:gap-6 px-1 max-w-full">
          {/* 1. Left Card: Photo */}
          <div
            onClick={() => setLightboxItem('photo')}
            className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-[#09090d]/90 p-1.5 sm:p-2.5 backdrop-blur-md border border-white/15 transition-all duration-500 hover:border-[#f0b0bd]/60 hover:scale-[1.03] ${
              prefersReducedMotion ? '' : 'animate-float-soft-1 animate-glow-ember'
            }`}
            style={{
              width: 'clamp(90px, 25vw, 150px)',
            }}
          >
            {/* Aspect container for portrait photo */}
            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black">
              <img
                src={GARDEN_CONFIG.media.photoUrl}
                alt="Memory photograph"
                className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

              {/* Expand badge */}
              <div className="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Maximize2 className="w-3 h-3" />
              </div>
            </div>

            {/* Polaroid caption strip */}
            <div className="pt-1 px-0.5 flex items-center justify-between text-[#d0d0dc]">
              <span className="font-cinzel text-[8.5px] sm:text-[10px] tracking-[0.16em] uppercase text-[#c89ba8] truncate">
                {GARDEN_CONFIG.media.photoSubtitle}
              </span>
              <Heart className="w-2.5 h-2.5 text-[#e0899d] fill-[#e0899d]/30 shrink-0" />
            </div>
          </div>

          {/* 2. Centerpiece Card: Video 2 (Celebratory Mirror Video) */}
          <div
            onClick={() => setLightboxItem('videoMirror')}
            className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-[#0e0e16]/95 p-1.5 sm:p-2.5 backdrop-blur-md border border-[#f0b0bd]/30 transition-all duration-500 hover:border-[#f0b0bd]/70 hover:scale-[1.04] z-10 shadow-[0_6px_28px_rgba(240,176,189,0.15)] ${
              prefersReducedMotion ? '' : 'animate-float-soft-2 animate-glow-ember'
            }`}
            style={{
              width: 'clamp(98px, 28vw, 162px)',
            }}
          >
            {/* Aspect container for portrait video */}
            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef2}
                src={GARDEN_CONFIG.media.videoMirrorUrl}
                autoPlay
                loop
                playsInline
                muted={activeAudioVideo !== 'videoMirror'}
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

              {/* Sound Toggle Button */}
              <button
                type="button"
                onClick={toggleSound2}
                className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 rounded-full bg-black/70 px-1.5 sm:px-2 py-0.5 sm:py-1 text-white border border-white/20 backdrop-blur-md transition-colors hover:bg-[#681428] hover:border-[#f0b0bd]"
                title={activeAudioVideo === 'videoMirror' ? 'Mute video sound' : 'Play video sound'}
                aria-label={activeAudioVideo === 'videoMirror' ? 'Mute video audio' : 'Play video audio'}
              >
                {activeAudioVideo !== 'videoMirror' ? (
                  <>
                    <VolumeX className="w-3 h-3 text-[#ff99aa]" />
                    <span className="text-[7.5px] sm:text-[8px] font-sans font-medium text-[#ffd4dc] hidden sm:inline">Sound</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3 text-[#80ffb0] animate-pulse" />
                    <span className="text-[7.5px] sm:text-[8px] font-sans font-medium text-[#a0ffd0] hidden sm:inline">Playing</span>
                  </>
                )}
              </button>
            </div>

            {/* Video caption strip */}
            <div className="pt-1 px-0.5 flex items-center justify-between text-[#d0d0dc]">
              <span className="font-cinzel text-[8.5px] sm:text-[10px] tracking-[0.16em] uppercase text-[#e0b0bd] font-semibold truncate">
                {GARDEN_CONFIG.media.videoMirrorSubtitle}
              </span>
              <Sparkles className="w-2.5 h-2.5 text-[#f0b0bd] shrink-0" />
            </div>
          </div>

          {/* 3. Right Card: Video 1 (Moontwin Smile Video) */}
          <div
            onClick={() => setLightboxItem('video')}
            className={`group relative cursor-pointer overflow-hidden rounded-2xl bg-[#09090d]/90 p-1.5 sm:p-2.5 backdrop-blur-md border border-white/15 transition-all duration-500 hover:border-[#f0b0bd]/60 hover:scale-[1.03] ${
              prefersReducedMotion ? '' : 'animate-float-soft-1 animate-glow-ember'
            }`}
            style={{
              width: 'clamp(90px, 25vw, 150px)',
            }}
          >
            {/* Aspect container for portrait video */}
            <div className="relative aspect-[9/16] w-full overflow-hidden rounded-xl bg-black">
              <video
                ref={videoRef1}
                src={GARDEN_CONFIG.media.videoUrl}
                autoPlay
                loop
                playsInline
                muted={activeAudioVideo !== 'video'}
                className="h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

              {/* Sound Toggle Button */}
              <button
                type="button"
                onClick={toggleSound1}
                className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 rounded-full bg-black/70 px-1.5 sm:px-2 py-0.5 sm:py-1 text-white border border-white/20 backdrop-blur-md transition-colors hover:bg-[#681428] hover:border-[#f0b0bd]"
                title={activeAudioVideo === 'video' ? 'Mute video sound' : 'Play video sound'}
                aria-label={activeAudioVideo === 'video' ? 'Mute video audio' : 'Play video audio'}
              >
                {activeAudioVideo !== 'video' ? (
                  <>
                    <VolumeX className="w-3 h-3 text-[#ff99aa]" />
                    <span className="text-[7.5px] sm:text-[8px] font-sans font-medium text-[#ffd4dc] hidden sm:inline">Sound</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3 text-[#80ffb0] animate-pulse" />
                    <span className="text-[7.5px] sm:text-[8px] font-sans font-medium text-[#a0ffd0] hidden sm:inline">Playing</span>
                  </>
                )}
              </button>
            </div>

            {/* Video caption strip */}
            <div className="pt-1 px-0.5 flex items-center justify-between text-[#d0d0dc]">
              <span className="font-cinzel text-[8.5px] sm:text-[10px] tracking-[0.16em] uppercase text-[#c89ba8] truncate">
                {GARDEN_CONFIG.media.videoSubtitle}
              </span>
              <Sparkles className="w-2.5 h-2.5 text-[#f0b0bd] shrink-0" />
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal (For tap-to-expand in high fidelity) */}
      {lightboxItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 transition-opacity animate-in fade-in duration-300"
          onClick={() => setLightboxItem(null)}
          role="dialog"
          aria-modal="true"
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={() => setLightboxItem(null)}
            className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/40"
            aria-label="Close media preview"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Content */}
          <div
            className="relative max-h-[85vh] max-w-[90vw] md:max-w-md overflow-hidden rounded-2xl border border-white/20 shadow-2xl bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxItem === 'photo' ? (
              <img
                src={GARDEN_CONFIG.media.photoUrl}
                alt="Enlarged memory"
                className="max-h-[80vh] w-auto object-contain mx-auto"
              />
            ) : lightboxItem === 'video' ? (
              <div className="relative">
                <video
                  ref={modalVideoRef}
                  src={GARDEN_CONFIG.media.videoUrl}
                  autoPlay
                  loop
                  playsInline
                  controls
                  className="max-h-[80vh] w-auto object-contain mx-auto"
                />
              </div>
            ) : (
              <div className="relative">
                <video
                  ref={modalVideoRef}
                  src={GARDEN_CONFIG.media.videoMirrorUrl}
                  autoPlay
                  loop
                  playsInline
                  controls
                  className="max-h-[80vh] w-auto object-contain mx-auto"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
