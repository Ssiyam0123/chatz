export const colors = {
  background: '#120E15', // Deep dark violet-black
  backgroundAlt: '#1A141F', // Slightly lighter dark violet
  surface: '#201A24', // Card and input dark surface
  surfaceMuted: '#2D2433', // Muted surface
  surfaceStrong: '#3E3147', // Strong surface
  primary: '#B98298', // Pastel pink (retains ChatZ identity)
  primaryPressed: '#A56F86',
  primarySoft: '#3E2A34', // Deep crimson-violet for soft active states
  secondary: '#8798B2', // Slate blue
  secondarySoft: '#232A35', // Deep slate blue background
  text: '#F5EFF2', // Soft white text
  textMuted: '#C5BAC0', // Muted soft text
  textSoft: '#A59BA0', // Soft placeholder text
  border: '#2E2533', // Dark borders
  success: '#8CB09E',
  danger: '#CC8A97',
  white: '#FFFFFF', // Keep pure white for light text/icons on dark surfaces
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 32,
};

export const radii = {
  small: 10,
  medium: 16,
  large: 22,
  pill: 999,
};

export const typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  pageTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  metadata: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
};

export const shadows = {
  small: {
    shadowColor: '#382F38',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#382F38',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#382F38',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
};
