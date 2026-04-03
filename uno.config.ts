import { defineConfig, presetUno, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
  ],
  theme: {
    colors: {
      pet: {
        'primary': '#6366f1',
        'bg': '#1a1b2e',
        'bg-deep': '#0a0b18',
        'surface': '#252640',
        'surface-a': 'rgba(255,255,255,0.03)',
        'surface-b': 'rgba(255,255,255,0.06)',
        'text': '#e2e8f0',
        'muted': '#64748b',
        'subtle': '#475569',
        'faint': '#94a3b8',
        'dim': '#94a3b8',
        'border': 'rgba(255,255,255,0.04)',
        'border-light': 'rgba(255,255,255,0.08)',
        'primary-a': 'rgba(99,102,241,0.06)',
        'primary-b': 'rgba(99,102,241,0.12)',
        'success': '#4ade80',
        'warning': '#fbbf24',
        'error': '#f87171',
      },
    },
  },
})
