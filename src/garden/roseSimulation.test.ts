import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGardenParams,
  generateRoses,
  generateSparkles,
  computeWindOffset,
  computeCandleBreathingIntensity,
  updatePointerSprings,
  generateParticles,
  generateEmberParticles,
  updateEmberParticles,
  computeRoseBreathingPulse,
  computeTravelingWindGust,
  createInitialMoonState,
  generateGrass,
  easeOutCubic,
  easeInOutSine,
  updateMoonState,
} from './roseSimulation';
import { GARDEN_CONFIG } from './config';

test('parseGardenParams handles defaults and URL overrides correctly', () => {
  // Test defaults - to is Prachi, count is 99
  const def = parseGardenParams('');
  assert.equal(def.to, 'Prachi');
  assert.equal(def.count, 99);
  assert.equal(def.customMessage, undefined);

  // Test custom parameters
  const custom = parseGardenParams('?to=Aisha&count=99&message=Always+and+forever');
  assert.equal(custom.to, 'Aisha');
  assert.equal(custom.count, 99);
  assert.equal(custom.customMessage, 'Always and forever');

  // Test bounds clamping on count
  const low = parseGardenParams('?count=3');
  assert.equal(low.count, GARDEN_CONFIG.roses.minCount);

  const high = parseGardenParams('?count=500');
  assert.equal(high.count, GARDEN_CONFIG.roses.maxCount);
});

test('generateRoses produces 99 roses plus one sunflower and one rose', () => {
  const roses = generateRoses(undefined, 1200, 800, 12345);

  // 99 roses + 1 sunflower + 1 scarlet rose = 101 flowers
  assert.equal(roses.length, 101);

  // Exactly 1 sunflower
  const sunflowers = roses.filter(r => r.flowerKind === 'sunflower');
  assert.equal(sunflowers.length, 1);
  assert.equal(sunflowers[0].layer, 2, 'Sunflower should be in front layer');

  // Exactly 1 special rose (scarlet)
  const scarletRoses = roses.filter(r => r.flowerKind === 'scarletRose');
  assert.equal(scarletRoses.length, 1);
  assert.equal(scarletRoses[0].layer, 2, 'Special rose should be in front layer');

  // Exactly 99 black and wine roses
  const standardRoses = roses.filter(r => r.flowerKind === 'blackRose' || r.flowerKind === 'wineRose');
  assert.equal(standardRoses.length, 99);

  // All 3 depth layers populated
  assert.ok(roses.filter(r => r.layer === 0).length > 0);
  assert.ok(roses.filter(r => r.layer === 1).length > 0);
  assert.ok(roses.filter(r => r.layer === 2).length > 0);

  // Wine rose ratio ~10-15% of standard roses
  const wineCount = standardRoses.filter(r => r.isWine).length;
  const wineRatio = wineCount / standardRoses.length;
  assert.ok(wineRatio >= 0.05 && wineRatio <= 0.25);
});

test('generateSparkles attaches 15-25 sparkles exclusively to front-row roses', () => {
  const roses = generateRoses(80, 1200, 800, 42);
  const sparkles = generateSparkles(roses, 99);

  assert.ok(sparkles.length >= 15 && sparkles.length <= 25);

  const frontRoseIds = new Set(roses.filter(r => r.layer === 2).map(r => r.id));
  for (const s of sparkles) {
    assert.ok(frontRoseIds.has(s.roseId), 'Sparkles must be on front-row roses only');
    assert.ok(s.period >= 2.0 && s.period <= 4.0, 'Sparkle period in 2-4s range');
  }
});

test('breathing candle intensity oscillates between 85% and 100% over 6 seconds', () => {
  const t0 = computeCandleBreathingIntensity(0);
  const t15 = computeCandleBreathingIntensity(1.5);
  const t3 = computeCandleBreathingIntensity(3.0);
  const t45 = computeCandleBreathingIntensity(4.5);
  const t6 = computeCandleBreathingIntensity(6.0);

  // Must strictly stay within [0.85, 1.0]
  [t0, t15, t3, t45, t6].forEach(val => {
    assert.ok(val >= 0.849 && val <= 1.001, `Intensity ${val} must be between 0.85 and 1.0`);
  });

  // Cycle repeats at 6s
  assert.ok(Math.abs(t0 - t6) < 0.001, 'Should repeat after 6 seconds');
});

test('updatePointerSprings smoothly defects nearby roses and springs back', () => {
  const roses = generateRoses(20, 1000, 1000, 111);
  const targetRose = roses[5];

  // Rose near pointer (within radius 140)
  updatePointerSprings(roses, targetRose.tipX + 20, targetRose.tipY, 0.016);
  assert.ok(targetRose.pointerVelocity !== 0 || targetRose.pointerDeflection !== 0);

  // When pointer leaves (null), spring returns toward zero
  for (let step = 0; step < 50; step++) {
    updatePointerSprings(roses, null, null, 0.016);
  }
  assert.ok(Math.abs(targetRose.pointerDeflection) < 0.05, 'Rose should spring back near 0');
});

test('easing functions are bounded and smooth', () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
  assert.ok(easeOutCubic(0.5) > 0.5); // Ease out is faster at start

  assert.equal(easeInOutSine(0), 0);
  assert.equal(easeInOutSine(1), 1);
  assert.ok(Math.abs(easeInOutSine(0.5) - 0.5) < 0.001);
});

test('generateEmberParticles generates glowing embers with warm tones and halos', () => {
  const embers = generateEmberParticles(30, 1000, 800, 789);
  assert.equal(embers.length, 30);

  for (const e of embers) {
    assert.ok(e.baseSize >= GARDEN_CONFIG.embers.minSize && e.baseSize <= GARDEN_CONFIG.embers.maxSize);
    assert.ok(e.glowRadius >= GARDEN_CONFIG.embers.minGlow && e.glowRadius <= GARDEN_CONFIG.embers.maxGlow);
    assert.ok(e.vy < 0, 'Embers must drift upward (negative vy)');
    assert.ok(e.colorCore.includes('rgba'), 'Ember must have rgba core color prefix');
    assert.ok(e.colorGlow.includes('rgba'), 'Ember must have rgba glow color prefix');
  }
});

test('updateEmberParticles advances life and maintains boundary constraints', () => {
  const embers = generateEmberParticles(10, 800, 600, 101);
  const initialY = embers[0].y;

  // Step forward 1 second
  updateEmberParticles(embers, 800, 600, 1.0, 5.0);

  // First ember should have progressed upward or cycled
  assert.ok(embers[0].life > 0);
  for (const e of embers) {
    assert.ok(e.x >= -25 && e.x <= 825, 'Embers stay within horizontal bounds');
    assert.ok(e.alpha >= 0 && e.alpha <= 1.0, 'Alpha remains bounded in [0, 1]');
  }
});

test('computeRoseBreathingPulse creates gentle moonlight breathing oscillation for bloomed roses', () => {
  // Before bloom (< 0.9), breathing pulse should be neutral 1.0
  const unbloomed = computeRoseBreathingPulse(10.0, 0, 0.5);
  assert.equal(unbloomed.scalePulse, 1.0);
  assert.equal(unbloomed.sheen, 0);

  // Fully bloomed (1.0)
  const p1 = computeRoseBreathingPulse(0, 0, 1.0);
  const p2 = computeRoseBreathingPulse(Math.PI / (2 * GARDEN_CONFIG.roses.breathing.frequency), 0, 1.0);

  // Scale pulse should subtly swell (~0.97 to ~1.03)
  assert.ok(p1.scalePulse >= 0.96 && p1.scalePulse <= 1.04);
  assert.ok(p2.scalePulse >= 0.96 && p2.scalePulse <= 1.04);
  assert.ok(p2.scalePulse > p1.scalePulse, 'At peak of sine wave scale pulse should swell');
  assert.ok(p2.sheen > 0, 'Moonlight sheen appears on breathing inhale');
});

test('parseGardenParams parses moon phase and auto parameter', () => {
  const fullMoon = parseGardenParams('?moon=full');
  assert.equal(fullMoon.moon, 'full');

  const crescent = parseGardenParams('?moon=crescent');
  assert.equal(crescent.moon, 'waxing-crescent');

  const quarter = parseGardenParams('?moon=quarter');
  assert.equal(quarter.moon, 'first-quarter');

  const gibbous = parseGardenParams('?moon=gibbous');
  assert.equal(gibbous.moon, 'waxing-gibbous');

  const newMoon = parseGardenParams('?moon=new');
  assert.equal(newMoon.moon, 'new');

  const autoMoon = parseGardenParams('?moon=auto');
  assert.equal(autoMoon.moon, 'auto');

  // Default is waxing-crescent as requested
  const defaultMoon = parseGardenParams('');
  assert.equal(defaultMoon.moon, 'waxing-crescent');
  assert.equal(defaultMoon.hemisphere, 'north');

  // Hemisphere parameter parsing
  const southMoon = parseGardenParams('?hemisphere=south');
  assert.equal(southMoon.hemisphere, 'south');
});

test('computeTravelingWindGust propagates wave across screen width', () => {
  const gustState = {
    active: true,
    startTime: 10.0,
    duration: 4.0,
    nextGustTime: 20.0,
    direction: 1 as const,
    peakStrengthDeg: 4.0,
    waveSpeed: 1.8,
  };

  // At time 10.5s:
  // Left side (x = 0) has wave delay 0s, so localTime = 0.5s -> inside rampUp (gust active)
  const angleLeft = computeTravelingWindGust(10.5, 0, 1000, gustState, 0);

  // Right side (x = 1000) has wave delay 1.8s, so localTime = 10.5 - 10.0 - 1.8 = -1.3s -> gust hasn't arrived yet!
  const angleRight = computeTravelingWindGust(10.5, 1000, 1000, gustState, 0);

  // Left side should experience noticeable gust lean compared to right side
  assert.ok(angleLeft > angleRight, 'Gust wave hits left side before right side');

  // At time 12.0s:
  // Now right side localTime is 12.0 - 10.0 - 1.8 = 0.2s -> gust has arrived at right side
  const angleRightLater = computeTravelingWindGust(12.0, 1000, 1000, gustState, 0);
  assert.ok(angleRightLater > 0, 'Gust reaches the far side with positive lean');
});

test('MoonState auto-cycle advances phase and crossfades', () => {
  const moonState = createInitialMoonState('auto');
  assert.equal(moonState.isAuto, true);
  assert.equal(moonState.currentPhase, 'waxing-crescent');

  // Advance time past 20s autoCycleDuration to trigger phase change to next phase (first-quarter)
  const triggered = updateMoonState(moonState, 20.1, 20.1);
  assert.equal(triggered.targetPhase, 'first-quarter');

  // Step 0.4s into crossfade (total duration 1.2s)
  const inProgress = updateMoonState(triggered, 20.5, 0.4);
  assert.ok(inProgress.transitionProgress < 1.0, 'Transition is in progress');
  assert.ok(inProgress.transitionProgress > 0, 'Transition has started');

  // Step remaining time to complete crossfade
  const completed = updateMoonState(inProgress, 22.0, 1.2);
  assert.equal(completed.currentPhase, 'first-quarter');
  assert.equal(completed.transitionProgress, 1.0);
});
