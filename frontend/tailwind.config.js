/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: '#2563eb', light: '#3b82f6', dark: '#1d4ed8' },
        secondary: { DEFAULT: '#10b981', light: '#34d399', dark: '#059669' },
        danger:    { DEFAULT: '#ef4444', light: '#f87171', dark: '#dc2626' },
      },
    },
  },
  plugins: [],
};
