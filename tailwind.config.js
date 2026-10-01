/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary, #6366F1)',
          hover: 'var(--primary-hover, #4F46E5)',
          foreground: 'var(--primary-foreground, #FFFFFF)',
          soft: 'var(--primary-soft, #EEF2FF)',
          line: 'var(--primary-line, #C7D2FE)',
        },
        accent: {
          DEFAULT: 'var(--accent, #6C5CE7)',
          strong: 'var(--accent-strong, #5646D4)',
          foreground: 'var(--accent-foreground, #FFFFFF)',
          soft: 'var(--accent-soft, #EFECFD)',
          line: 'var(--accent-line, #DDD7FB)',
        },
        neutral: {
          50: 'var(--neutral-50, #F8FAFC)',
          100: 'var(--neutral-100, #F1F5F9)',
          200: 'var(--neutral-200, #E2E8F0)',
          300: 'var(--neutral-300, #CBD5E1)',
          400: 'var(--neutral-400, #94A3B8)',
          500: 'var(--neutral-500, #64748B)',
          600: 'var(--neutral-600, #475569)',
          700: 'var(--neutral-700, #334155)',
          800: 'var(--neutral-800, #1E293B)',
          900: 'var(--neutral-900, #0F172A)',
          950: 'var(--neutral-950, #020617)',
        },
        success: {
          DEFAULT: 'var(--success, #15803D)',
          foreground: 'var(--success-foreground, #FFFFFF)',
          soft: 'var(--success-soft, #ECFDF3)',
          line: 'var(--success-line, #BBF7D0)',
        },
        danger: {
          DEFAULT: 'var(--danger, #B91C1C)',
          foreground: 'var(--danger-foreground, #FFFFFF)',
          soft: 'var(--danger-soft, #FEF2F2)',
          line: 'var(--danger-line, #FECACA)',
        },
        warning: {
          DEFAULT: 'var(--warning, #B45309)',
          foreground: 'var(--warning-foreground, #FFFFFF)',
          soft: 'var(--warning-soft, #FFFBEB)',
          line: 'var(--warning-line, #FDE68A)',
        },
      },
      borderRadius: {
        'xl': '0.75rem',
        'lg': '0.5rem',
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'sm': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
