/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#FF4E00",
        secondary: "#FF0099",
        background: "#0F0F1A",
        surface: "rgba(255, 255, 255, 0.1)",
        text: "#FFFFFF",
        textSecondary: "rgba(255, 255, 255, 0.6)",
      },
    },
  },
  plugins: [],
};
