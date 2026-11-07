import React from 'react';
import { Sprout, Flower2, Heart, Sparkles } from 'lucide-react';

interface GrowthTimelineProps {
  elapsedTime: number;
  onSeek?: (targetSeconds: number) => void;
  prefersReducedMotion: boolean;
}

interface TimelineStage {
  id: string;
  name: string;
  timestamp: number; // seconds
  percent: number;    // % along 0-5s bar
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const STAGES: TimelineStage[] = [
  { id: 'stems', name: 'Stems', timestamp: 0, percent: 0, icon: Sprout },
  { id: 'buds', name: 'Buds', timestamp: 1.8, percent: 36, icon: Sparkles },
  { id: 'bloom', name: 'Bloom', timestamp: 3.2, percent: 64, icon: Flower2 },
  { id: 'forever', name: 'Forever', timestamp: 5.0, percent: 100, icon: Heart },
];

export const GrowthTimeline: React.FC<GrowthTimelineProps> = ({
  elapsedTime,
  onSeek,
  prefersReducedMotion,
}) => {
  const maxTime = 5.0; // 5s reveal sequence
  const currentProgress = prefersReducedMotion
    ? 100
    : Math.min(100, Math.max(0, (elapsedTime / maxTime) * 100));

  // Determine active stage name
  let activeStageIndex = 0;
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (elapsedTime >= STAGES[i].timestamp) {
      activeStageIndex = i;
      break;
    }
  }

  const isCompleted = elapsedTime >= maxTime;

  return (
    <nav
      aria-label="Garden growth timeline"
      className="absolute bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 w-11/12 max-w-md pointer-events-auto"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="bg-[#0e0e13]/80 border border-white/10 backdrop-blur-md rounded-2xl px-4 py-2.5 shadow-2xl transition-all duration-500">
        {/* Timeline Header / Status label */}
        <div className="flex justify-between items-center text-[11px] font-cinzel tracking-wider text-[#9898a8] mb-2 select-none">
          <span className="flex items-center space-x-1.5 text-white/90">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#a82435] animate-pulse"></span>
            <span>{isCompleted ? 'Eternal Garden' : `Phase: ${STAGES[activeStageIndex].name}`}</span>
          </span>
          <span className="font-mono text-[10px] text-[#7a7a8a]">
            {isCompleted ? '5.0s / 5.0s' : `${Math.min(5.0, elapsedTime).toFixed(1)}s / 5.0s`}
          </span>
        </div>

        {/* Progress Track */}
        <div
          role="progressbar"
          aria-valuenow={Math.round(currentProgress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Growth progression timeline"
          className="relative h-1.5 w-full bg-white/10 rounded-full overflow-visible mb-2 cursor-pointer group"
          onClick={(e) => {
            if (!onSeek) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            onSeek(ratio * maxTime);
          }}
        >
          {/* Filled progress bar */}
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#5a0c16] via-[#8b1828] to-[#d6384f] transition-all duration-100 relative"
            style={{ width: `${currentProgress}%` }}
          >
            {/* Glowing scrubber thumb head */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full bg-[#f4f4f7] border-2 border-[#8b1828] shadow-[0_0_8px_rgba(214,56,79,0.8)]" />
          </div>

          {/* Stage Node Markers */}
          {STAGES.map((stage, idx) => {
            const isReached = currentProgress >= stage.percent;
            const isCurrent = activeStageIndex === idx && !isCompleted;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSeek?.(stage.timestamp);
                }}
                title={`Jump to ${stage.name} (${stage.timestamp}s)`}
                aria-label={`Jump to stage: ${stage.name}`}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none"
                style={{ left: `${stage.percent}%` }}
              >
                <span
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isCurrent
                      ? 'w-2.5 h-2.5 bg-white ring-2 ring-[#a82435] shadow-[0_0_8px_#a82435]'
                      : isReached
                      ? 'bg-[#a82435]'
                      : 'bg-[#252530] border border-white/20'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Stage Labels Row */}
        <div className="flex justify-between items-center text-[10px] font-serif select-none px-0.5">
          {STAGES.map((stage, idx) => {
            const isReached = currentProgress >= stage.percent;
            const isCurrent = activeStageIndex === idx && !isCompleted;
            const Icon = stage.icon;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onSeek?.(stage.timestamp)}
                className={`flex items-center space-x-1 transition-all duration-300 focus:outline-none ${
                  isCurrent
                    ? 'text-white font-medium drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]'
                    : isReached
                    ? 'text-[#d4a0a8]'
                    : 'text-[#606070] hover:text-[#888898]'
                }`}
              >
                <Icon size={10} className={isCurrent ? 'text-[#ff6b81]' : isReached ? 'text-[#a82435]' : 'text-[#454555]'} />
                <span>{stage.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
