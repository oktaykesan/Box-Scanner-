// BoxScan Design System — Light / Navy / Red — v2.0
// Palette: White + Deep Navy + Signal Red
// Philosophy: Apple-grade premium, breathing layouts, spring-based motion

// ---------------------------------------------------------------------------
// COLORS
// ---------------------------------------------------------------------------

export const Colors = {
    bg: {
        app:      '#FFFFFF',
        surface:  '#F7F8FA',
        elevated: '#FFFFFF',
        overlay:  'rgba(8,20,48,0.6)',
    },

    navy: {
        900: '#080E1F',
        800: '#0D1B35',
        700: '#162444',
        600: '#1E3158',
        500: '#2A4270',
        400: '#4A6490',
        300: '#7A96B8',
    },

    red: {
        700: '#B91C2C',
        600: '#DC2626',
        500: '#E8374A',
        400: '#F06070',
        100: '#FEE2E5',
    },

    text: {
        primary:   '#080E1F',
        secondary: '#4A5568',
        tertiary:  '#9AA5B4',
        inverse:   '#FFFFFF',
        accent:    '#E8374A',
    },

    border: {
        default: '#E2E8F0',
        subtle:  '#F1F5F9',
        strong:  '#CBD5E1',
        focus:   '#1E3158',
    },

    status: {
        success:    '#16A34A',
        successBg:  'rgba(22,163,74,0.10)',
        warning:    '#D97706',
        warningBg:  'rgba(217,119,6,0.10)',
        error:      '#DC2626',
        errorText:  '#DC2626',
        errorBg:    '#FEE2E5',
        info:       '#2563EB',
        infoBg:     'rgba(37,99,235,0.10)',

        // Legacy aliases
        running:     '#16A34A',
        runningText: '#16A34A',
        runningDim:  'rgba(22,163,74,0.10)',
        queue:       'rgba(217,119,6,0.10)',
        queueText:   '#D97706',
    },

    // Legacy aliases for backward compatibility
    brand: {
        red:  '#E8374A',
        navy: '#162444',
    },

    blue: {
        default: '#2563EB',
        bright:  '#3B82F6',
        light:   '#93C5FD',
        mid:     'rgba(37,99,235,0.3)',
        dim:     'rgba(37,99,235,0.10)',
        glow:    'rgba(59,130,246,0.15)',
    },

    // Extra legacy aliases used in existing screens
    red: {
        default: '#E8374A',
        mid:     'rgba(232,55,74,0.3)',
        dim:     'rgba(232,55,74,0.10)',
    },

    overlay: 'rgba(8,20,48,0.6)',
};

// ---------------------------------------------------------------------------
// SPACING  (4-point grid)
// ---------------------------------------------------------------------------

export const Spacing = {
    space1: 4,
    space2: 8,
    space3: 12,
    space4: 16,
    space5: 24,
    space6: 32,
    space7: 48,
    space8: 64,

    // Semantic aliases
    xs:   4,
    sm:   8,
    md:   12,
    lg:   16,
    xl:   24,
    xxl:  32,
    xxxl: 48,
    huge: 64,

    // Functional minimums (accessibility)
    minTouchTarget:    44,
    minHardwareButton: 56,
};

// ---------------------------------------------------------------------------
// TYPOGRAPHY
// ---------------------------------------------------------------------------

export const Typography = {
    fonts: {
        display:  undefined as string | undefined,
        h1:       undefined as string | undefined,
        h2:       undefined as string | undefined,
        body:     undefined as string | undefined,
        caption:  undefined as string | undefined,
        data:     undefined as string | undefined,
    },

    sizes: {
        display:   34,
        h1:        28,
        h2:        22,
        h3:        18,
        h4:        16,
        body:      15,
        bodySmall: 13,
        caption:   11,
        micro:      9,

        // Legacy aliases
        bodyDense: 13,
        data:      13,
    },

    weights: {
        regular:  '400' as const,
        medium:   '500' as const,
        semibold: '600' as const,
        bold:     '700' as const,
        black:    '900' as const,
    },

    lineHeights: {
        tight:   1.2,
        normal:  1.5,
        relaxed: 1.7,
    },

    letterSpacing: {
        tight:  -0.5,
        normal:  0,
        wide:    0.5,
        wider:   1.5,
    },
};

// ---------------------------------------------------------------------------
// BORDER RADIUS
// ---------------------------------------------------------------------------

export const BorderRadius = {
    none: 0,
    xs:   4,
    sm:   8,
    md:   12,
    lg:   16,
    xl:   20,
    full: 9999,

    // Legacy alias
    default: 12,
};

// ---------------------------------------------------------------------------
// SHADOWS
// ---------------------------------------------------------------------------

export const Shadow = {
    none: {},

    xs: {
        shadowColor:   '#080E1F',
        shadowOffset:  { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius:  3,
        elevation:     1,
    },

    sm: {
        shadowColor:   '#080E1F',
        shadowOffset:  { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius:  6,
        elevation:     2,
    },

    md: {
        shadowColor:   '#080E1F',
        shadowOffset:  { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius:  12,
        elevation:     4,
    },

    lg: {
        shadowColor:   '#080E1F',
        shadowOffset:  { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius:  20,
        elevation:     8,
    },

    // Legacy alias
    elevationBase: {
        shadowColor:   '#080E1F',
        shadowOffset:  { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius:  6,
        elevation:     2,
    },
};

// ---------------------------------------------------------------------------
// MOTION
// ---------------------------------------------------------------------------

export const Motion = {
    instant:  100,
    fast:     200,
    normal:   300,
    slow:     500,
    verySlow: 800,

    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',

    spring: {
        snappy: { damping: 20, stiffness: 300 },
        smooth: { damping: 25, stiffness: 200 },
        gentle: { damping: 30, stiffness: 150 },
        bouncy: { damping: 12, stiffness: 250 },

        // Legacy aliases
        toggle: { damping: 20, stiffness: 300 },
        card:   { damping: 25, stiffness: 200 },
    },

    timing: {
        fadeIn:  { duration: 200 },
        fadeOut: { duration: 150 },
        slideUp: { duration: 300 },
    },
};
