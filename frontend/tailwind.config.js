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
        nexus: {
          950: '#0b0d14',
          900: '#11131c',
          850: '#161925',
          800: '#1d2232',
          700: '#2b3248',
          600: '#3d4766',
          500: '#586791',
          accent: '#8b5cf6', // Violet
          accentHover: '#7c3aed',
          cyan: '#06b6d4',   // Restrained cyan
          cyanHover: '#0891b2',
          emerald: '#10b981',
          rose: '#f43f5e',
          amber: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Consolas', 'JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}

