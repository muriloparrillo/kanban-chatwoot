/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#1f93ff', dark: '#1471cc' }
      }
    }
  },
  plugins: []
};
