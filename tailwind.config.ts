import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/hooks/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // JOKUS brand placeholder — finalize with design pass
        brand: {
          DEFAULT: '#FF5A1F',
          50: '#FFF1EB',
          100: '#FFE0D1',
          500: '#FF5A1F',
          600: '#E64A0F',
          700: '#B83A0B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;
