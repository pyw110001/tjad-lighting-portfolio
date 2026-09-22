export const TOKENS = {
  colors: {
    bgPrimary: '#080A0E',
    bgSecondary: '#15191F',
    bgSurface: '#20252C',
    bgSurfaceElevated: '#282F38',
    textPrimary: '#ECEAE4',
    textSecondary: '#A0A8B2',
    textMuted: '#6B7280',
    accentWarm: '#C6B58B',
    accentWarmSoft: 'rgba(198, 181, 139, 0.15)',
    accentWarmGlow: 'rgba(198, 181, 139, 0.35)',
    accentCool: '#84A9B8',
    accentCoolSoft: 'rgba(132, 169, 184, 0.15)',
    accentCoolGlow: 'rgba(132, 169, 184, 0.35)',
    borderSubtle: 'rgba(255, 255, 255, 0.12)',
    borderFocus: 'rgba(198, 181, 139, 0.5)'
  },
  motion: {
    easeSmooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
    cursorDuration: 0.18,
    buttonDuration: 0.35,
    selectionDuration: 0.4,
    revealDuration: 0.6,
    menuDuration: 0.65
  }
} as const;
