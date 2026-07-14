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
          bg: '#FFF9F5',
          primary: '#C4847D',
          secondary: '#D4A373',
          50: '#FDF2F0',
          100: '#F8E3DE',
          200: '#F0C9C2',
          300: '#E4AAA0',
          400: '#D48D82',
          500: '#C4847D',
          600: '#A86B64',
          700: '#8A5550',
          800: '#6D4440',
          900: '#523531',
          950: '#2D1C1A',
        }
      }
    },
  },
  plugins: [],
} satisfies Config;
