/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: '#D4537E',
        'brand-light': '#E9537E',
        'brand-dark': '#0c0c0e',
        'desert': '#C4651A',
        'desert-light': '#E8832A',
        'card': '#1a1a1d',
        'card-hover': '#222226',
        'surface': '#141416',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
    },
  },
  plugins: [],
}
