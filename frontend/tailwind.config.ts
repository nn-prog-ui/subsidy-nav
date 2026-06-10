import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#1e3a5f', light: '#2a4f82', dark: '#152b47' },
        accent: '#f97316',
      },
    },
  },
  plugins: [],
};
export default config;
