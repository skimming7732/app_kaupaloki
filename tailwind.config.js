/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-main)',
        card: 'var(--bg-card)',
        'card-secondary': 'var(--bg-card-secondary)',
        sidebar: 'var(--bg-sidebar)',
        border: 'var(--border-main)',
        input: 'var(--border-main)',
        foreground: 'var(--text-primary)',
        'muted-foreground': 'var(--text-secondary)',
        muted: 'var(--bg-card-secondary)',
        primary: {
          DEFAULT: '#4318FF',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#EE5D50',
          foreground: '#FFFFFF',
        },
      },
    },
  },
  plugins: [],
};
