export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', 'sans-serif'],
        serif: ['Instrument Serif', 'serif'],
      },
      colors: {
        base: '#050505',
        surface: '#0E0E10',
        accent: '#D4FF00',
        muted: '#888888',
        border: '#222225',
      },
      animation: {
        'fade-up': 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}