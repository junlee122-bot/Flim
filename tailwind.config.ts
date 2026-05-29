import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0a0b",
          900: "#101012",
          800: "#17171a",
          700: "#202024",
          600: "#2c2c31",
        },
        bone: "#e8e4da",
        muted: "#9a958a",
        accent: "#c8a24a",
      },
      fontFamily: {
        serif: ["Georgia", "'Nanum Myeongjo'", "'Times New Roman'", "serif"],
        sans: ["'Inter'", "system-ui", "'Apple SD Gothic Neo'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
