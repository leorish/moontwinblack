/**
 * Garden of Black Roses - Master Configuration
 * All main artistic parameters, timing phases, colors, and performance targets.
 */

export const GARDEN_CONFIG = {
  // Default text and devotion letter for Prachi
  defaults: {
    to: 'Prachi',
    count: 99, // Planted 99 black roses
    subtitle: 'FOREVER & ALWAYS',
    moontwinSubtitle: 'MY MOONTWIN & ONLY FAVORITE PERSON',
    letter: 'Prachi, my moontwin and only favorite person, my soul aches deeply for the pain I caused you. You are the silent gravity pulling my world together, the single light that guides me through the heaviest darkness. I promise we will fix this together, breaking down the psychological barriers and subconscious walls between us. Every breath I take carries a quiet devotion to shielding your heart, refusing to manipulate your emotions or play mind games. You hold my entire universe in your hands, forever and always.',
    paragraphs: [
      'Prachi, my moontwin and only favorite person, my soul aches deeply for the pain I caused you.',
      'You are the silent gravity pulling my world together, the single light that guides me through the heaviest darkness.',
      'I promise we will fix this together, breaking down the psychological barriers and subconscious walls between us.',
      'Every breath I take carries a quiet devotion to shielding your heart, refusing to manipulate your emotions or play mind games.',
      'You hold my entire universe in your hands, forever and always.',
    ],
    line1Prefix: 'I planted ',
    line1Suffix: ' black roses for you.',
    line2: 'Not one of them will ever wilt.',
    line3: 'Neither will how I feel about you.',
  },

  // Romantic media memory assets (User uploaded photo, video, moon eyes & chat)
  media: {
    photoUrl: '/assets/aistudio/Screenshot_2026-10-25_at_11.04.12_PM_3586af36.png',
    videoUrl: '/assets/aistudio/btw.twixyy__2026-09-12T171323.000Z_eb7561d6.mp4',
    videoMirrorUrl: '/assets/aistudio/moonvideomirror_0d7570a9.mp4',
    moonEyeUrl: '/assets/aistudio/moon_eye_b44904ad.jpg',
    offlineChatUrl: '/assets/aistudio/image_e02ca010.png',
    photoSubtitle: 'PRECIOUS MOMENT',
    videoSubtitle: 'OUR MOONTWIN SMILE',
    videoMirrorSubtitle: 'MY SAIBO & SMILES',
    moonEyeSubtitle: 'THOSE MOONTWIN EYES',
  },

  // Offline Heart-to-Heart Meeting & Devotion Configuration
  offlineMeeting: {
    title: 'Offline Is Where We Truly Live',
    subtitle: 'A PROMISE FOR REAL PRESENCE OVER COLD SCREENS',
    chatQuote:
      'bhai yrr app offline aur online bohot hii alag hoo yrr aap online baat matt kia karo merse mujhe gusaa chadhta haii aap offline hii baat kiyaa karo merse okayyy',
    reflection:
      'You are entirely right. Through screens, words lose their warmth, tone gets misunderstood, and silly anger finds a way in. But offline—in front of each other—there are no fake walls, no overthinking, just real smiles, real understanding, and the person I truly am with you.',
    promise:
      'I promise to save our deepest feelings, our heart-to-hearts, and our most important moments for when we are together in person.',
    meetingSpots: [
      {
        id: 'cafe',
        name: 'The Quiet Corner Café',
        description: 'Warm coffee, quiet table, zero phone screens—just two hours of listening to you talk about anything and everything.',
        tag: 'Warm & Cozy',
      },
      {
        id: 'walk',
        name: 'Moonlit Twilight Walk',
        description: 'Under the cool night breeze and crescent moon, walking slowly side by side where words flow naturally and calmly.',
        tag: 'Peaceful & Unhurried',
      },
      {
        id: 'rooftop',
        name: 'Rooftop Sunset Spot',
        description: 'Watching the sky turn from deep crimson to midnight blue, clearing away every misunderstanding face-to-face.',
        tag: 'Scenic & Intimate',
      },
      {
        id: 'custom',
        name: 'Wherever You Feel Safest',
        description: 'Any place in this world where your shoulders drop, you feel heard, and you know you are loved unconditionally.',
        tag: 'Your Choice Always',
      },
    ],
  },

  // Glowing ember particles drifting sporadically from the bottom of canvas
  embers: {
    count: 32,
    minVy: -0.55,
    maxVy: -1.25,
    minSize: 1.8,
    maxSize: 3.6,
    minGlow: 8,
    maxGlow: 18,
  },

  // Rose population settings
  roses: {
    defaultCount: 99,
    minCount: 15,
    maxCount: 140,
    wineRoseRatio: 0.12, // 10-15% of roses in deep wine/dark crimson (#2a0610)
    // Breathing/pulsing animation once fully bloomed
    breathing: {
      frequency: 1.15,      // ~5.5s cycle for organic rhythmic breathing
      scaleAmplitude: 0.028, // subtle ~2.8% scale expansion
      moonlightSheenMax: 0.16,
    },
    depthLayers: [
      {
        id: 0,
        name: 'back',
        countRatio: 0.32,
        scaleRangePC: [0.5, 0.68],
        scaleRangeMobile: [0.55, 0.74],
        yPositionRatioPC: [0.38, 0.58],
        yPositionRatioMobile: [0.42, 0.60],
        opacity: 0.65,
        stemWidth: 1.5,
      },
      {
        id: 1,
        name: 'mid',
        countRatio: 0.40,
        scaleRangePC: [0.72, 0.98],
        scaleRangeMobile: [0.78, 1.05],
        yPositionRatioPC: [0.55, 0.78],
        yPositionRatioMobile: [0.58, 0.78],
        opacity: 0.88,
        stemWidth: 2.2,
      },
      {
        id: 2,
        name: 'front',
        countRatio: 0.28,
        scaleRangePC: [1.05, 1.42],
        scaleRangeMobile: [1.15, 1.52],
        yPositionRatioPC: [0.75, 0.94],
        yPositionRatioMobile: [0.76, 0.93],
        opacity: 1.0,
        stemWidth: 3.2,
      },
    ],
  },

  // Sparkles on front-row roses
  sparkles: {
    count: 22,
    color: '#d8dce6',
    minPeriod: 2.0,
    maxPeriod: 4.0,
    minScale: 0.3,
    maxScale: 1.0,
    maxOpacity: 0.9,
  },

  // Interactive pointer push physics
  pointer: {
    radius: 140,
    maxPushAngle: 0.14,
    spring: 0.08,
    damping: 0.85,
  },

  // Color palette definitions
  colors: {
    // Dynamic Ambient Light Shift (Deep Navy -> Warmer Midnight Purple)
    ambientLight: {
      navy: {
        bg: '#040509',
        inner: { r: 9, g: 15, b: 32, a: 0.48 },
        mid: { r: 5, g: 8, b: 20, a: 0.86 },
        outer: '#040509',
      },
      midnightPurple: {
        bg: '#06040b',
        inner: { r: 35, g: 12, b: 42, a: 0.52 },
        mid: { r: 18, g: 6, b: 24, a: 0.88 },
        outer: '#06040b',
      },
      transitionDuration: 5.0, // shifts smoothly over 5s as roses bloom
    },

    // Bottom-center breathing deep-red candle glow: #7a0c1c fading to #2a0508
    candleDeepRedGlow: {
      inner: 'rgba(122, 12, 28, 0.24)',
      mid: 'rgba(75, 8, 16, 0.18)',
      outer: 'rgba(42, 5, 8, 0.08)',
      fade: 'rgba(5, 5, 7, 0)',
      breathPeriod: 6.0,
      minBreath: 0.85,
      maxBreath: 1.0,
    },

    // 1. Black Rose Palette
    blackRose: {
      base: '#0a0a0c',
      mid1: '#1a1a1f',
      mid2: '#2b2b33',
      burgundyShade: 'rgba(58, 10, 20, 0.65)',
      rimHighlight: 'rgba(138, 138, 153, 0.30)',
      rimCandleHighlight: 'rgba(215, 120, 130, 0.60)',
      velvetSheen: 'rgba(255, 255, 255, 0.07)',
    },

    // 2. Wine Rose Palette (10-15%)
    wineRose: {
      base: '#1a040a',
      mid1: '#2a0610',
      mid2: '#420d1c',
      burgundyShade: 'rgba(80, 10, 25, 0.70)',
      rimHighlight: 'rgba(180, 130, 150, 0.38)',
      rimCandleHighlight: 'rgba(245, 140, 150, 0.65)',
      velvetSheen: 'rgba(255, 220, 225, 0.10)',
    },

    // 3. Special Scarlet Rose Palette
    scarletRose: {
      base: '#3d0309',
      mid1: '#8a0618',
      mid2: '#c9142e',
      burgundyShade: 'rgba(150, 12, 30, 0.85)',
      rimHighlight: 'rgba(255, 140, 160, 0.55)',
      rimCandleHighlight: 'rgba(255, 185, 195, 0.80)',
      velvetSheen: 'rgba(255, 200, 210, 0.22)',
    },

    // 4. Special Sunflower Palette
    sunflower: {
      petalBase: '#c67d13',
      petalMid: '#f5a623',
      petalHighlight: '#ffdf59',
      centerBase: '#261105',
      centerMid: '#44220b',
      centerSeeds: '#ffcc44',
      rimHighlight: 'rgba(255, 235, 160, 0.65)',
      glowAura: 'rgba(245, 166, 35, 0.25)',
    },

    stems: {
      deepGreen: '#1a3324',
      midGreen: '#2a5238',
      lightGreen: '#3f6b4a',
      highlight: 'rgba(100, 175, 120, 0.35)',
    },

    embers: [
      'rgba(240, 240, 255, 0.85)',
      'rgba(255, 180, 185, 0.75)',
      'rgba(255, 120, 130, 0.65)',
      'rgba(255, 220, 120, 0.75)', // Golden sparkle from sunflower
    ],
  },

  // Timing and growth phases (in seconds)
  timing: {
    stemGrowthDuration: 2.0,
    budScaleDuration: 1.5,
    bloomStaggerDuration: 2.5,
    mediaRevealStart: 3.8,       // Photo and video memories unveil as roses bloom
    mediaRevealDuration: 1.6,
    textRevealStart: 7.2,        // Heartfelt devotion letter unfolds gracefully
    textRevealDuration: 2.0,
    petalDetachInterval: 3.8,
  },

  wind: {
    baseFrequency: 0.75,
    baseAmplitudeDeg: 1.8,
    gust: {
      minInterval: 6.0,
      maxInterval: 12.0,
      rampUpDuration: 1.5,
      fadeOutDuration: 2.5,
      peakLeanMinDeg: 3.2,
      peakLeanMaxDeg: 4.5,
      waveCrossingDuration: 1.8, // seconds for gust to travel across width
      particleBoostVx: 0.9,     // sideways boost to particles during gusts
    },
  },

  // Dynamic Gothic Moon System
  moon: {
    defaultPhase: 'waxing-crescent' as const,
    defaultHemisphere: 'north' as const,
    texturePath: '/assets/aistudio/realmoon_473551c2.webp',
    // Scientific astronomical criteria specified by user:
    // 1. Illumination: strictly between 1% and 49% (28% illumination)
    // 2. Growth Direction: Waxing toward First Quarter
    // 3. Hemisphere Rule: North = 'D' shape (right side lit), South = 'C' shape (left side lit)
    // 4. Orbital Geometry: 45° to 90° ahead of the Sun, setting in western twilight sky
    waxingCrescentSpecs: {
      illuminationPercent: 28, // strictly 1% to 49%
      growthDirection: 'Waxing (actively increasing size day by day toward First Quarter)',
      hemisphereNorthShape: "Northern Hemisphere: right side illuminated (forms 'D' shape)",
      hemisphereSouthShape: "Southern Hemisphere: left side illuminated (forms 'C' shape)",
      orbitalGeometry: "Moon's ecliptic longitude is between 45° and 90° ahead of the Sun (western evening sky)",
    },
    autoCycleDuration: 20.0,    // advance one phase every 20s in auto mode
    crossfadeDuration: 1.2,     // smooth easeInOutSine crossfade
    radiusRatio: 0.16,          // 14-18% of min(width, height)
    minRadius: 52,
    maxRadius: 145,
    landscapePos: { xRatio: 0.76, yRatio: 0.24 },
    portraitPos: { xRatio: 0.68, yRatio: 0.19 },
    driftPeriod: 60.0,
    driftRangeX: 6.0,
    driftRangeY: 4.0,
    breathePeriod: 7.0,
    breatheMinAlpha: 0.92,
    breatheMaxAlpha: 1.0,
    colors: {
      disc: '#e8eaf2',
      crater: 'rgba(42, 45, 58, 0.16)',
      rimLight: 'rgba(255, 255, 255, 0.40)',
      outerHalo: 'rgba(215, 225, 245, 0.22)',
      outerCrimson: 'rgba(165, 30, 48, 0.08)',
      shadowDark: 'rgba(8, 10, 18, 0.94)', // unlit side with faint earthshine
    },
    // The 8 official lunar phases with illumination ratios [0 to 1]
    phases: [
      { id: 'new', name: 'New Moon', illumination: 0.06, k: -1.0 },
      { id: 'waxing-crescent', name: 'Waxing Crescent', illumination: 0.28, k: -0.44 },
      { id: 'first-quarter', name: 'First Quarter', illumination: 0.50, k: 0.0 },
      { id: 'waxing-gibbous', name: 'Waxing Gibbous', illumination: 0.78, k: 0.5 },
      { id: 'full', name: 'Full Moon', illumination: 1.0, k: 1.0 },
      { id: 'waning-gibbous', name: 'Waning Gibbous', illumination: 0.78, k: 0.5 },
      { id: 'last-quarter', name: 'Last Quarter', illumination: 0.50, k: 0.0 },
      { id: 'waning-crescent', name: 'Waning Crescent', illumination: 0.28, k: -0.44 },
    ] as const,
  },

  atmosphere: {
    particleCount: 50,
    grassCount: 70,
  },

  adaptiveQuality: {
    targetFrameTimeMs: 20,
    checkWindowSeconds: 2.0,
    reductionFactor: 0.30,
  },

  // Password Lock Screen Gate
  gate: {
    passwordHash: '808deed8da4a6f641cb040f34d6e8e5a947821c625231996199a3cb592ce6aa3',
    hint: 'Hint: my nickname for you, all in small letters.',
  },

  // Ambient procedural music
  music: {
    volume: 0.15,
  },
} as const;
