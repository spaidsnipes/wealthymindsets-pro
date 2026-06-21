import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // WealthyMindsets brand palette
        wm: {
          black:   "#000000",
          dark:    "#0A0A0A",
          surface: "#111111",
          card:    "#161616",
          border:  "#222222",
          muted:   "#2D3748",
          gold:    "#F0B429",
          "gold-dim": "#B8860B",
          green:   "#00D4AA",
          "green-dim": "#00A888",
          red:     "#FF4D6A",
          "red-dim": "#CC2040",
          blue:    "#4FA3E0",
          purple:  "#8B5CF6",
          text:    "#E8EDF3",
          "text-muted": "#8B95A5",
          "text-dim":   "#5A6575",
        },
        // Shadcn compat
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "slide-in-right": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "pulse-green": { "0%,100%": { boxShadow: "0 0 0 0 rgba(0,212,170,0.4)" }, "50%": { boxShadow: "0 0 0 6px rgba(0,212,170,0)" } },
        "pulse-red": { "0%,100%": { boxShadow: "0 0 0 0 rgba(255,77,106,0.4)" }, "50%": { boxShadow: "0 0 0 6px rgba(255,77,106,0)" } },
        ticker: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "pulse-green": "pulse-green 2s infinite",
        "pulse-red": "pulse-red 2s infinite",
        ticker: "ticker 30s linear infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
