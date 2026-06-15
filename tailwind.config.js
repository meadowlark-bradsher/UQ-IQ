/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,mdx}'],
  theme: {
    // Design tokens live here — do not scatter magic values across components.
    extend: {
      colors: {
        ink: '#1a1a2e',
        canvas: '#fbfbfd',
        accent: '#3b5bdb',
        survivor: '#2f9e44',
        eliminated: '#adb5bd',
        flag: '#e8590c',
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      maxWidth: {
        prose: '42rem',
      },
      keyframes: {
        'tape-enter': {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'tape-enter': 'tape-enter 0.3s ease',
      },
    },
  },
  plugins: [],
};
