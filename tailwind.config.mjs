/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Anton', 'Impact', '"Arial Narrow"', 'sans-serif'],
      },
      colors: {
        flame: '#ff4d2e',
        ink: '#090909',
        paper: '#f5f2eb',
        gold: '#f5c451',
        silver: '#cfd4dd',
        bronze: '#cd8a4f',
      },
    },
  },
  plugins: [],
};
