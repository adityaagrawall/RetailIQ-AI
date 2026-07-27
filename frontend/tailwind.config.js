/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Stripe / Vercel-esque strictly neutral monochrome
        gray: {
          25: '#FCFCFD',
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#030712',
        },
        brand: {
          DEFAULT: '#000000', // Vercel style high-contrast primary
          subtle: '#F3F4F6',
        },
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }], // 11px
        xs: ['0.75rem', { lineHeight: '1rem' }],     // 12px
        sm: ['0.8125rem', { lineHeight: '1.25rem' }], // 13px
        base: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
        lg: ['1rem', { lineHeight: '1.5rem' }],       // 16px
        xl: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        // Extremely subtle shadow for cards
        card: '0px 1px 3px rgba(0, 0, 0, 0.04), 0px 1px 2px rgba(0, 0, 0, 0.02)',
      },
    },
  },
  plugins: [],
};
