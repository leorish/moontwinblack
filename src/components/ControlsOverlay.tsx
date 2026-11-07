import React, { useState } from 'react';
import { RotateCcw, Heart, Share2, X, Check, Box, Camera } from 'lucide-react';
import { GardenParams } from '../garden/types';
import { GARDEN_CONFIG } from '../garden/config';

interface ControlsOverlayProps {
  onReplay: () => void;
  params: GardenParams;
  onUpdateParams: (newParams: Partial<GardenParams>) => void;
  onToggle3D?: () => void;
  is3DMode?: boolean;
  getCanvas?: () => HTMLCanvasElement | null;
}

export const ControlsOverlay: React.FC<ControlsOverlayProps> = ({
  onReplay,
  params,
  onUpdateParams,
  onToggle3D,
  is3DMode = false,
  getCanvas,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedToast, setCapturedToast] = useState(false);

  // Form local state
  const [countInput, setCountInput] = useState(params.count || 99);

  const activeMoon = params.moon || 'waxing-crescent';
  const activeHemisphere = params.hemisphere || 'north';

  // High-resolution garden snapshot with gothic watermark & dedication
  const handleCaptureSnapshot = async () => {
    if (isCapturing) return;
    setIsCapturing(true);

    try {
      // 1. Locate active canvas (either 2D GardenCanvas or 3D Three.js canvas)
      let sourceCanvas = getCanvas?.();
      if (!sourceCanvas) {
        sourceCanvas = document.querySelector('main canvas') as HTMLCanvasElement | null;
      }

      if (!sourceCanvas) {
        setIsCapturing(false);
        return;
      }

      const width = sourceCanvas.width;
      const height = sourceCanvas.height;

      // Create offscreen export canvas
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = width;
      exportCanvas.height = height;
      const ctx = exportCanvas.getContext('2d');

      if (!ctx) {
        setIsCapturing(false);
        return;
      }

      // 2. Draw active garden frame
      ctx.drawImage(sourceCanvas, 0, 0, width, height);

      // 3. Add soft dark romance gradient overlay at bottom
      const gradientHeight = Math.min(height * 0.28, 220);
      const grad = ctx.createLinearGradient(0, height - gradientHeight, 0, height);
      grad.addColorStop(0, 'rgba(5, 5, 7, 0)');
      grad.addColorStop(0.5, 'rgba(5, 5, 7, 0.7)');
      grad.addColorStop(1, 'rgba(5, 5, 7, 0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, height - gradientHeight, width, gradientHeight);

      // 4. Render typographic dedication & gothic branding watermark
      const recipient = params.to || GARDEN_CONFIG.defaults.to;
      const roseCount = params.count || 99;
      const moonPhaseName = (params.moon || 'waxing-crescent').replace('-', ' ').toUpperCase();

      const baseScale = Math.max(1, Math.min(width, height) / 800);
      const leftMargin = 32 * baseScale;
      const bottomMargin = 26 * baseScale;

      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';

      // Recipient title
      ctx.fillStyle = '#f5eedb';
      ctx.font = `600 ${Math.round(20 * baseScale)}px "Playfair Display", "Cinzel", Georgia, serif`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 8 * baseScale;
      ctx.fillText(`Dedicated to ${recipient}`, leftMargin, height - bottomMargin - (18 * baseScale));

      // Rose count & Moon Phase details
      ctx.fillStyle = '#b0b0c2';
      ctx.font = `400 ${Math.round(11 * baseScale)}px "Cinzel", Georgia, serif`;
      ctx.shadowBlur = 4 * baseScale;
      ctx.fillText(`${roseCount} VELVET BLACK ROSES · ${moonPhaseName} MOON · ETERNAL DEVOTION`, leftMargin, height - bottomMargin);

      // Bottom right watermark
      ctx.textAlign = 'right';
      ctx.fillStyle = '#8a8a9a';
      ctx.font = `500 ${Math.round(10 * baseScale)}px "Cinzel", Georgia, serif`;
      ctx.fillText('GARDEN OF BLACK ROSES', width - leftMargin, height - bottomMargin);

      ctx.restore();

      // 5. Trigger instant download
      const dataUrl = exportCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      const safeName = recipient.toLowerCase().replace(/[^a-z0-9]/g, '-');
      link.download = `garden-of-black-roses-${safeName}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 6. Show toast notification
      setCapturedToast(true);
      setTimeout(() => setCapturedToast(false), 3000);
    } catch (err) {
      console.error('Failed to capture garden snapshot:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleOpenModal = () => {
    setCountInput(params.count || 99);
    setIsModalOpen(true);
  };

  const handleSaveAndShare = () => {
    const updated = {
      to: params.to || GARDEN_CONFIG.defaults.to,
      count: Math.max(
        GARDEN_CONFIG.roses.minCount,
        Math.min(GARDEN_CONFIG.roses.maxCount, countInput)
      ),
      customMessage: params.customMessage,
      moon: activeMoon,
      hemisphere: activeHemisphere,
    };

    onUpdateParams(updated);

    // Build URL
    const url = new URL(window.location.href);
    url.searchParams.set('to', updated.to);
    url.searchParams.set('count', updated.count.toString());
    if (updated.customMessage) {
      url.searchParams.set('message', updated.customMessage);
    } else {
      url.searchParams.delete('message');
    }
    if (activeMoon !== 'waxing-crescent') {
      url.searchParams.set('moon', activeMoon);
    } else {
      url.searchParams.delete('moon');
    }
    if (activeHemisphere === 'south') {
      url.searchParams.set('hemisphere', 'south');
    } else {
      url.searchParams.delete('hemisphere');
    }
    window.history.replaceState({}, '', url.toString());

    // Copy to clipboard
    navigator.clipboard?.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });

    setIsModalOpen(false);
    onReplay();
  };

  return (
    <>
      {/* Controls Bar with Safe Area Insets */}
      <div
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 flex items-center space-x-2 sm:space-x-3 pointer-events-auto"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        {/* Dedicate / Personalize Modal trigger */}
        <button
          onClick={handleOpenModal}
          aria-label="Dedicate garden & customize"
          title="Dedicate roses to someone"
          className="flex items-center space-x-1.5 px-3 py-2 rounded-full bg-[#121217]/70 text-[#a0a0b0] hover:text-white hover:bg-[#1f1f26]/90 border border-white/10 opacity-40 hover:opacity-100 transition-all duration-300 backdrop-blur-md shadow-lg text-xs font-serif focus:outline-none focus:ring-1 focus:ring-white/30"
        >
          <Heart size={14} className="text-[#a82435]" />
          <span className="hidden sm:inline">Dedicate</span>
        </button>

        {/* Capture Snapshot Button */}
        <button
          onClick={handleCaptureSnapshot}
          disabled={isCapturing}
          aria-label="Capture and download garden snapshot image"
          title="Download garden picture with dedication"
          className="flex items-center space-x-1.5 px-3 py-2 rounded-full bg-[#121217]/70 text-[#a0a0b0] hover:text-white hover:bg-[#1f1f26]/90 border border-white/10 opacity-35 hover:opacity-100 transition-all duration-300 backdrop-blur-md shadow-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-white/30 disabled:opacity-20"
        >
          <Camera size={14} className={isCapturing ? 'animate-pulse text-[#e0a8b5]' : 'text-current'} />
          <span className="hidden sm:inline">{isCapturing ? 'Saving...' : 'Capture'}</span>
        </button>

        {/* Three.js 3D Velvet Sanctuary Toggle */}
        {onToggle3D && (
          <button
            onClick={onToggle3D}
            aria-label={is3DMode ? 'Switch to 2D Garden' : 'Inspect 3D Velvet Rose Sanctuary'}
            title={is3DMode ? '2D Garden' : '3D Studio PBR Sanctuary'}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-full border transition-all duration-300 backdrop-blur-md shadow-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-white/30 ${
              is3DMode
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 opacity-90'
                : 'bg-[#121217]/70 text-[#a0a0b0] hover:text-white hover:bg-[#1f1f26]/90 border-white/10 opacity-35 hover:opacity-100'
            }`}
          >
            <Box size={14} className={is3DMode ? 'text-emerald-400' : 'text-current'} />
            <span className="hidden sm:inline">{is3DMode ? '2D View' : '3D Rose'}</span>
          </button>
        )}

        {/* Replay button */}
        <button
          onClick={onReplay}
          aria-label="Replay animation"
          title="Replay bloom animation"
          className="flex items-center space-x-1.5 px-3 py-2 rounded-full bg-[#121217]/70 text-[#a0a0b0] hover:text-white hover:bg-[#1f1f26]/90 border border-white/10 opacity-35 hover:opacity-100 transition-all duration-300 backdrop-blur-md shadow-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-white/30"
        >
          <RotateCcw size={14} />
          <span>Replay</span>
        </button>
      </div>

      {/* Copy link toast feedback */}
      {copied && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#14141c]/95 border border-[#8a8a99]/40 text-[#f0f0f5] px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center space-x-2 text-xs font-cinzel">
          <Check size={14} className="text-emerald-400" />
          <span>Personal dedication link copied!</span>
        </div>
      )}

      {/* Capture image toast feedback */}
      {capturedToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#14141c]/95 border border-[#8a8a99]/40 text-[#f0f0f5] px-4 py-2 rounded-full shadow-2xl backdrop-blur-md flex items-center space-x-2 text-xs font-cinzel">
          <Camera size={14} className="text-[#f0b0bd]" />
          <span>Garden memory saved as image!</span>
        </div>
      )}

      {/* Dedication Customizer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="bg-[#0c0c10] border border-white/15 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative"
          >
            {/* Close button */}
            <button
              onClick={() => setIsModalOpen(false)}
              aria-label="Close dialog"
              className="absolute top-4 right-4 text-[#8a8a99] hover:text-white p-1"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="text-center mb-6">
              <span className="text-xs font-cinzel tracking-[0.25em] text-[#8a8a99] uppercase">
                Dark Romance Dedication
              </span>
              <h2 id="modal-title" className="text-2xl font-playfair font-normal mt-1">
                Plant Your Black Roses
              </h2>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center text-xs font-mono text-[#a0a0b0] mb-1">
                  <label htmlFor="rose-count-range">Rose Count</label>
                  <span className="text-white font-serif">{countInput} roses</span>
                </div>
                <input
                  id="rose-count-range"
                  type="range"
                  min={GARDEN_CONFIG.roses.minCount}
                  max={GARDEN_CONFIG.roses.maxCount}
                  value={countInput}
                  onChange={(e) => setCountInput(parseInt(e.target.value, 10))}
                  className="w-full accent-[#8b1828] bg-white/10 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#6a6a7a] font-mono mt-1">
                  <span>{GARDEN_CONFIG.roses.minCount}</span>
                  <span>Default: 99</span>
                  <span>{GARDEN_CONFIG.roses.maxCount}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex space-x-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-white/15 text-[#a0a0b0] hover:text-white hover:bg-white/5 text-xs font-mono transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAndShare}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[#5a0c16] to-[#801322] hover:from-[#6b0f1b] hover:to-[#991729] text-white text-xs font-serif font-semibold tracking-wide shadow-lg transition-all"
              >
                <Share2 size={13} />
                <span>Save & Share Link</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
