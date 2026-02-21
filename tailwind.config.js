/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Lumora Studio Pro brand colors
        lumora: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#baddfd',
          300: '#7dc2fc',
          400: '#38a3f8',
          500: '#0e87e9',
          600: '#026bc7',
          700: '#0355a1',
          800: '#074985',
          900: '#0c3d6e',
          950: '#082749',
        },
        // Dark theme surface colors
        surface: {
          50: '#f8f9fa',
          100: '#f1f3f5',
          200: '#e9ecef',
          300: '#dee2e6',
          400: '#ced4da',
          500: '#adb5bd',
          600: '#868e96',
          700: '#495057',
          800: '#343a40',
          900: '#212529',
          950: '#191c20',
        },
        // Panel backgrounds
        panel: {
          bg: '#1e1e1e',
          hover: '#2a2a2a',
          active: '#333333',
          border: '#3a3a3a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        '0.25': '1px',
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '84': '21rem',
        '88': '22rem',
      },
      animation: {
        'slide-down': 'slideDown 200ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
        'fade-in': 'fadeIn 150ms ease-out',
        'panel-open': 'panelOpen 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        'panel-close': 'panelClose 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        slideDown: {
          from: { height: '0', opacity: '0' },
          to: { height: 'var(--radix-collapsible-content-height)', opacity: '1' },
        },
        slideUp: {
          from: { height: 'var(--radix-collapsible-content-height)', opacity: '1' },
          to: { height: '0', opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        panelOpen: {
          from: { maxHeight: '0', opacity: '0' },
          to: { maxHeight: '2000px', opacity: '1' },
        },
        panelClose: {
          from: { maxHeight: '2000px', opacity: '1' },
          to: { maxHeight: '0', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
