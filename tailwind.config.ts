import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        lark: {
          primary: '#3370FF',
          secondary: '#00D6B9',
          background: '#F5F6F7',
          text: '#1F2329',
          border: '#DEE0E3',
        },
      },
      keyframes: {
        'slide-in-up': {
          '0%': {
            transform: 'translateY(100%)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
      },
      animation: {
        'slide-in-up': 'slide-in-up 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
