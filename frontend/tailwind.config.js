/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f7f7f3',
        brand: {
          50: '#eef8f0', 100: '#d9efde', 200: '#b5dfbf', 300: '#84c796',
          400: '#50a96b', 500: '#318b50', 600: '#246f3e', 700: '#1e5934',
          800: '#19472c', 900: '#163b27', 950: '#0a2115',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(22, 52, 34, .08)',
        panel: '0 18px 45px rgba(28, 49, 34, .09)',
      },
    },
  },
  plugins: [],
};
