// Central design system tokens (JS layer) mirroring CSS custom properties.
// Use these for generating inline styles, charts, canvas, etc.

export const DS = {
  font: {
    family: 'var(--font-sans, Montserrat, ui-sans-serif, system-ui)',
    size: {
      xs: 'var(--font-size-xs)',
      sm: 'var(--font-size-sm)',
      base: 'var(--font-size-base)',
      md: 'var(--font-size-md)',
      lg: 'var(--font-size-lg)'
    }
  },
  color: {
    brand: 'var(--brand-green)',
    brandLight: 'var(--brand-green-light)',
    brandMuted: 'var(--brand-green-muted)',
    surface: (layer: 0|1|2|3 = 0) => `hsl(var(--color-surface-${layer}))`,
    foreground: 'hsl(var(--foreground))',
    border: 'hsl(var(--border))'
  },
  radius: 'var(--radius)',
  shadow: {
    xs: '0 1px 2px -1px rgba(0,0,0,0.08),0 1px 1px rgba(0,0,0,0.04)',
    sm: '0 2px 4px -2px rgba(0,0,0,0.1),0 2px 3px -1px rgba(0,0,0,0.06)',
  }
} as const;

export type DesignSystem = typeof DS;
