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
```

Commit that. That's all 15 files.

Now before Vercel deploys, do a quick sanity check — your repo root should have exactly these folders and files:
```
app/
components/
lib/
public/
next.config.js
package.json
postcss.config.js
tailwind.config.js
tsconfig.json
vercel.json
