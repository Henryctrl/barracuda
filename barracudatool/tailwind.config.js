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
        sans: ['Orbitron', 'sans-serif'],
      },
      colors: {
        'background-dark': '#0d0d21',
        'container-bg': 'rgba(10, 10, 30, 0.85)',
        'accent-magenta': '#ff00ff',
        'accent-cyan': '#00ffff',
        'text-primary': '#c0c0ff',
        'text-bright': '#ffffff',
      },
      boxShadow: {
        'glow-magenta': '0 0 25px rgba(255, 0, 255, 0.7)',
        'glow-cyan': '0 0 25px rgba(0, 255, 255, 0.7)',
        'glow-cyan-inset': 'inset 0 0 10px rgba(0, 255, 255, 0.5)',
      },
    },
  },
  plugins: [], // Ensure this is empty or removed
}
