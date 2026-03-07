import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#007185', // Teal
                    light: '#008296',
                    dark: '#005d6e',
                    50: '#f0f9fa',
                    100: '#dcf0f2',
                    200: '#bce1e6',
                    300: '#8dc6cf',
                    400: '#56a2b0',
                    500: '#3a8796',
                    600: '#306e7c',
                    700: '#2c5a66',
                    800: '#294c56',
                    900: '#25414a',
                },
                retail: {
                    DEFAULT: '#007185',
                    light: '#008296',
                    accent: '#007185', // Changed from Amazon orange
                    link: '#007185',
                    button: '#ffd814',
                    buttonHover: '#f7ca00',
                    yellow: '#ffd814',
                    orange: '#f7ca00',
                    dark: '#131921', // Keeping Amazon dark as a utility
                },
                secondary: {
                    50: '#fdf2f8',
                    100: '#fce7f3',
                    200: '#fbcfe8',
                    300: '#f9a8d4',
                    400: '#f472b6',
                    500: '#ec4899',
                    600: '#db2777',
                    700: '#be185d',
                    800: '#9d174d',
                    900: '#831843',
                },
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
            },
            animation: {
                'marquee': 'marquee 25s linear infinite',
                'fade-in-up': 'fade-in-up 0.5s ease-out',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                marquee: {
                    '0%': { transform: 'translateX(0%)' },
                    '100%': { transform: 'translateX(-100%)' },
                },
                'fade-in-up': {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                }
            },
        },
    },
    plugins: [],
};
export default config;
