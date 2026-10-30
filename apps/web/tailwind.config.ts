import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff5f8", 100: "#ffe8ef", 200: "#ffd0de", 300: "#ffa8c2", 400: "#ff6f9b",
          500: "#f43f7a", 600: "#e0245f", 700: "#b8164a",
        },
        ink: "#241019",
        body: "#4a3640",
        muted: "#8b7280",
        line: "#f6dbe4",
        "line-strong": "#efc3d2",
        gold: "#ffb72b",
      },
      fontFamily: {
        sans: ["'Be Vietnam Pro'", "system-ui", "-apple-system", "'Segoe UI'", "sans-serif"],
        script: ["'Dancing Script'", "'Segoe Script'", "cursive"],
      },
      borderRadius: { md: "16px", lg: "24px", xl: "32px" },
      boxShadow: {
        sm: "0 2px 8px rgba(224,36,95,.06)",
        md: "0 10px 30px rgba(224,36,95,.10)",
        lg: "0 24px 60px rgba(160,20,70,.16)",
        btn: "0 8px 20px rgba(244,63,122,.32)",
      },
      backgroundImage: {
        "grad-primary": "linear-gradient(135deg,#ff7aa5 0%,#f43f7a 55%,#e0245f 100%)",
        "grad-soft": "linear-gradient(180deg,#fff 0%,#fff4f7 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
