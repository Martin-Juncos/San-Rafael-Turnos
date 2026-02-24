/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fff9',
          100: '#dcfdeb',
          200: '#b6f7d2',
          300: '#81ecb3',
          400: '#4fdd91',
          500: '#20c272',
          600: '#129b58',
          700: '#137a48',
          800: '#155f3b',
          900: '#144f33'
        }
      },
      boxShadow: {
        glass: '0 12px 36px rgba(4, 78, 42, 0.16)'
      },
      backdropBlur: {
        xs: '2px'
      }
    }
  },
  plugins: []
}
