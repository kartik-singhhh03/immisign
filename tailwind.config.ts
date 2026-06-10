import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-geist)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-instrument)", "Instrument Serif", "Georgia", "serif"],
        display: ["var(--font-playfair)", "Playfair Display", "Georgia", "serif"],
      },
      colors: {
        mate: {
          primary: "#111111",
          secondary: "#1A1A1A",
          charcoal: "#232323",
          grey: "#F5F5F5",
          offwhite: "#FAFAFA",
          muted: "#6E6E6E",
          border: "#E7E7E7",
          accent: "#3E7C6B",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(8, 27, 46, 0.04), 0 8px 24px rgba(8, 27, 46, 0.04)",
        elevated: "0 18px 60px rgba(8, 27, 46, 0.10), 0 4px 14px rgba(8, 27, 46, 0.06)",
        premium: "0 24px 80px rgba(8, 27, 46, 0.12), inset 0 1px 0 rgba(255,255,255,0.72)",
        "mate-card": "0 1px 2px rgba(17, 17, 17, 0.04), 0 8px 32px rgba(17, 17, 17, 0.07)",
        "mate-float": "0 32px 64px -16px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.06)",
        "mate-btn": "0 1px 2px rgba(0, 0, 0, 0.08), 0 10px 28px rgba(0, 0, 0, 0.18)",
        "mate-btn-hover": "0 2px 4px rgba(0, 0, 0, 0.06), 0 16px 40px rgba(0, 0, 0, 0.22)",
        "mate-panel": "0 1px 0 rgba(255, 255, 255, 0.9) inset, 0 20px 50px rgba(17, 17, 17, 0.08)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
