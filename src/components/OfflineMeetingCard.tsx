import React, { useState } from 'react';
import {
  Heart,
  Check,
  MessageCircle,
  Sparkles,
  Maximize2,
  X,
  Compass,
  Copy,
  Send,
} from 'lucide-react';
import { GARDEN_CONFIG } from '../garden/config';

interface OfflineMeetingCardProps {
  recipientName: string;
  prefersReducedMotion?: boolean;
}

export const OfflineMeetingCard: React.FC<OfflineMeetingCardProps> = ({
  recipientName: _recipientName,
  prefersReducedMotion: _prefersReducedMotion = false,
}) => {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [copiedDM, setCopiedDM] = useState<boolean>(false);

  const cfg = GARDEN_CONFIG.offlineMeeting;
  const mediaCfg = GARDEN_CONFIG.media;

  const dmTextToCopy = `Hey, let's meet offline today! Where should we meet and what time works best for you? Let me know here in DM.`;

  const handleCopyDMText = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(dmTextToCopy).then(() => {
        setCopiedDM(true);
        setTimeout(() => setCopiedDM(false), 3000);
      });
    }
  };

  return (
    <>
      <div className="w-full max-w-2xl mt-8 sm:mt-12 text-left transition-all duration-700 animate-in fade-in slide-in-from-bottom-4">
        {/* Outer Card Enclosure */}
        <div className="relative overflow-hidden rounded-3xl bg-[#09090f]/90 border border-[#8a8a99]/25 backdrop-blur-2xl shadow-[0_16px_50px_rgba(0,0,0,0.85)] p-5 sm:p-7 md:p-8">
          {/* Subtle Ambient Radial Glow */}
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#7a0c1c]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#1e2a4a]/25 blur-3xl" />

          {/* Section Kicker */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-[#e0a8b5]" />
              <span className="font-cinzel text-[10px] sm:text-xs uppercase tracking-[0.28em] text-[#d0b0bb]">
                {cfg.subtitle}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#8a8a9e] tracking-wider uppercase">
              Presence &middot; Truth
            </span>
          </div>

          {/* Card Title */}
          <h2 className="font-playfair text-xl sm:text-2xl md:text-3xl font-normal text-[#f4f4f8] mb-4 tracking-wide leading-snug">
            {cfg.title}
          </h2>

          {/* 1. The Raw Chat Message & Reflection */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center space-x-2 text-[#e4b5c0] text-xs font-cinzel tracking-wider">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>What You Said &amp; Why It Struck My Heart</span>
            </div>

            {/* Clickable Screenshot of the message */}
            <div
              onClick={() => setLightboxImage(mediaCfg.offlineChatUrl)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/15 bg-[#050508] p-2 sm:p-3 transition-all duration-300 hover:border-[#a82435]/60 hover:bg-[#0c0c14]"
              title="Click to inspect chat screenshot"
            >
              <div className="relative overflow-hidden rounded-xl">
                <img
                  src={mediaCfg.offlineChatUrl}
                  alt="Screenshot of chat message: bhai yrr app offline aur online bohot hii alag hoo..."
                  className="w-full h-auto object-contain max-h-[140px] sm:max-h-[170px] rounded-lg transition-transform duration-500 group-hover:scale-[1.01]"
                  loading="lazy"
                />
                <div className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3 h-3" />
                </div>
              </div>
              <p className="mt-2 text-[11px] font-mono text-[#8a8a9c] italic text-center">
                &ldquo;{cfg.chatQuote}&rdquo;
              </p>
            </div>

            {/* Reflection on Online Misunderstandings vs Offline Warmth */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 font-cormorant text-base sm:text-lg text-[#dedee8] italic leading-relaxed">
              <p className="mb-2.5 text-[#f0f0f8] font-normal not-italic font-serif text-sm sm:text-base">
                Why screen arguments hurt so deeply:
              </p>
              <p className="text-[#cacad8] mb-3">
                {cfg.reflection}
              </p>
              <div className="pt-2 border-t border-white/10 flex items-start space-x-2 text-xs font-sans not-italic text-[#f2bcc8]">
                <Heart className="w-3.5 h-3.5 mt-0.5 shrink-0 fill-[#f2bcc8]/30" />
                <span>{cfg.promise}</span>
              </div>
            </div>
          </div>

          {/* 2. Direct DM Meeting Arrangement Section */}
          <div className="p-5 sm:p-6 rounded-2xl bg-[#0e0e16]/90 border border-white/15 space-y-4 shadow-xl">
            <div className="flex items-center space-x-2 text-[#e4b5c0] text-xs font-cinzel tracking-wider">
              <Send className="w-4 h-4 text-[#f0b0bd]" />
              <span>Arrange Where &amp; When We Meet</span>
            </div>

            <div className="space-y-1.5">
              <h3 className="font-playfair text-lg sm:text-xl text-[#f5f5fa] font-normal leading-snug">
                Where should we meet and arrange time each day?
              </h3>
              <p className="text-xs sm:text-sm text-[#c8c8d8] font-serif leading-relaxed">
                Tell me in my DM. Whenever you are interested to meet, please send me a DM so we can decide the spot and time together in real life.
              </p>
            </div>

            {/* Ready-to-copy suggested DM text card */}
            <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-[#e0e0ec] leading-relaxed relative">
              <div className="text-[10px] font-cinzel tracking-wider uppercase text-[#a8a8ba] mb-1.5 flex items-center justify-between">
                <span>Suggested message to send in DM</span>
                <span className="text-[#f0b0bd]">Tap to copy</span>
              </div>
              <p className="font-serif italic text-sm text-[#f2f2fa]">
                &ldquo;{dmTextToCopy}&rdquo;
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-[#9a9aa8] font-sans">
                If you are interested to meet, please DM me this message.
              </span>
              <button
                type="button"
                onClick={handleCopyDMText}
                className="flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#6b1220] to-[#8f192b] hover:from-[#7e1526] hover:to-[#a31c31] text-white text-xs font-serif font-medium tracking-wide shadow-lg transition-all active:scale-[0.98] shrink-0"
              >
                {copiedDM ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>DM Text Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-white/90" />
                    <span>Copy DM Text to Message Me</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. The Last Thing: Secret Surprise Keepsake in Permanent Blur Form */}
          <div className="mt-7 pt-5 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[#e4b5c0] text-xs font-cinzel tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-[#f0b0bd]" />
                <span>A Surprise Keepsake &middot; Always Softly Veiled</span>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-[#d0b0c0] bg-white/[0.06] px-2.5 py-0.5 rounded-full border border-white/15">
                Always in Blur
              </span>
            </div>

            {/* Photo container permanently blurred as requested */}
            <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/90 aspect-[3/1] sm:aspect-[3.4/1] shadow-2xl">
              <img
                src={mediaCfg.moonEyeUrl}
                alt="A surprise memory kept permanently in blur form"
                className="w-full h-full object-cover object-center filter blur-xl scale-125 select-none pointer-events-none"
                loading="lazy"
              />
              {/* Subtle vignette and warm gothic glow */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/55 pointer-events-none" />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center pointer-events-none">
                <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-1.5 shadow-lg">
                  <Sparkles className="w-3.5 h-3.5 text-[#f0b0bd]" />
                </div>
                <p className="font-playfair text-sm sm:text-base text-[#f5f5fa] tracking-wide">
                  Our Sacred Surprise
                </p>
                <p className="font-cormorant italic text-xs sm:text-sm text-[#d4b8c2] max-w-md mt-0.5">
                  Always held in this gentle, mysterious blur &mdash; a secret smile and an eternal promise between us and the stars.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-[#8a8a99] font-cinzel uppercase tracking-[0.2em]">
            <span>Forever Your Moontwin</span>
            <span>Zero Mind Games &middot; Only Real Presence</span>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for inspecting images in high fidelity */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full max-h-[90vh] overflow-hidden rounded-2xl bg-[#0c0c14] border border-white/20 shadow-2xl p-2 sm:p-4 flex flex-col items-center"
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/90 transition-colors z-10"
              aria-label="Close image preview"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImage}
              alt="Enlarged memory view"
              className="w-full h-auto max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </>
  );
};
