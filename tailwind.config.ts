import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Corinthians Brand Colors
        corinthians: {
          black: "#000000",
          white: "#FFFFFF",
          // Primary accent: Orange (Modern Theme - Default)
          orange: "#FF6B00",
          "orange-dark": "#CC5500",
          // Legacy gold colors (for backwards compatibility)
          gold: "#FFD700",
          "gold-dark": "#DAA520",
          // Gray scale
          "gray-dark": "#1A1A1A",
          "gray-medium": "#2D2D2D",
          "gray-light": "#3F3F3F",
        },
        // Shadcn UI compatibility
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-bebas)", "Impact", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-corinthians":
          "linear-gradient(135deg, #000000 0%, #1A1A1A 50%, #000000 100%)",
        // Primary gradient using CSS variables
        "gradient-accent":
          "linear-gradient(135deg, var(--gradient-accent-start) 0%, var(--gradient-accent-end) 100%)",
        // Modern orange gradient (default)
        "gradient-orange": "linear-gradient(135deg, #FF6B00 0%, #CC5500 100%)",
        // Legacy gold gradient
        "gradient-gold": "linear-gradient(135deg, #FFD700 0%, #DAA520 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-down": "slideDown 0.4s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      boxShadow: {
        "glow-orange": "0 0 20px rgba(255, 107, 0, 0.5)",
        "glow-gold": "0 0 20px rgba(255, 215, 0, 0.5)",
        "glow-white": "0 0 20px rgba(255, 255, 255, 0.3)",
        "inner-glow": "inset 0 0 20px rgba(255, 107, 0, 0.2)",
        "inner-glow-gold": "inset 0 0 20px rgba(255, 215, 0, 0.2)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
