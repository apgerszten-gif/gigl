/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        paper:  '#EDE3D0',
        cream:  '#FAF3E2',
        ink:    '#4A3528',
        sienna: '#B85827',
        terra:  '#D4845A',
        taupe:  '#8B7560',
        faint:  '#B8A898',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
