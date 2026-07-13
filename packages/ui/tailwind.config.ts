import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        mono: ['Consolas', 'Courier New', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        circuit: {
          bg: '#000000',
          'bg-secondary': '#1a1a1a',
          'bg-tertiary': '#2a2a2a',
          'bg-hover': '#3a3a3a',
          'bg-active': '#444444',
          'bg-canvas': '#111111',
          border: '#333333',
          'border-light': '#555555',
          text: '#FFFFFF',
          'text-secondary': '#CCCCCC',
          'text-muted': '#888888',
          'text-dim': '#666666',
          accent: '#2980b9',
          'accent-bg': '#1a5276',
          success: '#4CAF50',
          separator: '#444444',
        },
      },
      fontSize: {
        'circuit-xs': ['10px', { lineHeight: '14px' }],
        'circuit-sm': ['11px', { lineHeight: '16px' }],
        'circuit-base': ['12px', { lineHeight: '16px' }],
        'circuit-lg': ['13px', { lineHeight: '18px' }],
        'circuit-xl': ['14px', { lineHeight: '20px' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
