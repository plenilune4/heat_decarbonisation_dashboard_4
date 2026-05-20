/** @type {import('tailwindcss').Config} */
const colors = require('tailwindcss/colors')
module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}', './node_modules/@tremor/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                brand: {
                    DEFAULT: '#3dc58e',
                    50: '#edfcf4',
                    100: '#d4f7e4',
                    200: '#adedcd',
                    300: '#78ddb1',
                    400: '#3dc58e',
                    500: '#1eab76',
                    600: '#118a60',
                    700: '#0d6f4f',
                    800: '#0d5840',
                    900: '#0c4836',
                    950: '#05291f',
                },
                // brand: {
                //     DEFAULT: '#32722c',
                //     50: '#f3fbf2',
                //     100: '#e4f6e2',
                //     200: '#caecc6',
                //     300: '#a0db9a',
                //     400: '#6ec266',
                //     500: '#4aa641',
                //     600: '#398831',
                //     700: '#32722c',
                //     800: '#295625',
                //     900: '#234720',
                //     950: '#0e260d',
                // },
                neutral: {
                    50: '#fafafa',
                    100: '#f4f4f5',
                    200: '#e4e4e7',
                    300: '#d4d4d8',
                    400: '#a1a1aa',
                    500: '#71717a',
                    600: '#52525b',
                    700: '#3f3f46',
                    800: '#27272a',
                    900: '#18181b',
                    950: '#09090b',
                },
                gray: {
                    50: '#f9fafb',
                    100: '#f3f4f6',
                    200: '#e5e7eb',
                    300: '#d1d5db',
                    400: '#9ca3af',
                    500: '#6b7280',
                    600: '#4b5563',
                    700: '#374151',
                    800: '#1f2937',
                    900: '#111827',
                    950: '#030712',
                },
            },
            transitionProperty: {
                width: 'width',
                height: 'height',
            },
        },
    },
    plugins: [require('@tailwindcss/forms'), require('tailwindcss-animated'), require('@tailwindcss/aspect-ratio')],
    safelist: [
        {
            pattern: /(bg|text|border|ring|shadow)-(brand)-(50|100|200|300|400|500|600|700|800|900|950)?/,
            variant: ['hover', 'focus', 'sm', 'md', 'lg', 'xl', '2xl'],
        },
    ],
}
