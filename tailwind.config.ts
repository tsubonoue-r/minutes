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
    },
  },
  plugins: [],
};

export default config;
