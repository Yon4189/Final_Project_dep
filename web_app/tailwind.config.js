/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colors matching your UI Prototype (Figure 22)
        "admin-bg": "#0f172a",       // Very dark blue
        "admin-sidebar": "#1e293b",  // Dark blue
        "admin-accent": "#3b82f6",   // Bright blue for buttons
        "admin-card": "#1e293b",     // Card backgrounds
      }
    },
  },
  darkMode: 'class',
  plugins: [],
}