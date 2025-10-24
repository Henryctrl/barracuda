// Corrected tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        courier: ['"Courier New"', 'Courier', 'monospace'],
      },
      colors: {
        'background-dark': '#0d0d21',
        'container-dark': 'rgba(10, 10, 30, 0.85)',
        'accent-cyan': '#00ffff',
        'accent-magenta': '#ff00ff',
        'accent-green': '#00ff99',
        'text-primary': '#00ffff',
        'text-secondary': '#c0c0ff',
      },
      boxShadow: {
        'glow-cyan': '0 0 25px rgba(0, 255, 255, 0.7)',
        'glow-magenta': '0 0 45px rgba(255, 0, 255, 0.6)',
        'glow-green': '0 0 20px #00ff99',
        'glow-green-hover': '0 0 40px #00ff99, 0 0 15px #ffffff',
        'glow-magenta-hover': '0 0 40px #ff00ff, 0 0 15px #ffffff',
        'glow-cyan-hover': '0 0 45px #00ffff, 0 0 15px #ffffff',
        'inner-cyan': 'inset 0 0 10px rgba(0, 255, 255, 0.2)',
        'card-hover': '0 0 20px rgba(0, 255, 255, 0.5)',
      },
      animation: {
        'scroll-left': 'scroll-left 25s linear infinite',
        'glitch-1': 'glitch-anim-1 0.5s infinite linear alternate-reverse',
        'glitch-2': 'glitch-anim-2 0.5s infinite linear alternate-reverse',
      },
      keyframes: {
        'scroll-left': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        'glitch-anim-1': {
          '0%': { clipPath: 'inset(20% 0 60% 0)' },
          '100%': { clipPath: 'inset(60% 0 20% 0)' },
        },
        'glitch-anim-2': {
          '0%': { clipPath: 'inset(60% 0 20% 0)' },
          '100%': { clipPath: 'inset(20% 0 60% 0)' },
        },
      },
    },
  },
  plugins: [],
}
