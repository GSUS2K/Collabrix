/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    dark: '#0C0C0F',
                    darker: '#08080A',
                    card: '#18181F',
                    accent: '#00FFBF',
                    accentHover: '#00D9A3',
                    purple: '#A29BFE',
                    pink: '#FD79A8',
                    red: '#FF6B6B',
                    yellow: '#FFE66D',
                },
            },
            fontFamily: {
                sans: ['Karla', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
