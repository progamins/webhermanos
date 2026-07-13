import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          bg: '#FDFBF7',
          secondary: '#C48B7F',
          50: '#fff5f3',
          100: '#ffe9e4',
          200: '#ffd5cb',
          300: '#fcaea1',
          400: '#f2826f',
          500: '#e8a598',
          600: '#d48376',
          700: '#af574a',
          800: '#914539',
          900: '#783b32',
          950: '#421c17',
        }
      }
    },
  },
  plugins: [],
} satisfies Config;
