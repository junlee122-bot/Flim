import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 따뜻한 잉크 톤의 다크 계열 (아카이브/잡지 감성)
        ink: {
          950: "#0b0b0d",
          900: "#101013",
          850: "#15151a",
          800: "#1a1a20",
          700: "#26262e",
          600: "#34343e",
        },
        bone: "#ece7dc",
        muted: "#928d83",
        faint: "#5f5b54",
        accent: {
          DEFAULT: "#c9a24a",
          soft: "#d8bd78",
          deep: "#a07f2f",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "'Nanum Myeongjo'", "serif"],
        serif: ["var(--font-serif-kr)", "Georgia", "serif"],
        sans: [
          "var(--font-sans)",
          "system-ui",
          "'Apple SD Gothic Neo'",
          "sans-serif",
        ],
      },
      letterSpacing: {
        kicker: "0.24em",
      },
      maxWidth: {
        prose: "68ch",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.5s ease both",
        "scale-in": "scale-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
