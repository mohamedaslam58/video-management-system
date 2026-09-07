/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#0a0e14',
          900: '#0f1420',
          800: '#161c2c',
          700: '#212939',
          600: '#2f3a4f',
        },
        signal: {
          amber: '#e8a944',
          red: '#e14b4b',
          green: '#3fb87f',
          blue: '#4a90c9',
        },
      },
      fontFamily: {
        display: ['"IBM Plex Sans Condensed"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
