// kendrick-gs/scrapper/scrapper-a31e4028cc7f75eeeb406d17e6548fcd50443ca8/tailwind.config.mjs
/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ## UPDATED ##
        'brand-green-light': 'var(--brand-green-light)',
        'brand-green': 'var(--brand-green)',
      },
    },
  },
  plugins: [],
};
export default config;