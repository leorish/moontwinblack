import React from 'react';
import { Heart } from 'lucide-react';
import { GARDEN_CONFIG } from '../garden/config';
import { GardenParams } from '../garden/types';
import { RomanticMediaShowcase } from './RomanticMediaShowcase';
import { OfflineMeetingCard } from './OfflineMeetingCard';

interface RomanticTextRevealProps {
  elapsedTime: number;
  params: GardenParams;
  prefersReducedMotion: boolean;
}

export const RomanticTextReveal: React.FC<RomanticTextRevealProps> = ({
  elapsedTime,
  params,
  prefersReducedMotion,
}) => {
  const mediaStartTime = GARDEN_CONFIG.timing.mediaRevealStart; // ~3.8s
  const textStartTime = GARDEN_CONFIG.timing.textRevealStart;   // ~7.2s
  const textFadeDuration = GARDEN_CONFIG.timing.textRevealDuration; // 2.0s

  const showMedia = prefersReducedMotion || elapsedTime >= mediaStartTime;
  const showText = prefersReducedMotion || elapsedTime >= textStartTime;

  if (!showMedia && !prefersReducedMotion) {
    return null;
  }

  // Determine opacities for sequential reveal
  const line1Opacity = prefersReducedMotion
    ? 1
    : Math.min(1, Math.max(0, (elapsedTime - textStartTime) / (textFadeDuration * 0.4)));

  const line2Opacity = prefersReducedMotion
    ? 1
    : Math.min(1, Math.max(0, (elapsedTime - (textStartTime + 0.3)) / (textFadeDuration * 0.5)));

  const line3Opacity = prefersReducedMotion
    ? 1
    : Math.min(1, Math.max(0, (elapsedTime - (textStartTime + 0.6)) / (textFadeDuration * 0.5)));

  const line4Opacity = prefersReducedMotion
    ? 1
    : Math.min(1, Math.max(0, (elapsedTime - (textStartTime + 1.1)) / (textFadeDuration * 0.5)));

  const line5Opacity = prefersReducedMotion
    ? 1
    : Math.min(1, Math.max(0, (elapsedTime - (textStartTime + 1.6)) / (textFadeDuration * 0.5)));

  const line6Opacity = prefersReducedMotion
    ? 1
    : Math.min(1, Math.max(0, (elapsedTime - (textStartTime + 2.1)) / (textFadeDuration * 0.5)));

  const line7Opacity = prefersReducedMotion
    ? 1
    : Math.min(1, Math.max(0, (elapsedTime - (textStartTime + 2.6)) / (textFadeDuration * 0.5)));

  // Soft dark gradient behind content for 100% readability
  const containerBgOpacity = prefersReducedMotion
    ? 0.82
    : Math.min(0.82, (elapsedTime - mediaStartTime) * 0.28);

  const recipient = params.to || GARDEN_CONFIG.defaults.to;
  const customLines = params.customMessage
    ? params.customMessage.split('\n').filter(Boolean)
    : null;

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden pointer-events-auto z-10 px-4 sm:px-6 transition-opacity duration-1000"
      style={{
        paddingTop: 'max(1.2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(4.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1.2rem, env(safe-area-inset-left))',
        paddingRight: 'max(1.2rem, env(safe-area-inset-right))',
        background: `radial-gradient(circle at 50% 36%, rgba(5, 5, 7, ${containerBgOpacity}) 0%, rgba(5, 5, 7, ${containerBgOpacity * 0.82}) 54%, rgba(5, 5, 7, 0) 92%)`,
      }}
      aria-live="polite"
    >
      <div className="max-w-2xl w-full text-center flex flex-col items-center select-none pt-2 sm:pt-3 pb-8">
        {/* 1. Romantic Media Memories Showcase (Photo & Video floating gently before message) */}
        <RomanticMediaShowcase
          elapsedTime={elapsedTime}
          prefersReducedMotion={prefersReducedMotion}
        />

        {/* 2. Devotion Letter Section */}
        {showText && (
          <div className="w-full flex flex-col items-center transition-all duration-1000">
            {/* Header badge: small uppercase, wide letter-spacing, muted silver */}
            <p
              className="text-[11px] sm:text-xs font-cinzel tracking-[0.35em] uppercase text-[#a2a2b4] mb-2 sm:mb-2.5 transition-all duration-700 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]"
              style={{
                opacity: line1Opacity,
                transform: `translateY(${(1 - line1Opacity) * 8}px)`,
              }}
            >
              {GARDEN_CONFIG.defaults.subtitle}
            </p>

        {/* Name / Title: large elegant serif, soft white */}
        <h1
          className="font-playfair font-normal text-[#f5f5f9] mb-1 tracking-wide drop-shadow-[0_4px_22px_rgba(0,0,0,0.95)]"
          style={{
            fontSize: 'clamp(2.2rem, 5.5vw, 4.0rem)',
            lineHeight: 1.15,
            opacity: line2Opacity,
            transform: `translateY(${(1 - line2Opacity) * 10}px)`,
          }}
        >
          {recipient}
        </h1>

        {/* Salutation Subtitle */}
        <p
          className="text-[11px] sm:text-xs font-cinzel tracking-[0.22em] uppercase text-[#c89ba8] mb-4 sm:mb-5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
          style={{
            opacity: line3Opacity,
            transform: `translateY(${(1 - line3Opacity) * 6}px)`,
          }}
        >
          {GARDEN_CONFIG.defaults.moontwinSubtitle}
        </p>

        {/* Devotion Message Lines */}
        <div className="space-y-2 sm:space-y-3 font-cormorant text-base sm:text-lg md:text-xl text-[#dedee8] italic font-light leading-relaxed drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] max-w-xl">
          {customLines ? (
            customLines.map((line, idx) => (
              <p
                key={idx}
                className="transition-all duration-700"
                style={{
                  opacity:
                    idx === 0
                      ? line3Opacity
                      : idx === 1
                        ? line4Opacity
                        : idx === 2
                          ? line5Opacity
                          : idx === 3
                            ? line6Opacity
                            : line7Opacity,
                  transform: `translateY(${(1 - line4Opacity) * 6}px)`,
                }}
              >
                {line}
              </p>
            ))
          ) : (
            <>
              {/* Line 1: Pain and Soul Ache */}
              <p
                className="transition-all duration-700 text-[#e4e4ee]"
                style={{
                  opacity: line3Opacity,
                  transform: `translateY(${(1 - line3Opacity) * 6}px)`,
                }}
              >
                My soul aches deeply for the pain I caused you.
              </p>

              {/* Line 2: Gravity and Guiding Light */}
              <p
                className="transition-all duration-700 text-[#d8d8e6]"
                style={{
                  opacity: line4Opacity,
                  transform: `translateY(${(1 - line4Opacity) * 6}px)`,
                }}
              >
                You are the silent gravity pulling my world together, the single light that guides me through the heaviest darkness.
              </p>

              {/* Line 3: Fixing Together */}
              <p
                className="transition-all duration-700 text-[#cecee0]"
                style={{
                  opacity: line5Opacity,
                  transform: `translateY(${(1 - line5Opacity) * 6}px)`,
                }}
              >
                I promise we will fix this together, breaking down the psychological barriers and subconscious walls between us.
              </p>

              {/* Line 4: Shielding Heart */}
              <p
                className="transition-all duration-700 text-[#dcdce8]"
                style={{
                  opacity: line6Opacity,
                  transform: `translateY(${(1 - line6Opacity) * 6}px)`,
                }}
              >
                Every breath I take carries a quiet devotion to shielding your heart, refusing to manipulate your emotions or play mind games.
              </p>

              {/* Line 5: Universe in hands */}
              <p
                className="transition-all duration-700 text-[#ffffff] font-normal not-italic tracking-wide pt-1 text-lg sm:text-xl md:text-2xl"
                style={{
                  opacity: line7Opacity,
                  transform: `translateY(${(1 - line7Opacity) * 6}px)`,
                }}
              >
                You hold my entire universe in your hands, forever and always.
              </p>
            </>
          )}
        </div>

        {/* Decorative divider */}
        <div
          className="mt-5 sm:mt-6 flex items-center justify-center space-x-3 opacity-40 transition-opacity duration-1000"
          style={{ opacity: line7Opacity * 0.45 }}
        >
          <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[#8a8a99]"></div>
          <Heart className="w-2.5 h-2.5 text-[#b58b98] fill-[#b58b98]/40" />
          <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[#8a8a99]"></div>
        </div>

        {/* 3. Offline Meeting & Devotion Card */}
        <OfflineMeetingCard
          recipientName={recipient}
          prefersReducedMotion={prefersReducedMotion}
        />
      </div>
    )}
  </div>
</div>
);
};
