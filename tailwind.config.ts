import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        elevated: "rgb(var(--surface-elevated) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        "primary-foreground": "rgb(var(--primary-foreground) / <alpha-value>)",
        secondary: "rgb(var(--secondary) / <alpha-value>)",
        "secondary-foreground": "rgb(var(--secondary-foreground) / <alpha-value>)",
        "muted-surface": "rgb(var(--muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        income: "rgb(var(--income) / <alpha-value>)",
        expense: "rgb(var(--expense) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
        destructive: "rgb(var(--destructive) / <alpha-value>)",
        "destructive-foreground": "rgb(var(--destructive-foreground) / <alpha-value>)",
        chart: {
          1: "rgb(var(--chart-1) / <alpha-value>)",
          2: "rgb(var(--chart-2) / <alpha-value>)",
          3: "rgb(var(--chart-3) / <alpha-value>)",
          4: "rgb(var(--chart-4) / <alpha-value>)",
          5: "rgb(var(--chart-5) / <alpha-value>)",
          6: "rgb(var(--chart-6) / <alpha-value>)",
        },
        // Compatibility aliases used throughout the feature UI. Each points to
        // the semantic token above rather than maintaining a second palette.
        ink: "rgb(var(--foreground) / <alpha-value>)",
        muted: "rgb(var(--muted-foreground) / <alpha-value>)",
        canvas: "rgb(var(--background) / <alpha-value>)",
        line: "rgb(var(--border) / <alpha-value>)",
        brand: "rgb(var(--ring) / <alpha-value>)",
        accent: "rgb(var(--secondary) / <alpha-value>)",
        positive: "rgb(var(--income) / <alpha-value>)",
        negative: "rgb(var(--destructive) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Manrope Variable", "Manrope", "Inter", "Segoe UI Variable", "ui-sans-serif", "system-ui"],
        display: ["Manrope Variable", "Manrope", "Inter", "Segoe UI Variable", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        card: "0 18px 50px rgb(var(--shadow) / .12), inset 0 1px 0 rgb(255 255 255 / .025)",
        float: "0 14px 34px rgb(var(--shadow) / .2)",
      },
      borderRadius: {
        "4xl": "2rem",
        panel: "1.5rem",
        control: ".875rem",
      },
      keyframes: {
        "fade-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-up": "fade-up .45s ease-out both",
      },
    },
  },
  plugins: [],
} satisfies Config;
