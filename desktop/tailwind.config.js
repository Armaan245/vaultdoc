/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          base: '#0B121E',
          panel: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          borderLight: '#1E293B',
          accent: '#06B6D4',
          security: '#10B981',
          securityDark: '#064E3B',
          textPrimary: '#F8FAFC',
          textBody: '#94A3B8',
          codeHighlight: '#38BDF8',
          yellow: '#EAB308',
          orange: '#F97316'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      }
    },
  },
  plugins: [],
}
