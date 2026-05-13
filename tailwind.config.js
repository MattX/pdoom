/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/frontend/**/*.{html,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        doom: {
          50: "#fdf2f2",
          100: "#fde8e8",
          500: "#e53e3e",
          600: "#c53030",
          900: "#742a2a",
        },
      },
    },
  },
  plugins: [],
};
