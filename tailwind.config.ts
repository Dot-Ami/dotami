import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#161619",
        ink2: "#131316",
        ink3: "#1C1B1F",
        ink4: "#181620",
        paper: "#EFE7D6",
        "paper-dim": "#cfc6b3",
        maple: "#B94A2C",
        "maple-soft": "#7a2f1c",
        spruce: "#1F3F44",
        "spruce-line": "#2f5a60",
        sage: "#6B8E5A",
        amber: "#C8893A",
        stone: "#8C8678",
        "stone-dim": "#5a564f",
        rule: "#32303A",
        "rule-soft": "#26252c",
        ember: "#F97316",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        serif: ["Georgia", "Times New Roman", "serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "ui-monospace", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
