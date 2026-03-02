// Theme colors matching the app icon aesthetic
// Dark navy with glowing teal accents

export const colors = {
  // Backgrounds
  background: {
    primary: '#0a0e1a',      // Deep navy - main background
    secondary: '#121829',     // Slightly lighter - cards
    tertiary: '#1a2235',      // Card backgrounds
    elevated: '#1e2640',      // Elevated surfaces
  },
  
  // Accent colors - Glowing Teal
  accent: {
    primary: '#00E5BF',       // Main teal (from icon)
    secondary: '#00D9B5',     // Secondary teal
    muted: '#00C4A3',         // Muted teal
    glow: 'rgba(0, 229, 191, 0.3)',  // Glow effect
    soft: 'rgba(0, 229, 191, 0.15)', // Soft background
  },
  
  // Text colors
  text: {
    primary: '#FFFFFF',       // Main text
    secondary: '#B8C1D1',     // Secondary text
    tertiary: '#7A8599',      // Muted text
    inverse: '#0a0e1a',       // Text on light backgrounds
  },
  
  // Status colors
  status: {
    success: '#00E5BF',       // Using teal as success
    warning: '#FFB547',       // Warm amber
    error: '#FF6B6B',         // Soft red
    info: '#64B5F6',          // Soft blue
  },
  
  // Goal category colors (keeping varied but matching theme)
  goals: {
    fitness: '#00E5BF',       // Teal
    focus: '#64B5F6',         // Blue
    business: '#FFB547',      // Amber
    relationships: '#FF8A9B', // Pink
    spiritual: '#B794F4',     // Purple
    creativity: '#FF9F43',    // Orange
    health: '#4ECCA3',        // Green-teal
  },
  
  // Border colors
  border: {
    primary: '#2a3548',
    secondary: '#1e2640',
    accent: 'rgba(0, 229, 191, 0.3)',
  },
  
  // Gradients
  gradients: {
    primary: ['#00E5BF', '#00C4A3'],
    dark: ['#121829', '#0a0e1a'],
    glow: ['rgba(0, 229, 191, 0.2)', 'transparent'],
  }
};

// Shadows for glow effects
export const shadows = {
  glow: {
    shadowColor: '#00E5BF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  soft: {
    shadowColor: '#00E5BF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
};

export default colors;
