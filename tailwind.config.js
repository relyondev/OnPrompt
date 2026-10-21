/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Brand Primitive Palette ────────────────────────────────────────────
        'op-electric-blue': '#006BFF',   // Primary brand color
        'op-cyan':          '#00D2FF',   // Secondary brand color
        'op-yellow':        '#FFC800',   // Accent / antenna tip
        'op-navy':          '#0B1F44',   // Text & dark surfaces
        'op-cloud':         '#F4F9FF',   // Background
        // ── Semantic Light Token Surface ───────────────────────────────────────
        'op-action':        '#0057D6',   // Button/link background (WCAG-safe on white)
        'op-action-hover':  '#0047B0',
        'op-border-dec':    '#DCEBFF',   // Decorative borders
        'op-border-ctrl':   '#6B7F9E',   // Control borders
        'op-muted':         '#4B6080',   // Secondary text
        // ── Status ─────────────────────────────────────────────────────────────
        'op-success':       '#167345',
        'op-warning':       '#805500',
        'op-error':         '#B42318',
        // ── Legacy scale kept for backward compat ──────────────────────────────
        primary: {
          50:  '#eef6ff',
          100: '#d9ebff',
          200: '#bcddff',
          300: '#8ec7ff',
          400: '#59a6ff',
          500: '#307fff',
          600: '#1668e8',
          700: '#006BFF',
          800: '#0057D6',
          900: '#0047B0',
          950: '#0B1F44',
        },
        navy: {
          700: '#1e3a5f',
          800: '#102a43',
          900: '#0b1d33',
          950: '#060f1e',
        },
      },
      fontFamily: {
        // Plus Jakarta Sans is the brand typeface; Poppins/Inter as fallbacks
        sans: [
          '"Plus Jakarta Sans"',
          'Poppins',
          'Inter',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
      borderRadius: {
        'op-control': '12px',
        'op-card':    '20px',
        'op-hero':    '24px',
        'op-pill':    '999px',
      },
      spacing: {
        // Brand spacing scale (px → rem at 16px base)
        'op-1':  '4px',
        'op-2':  '8px',
        'op-3':  '12px',
        'op-4':  '16px',
        'op-5':  '24px',
        'op-6':  '32px',
        'op-7':  '48px',
        'op-8':  '64px',
        'op-9':  '96px',
      },
      maxWidth: {
        'op-container': '1200px',
      },
      keyframes: {
        'page-enter': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'page-enter': 'page-enter 300ms cubic-bezier(0.2, 0, 0, 1) both',
        'fade-in':    'fade-in 200ms cubic-bezier(0.2, 0, 0, 1) both',
        'scale-in':   'scale-in 200ms cubic-bezier(0.2, 0, 0, 1) both',
      },
      transitionTimingFunction: {
        'op': 'cubic-bezier(0.2, 0, 0, 1)',
      },
      transitionDuration: {
        'op-fast':     '120ms',
        'op-standard': '200ms',
      },
      boxShadow: {
        'op-card':   '0 4px 20px rgba(0, 0, 0, 0.04)',
        'op-action': '0 4px 14px rgba(0, 87, 214, 0.24)',
        'op-hero':   '0 8px 32px rgba(0, 107, 255, 0.18)',
      },
    },
  },
  plugins: [],
}
