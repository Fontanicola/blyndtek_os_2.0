import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./types/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        carbon: "#0F172A",
        signal: "#263A6D",
        paper: "#F8FAFC",
        canvas: "#F1F5F9",
        white: "#FFFFFF",
        graphite: "#64748B",
        "signal-hover": "#1D2D55",
        "signal-light": "#DFEEFF",
        "surface-accent": "#DFEEFF",
        "carbon-soft": "#1E293B",
        danger: "#E53E3E",
        "danger-light": "#FFF5F5",
        success: "#38A169",
        "success-light": "#F0FFF4",
        warning: "#D97706",
        "warning-light": "#FFFBEB",
        postit: {
          amarillo: "#FFF6D8",
          rosa: "#FFE3EC",
          celeste: "#E3F0FF",
          verde: "#E3FFEE",
          violeta: "#F1E3FF"
        },
        line: "#CBD5E1",
        "line-soft": "#E2E8F0",
        "danger-hover": "#B91C1C"
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif"
        ]
      },
      fontSize: {
        xs: ["12px", { lineHeight: "16px", letterSpacing: "0.01em" }],
        sm: ["13px", { lineHeight: "18px", letterSpacing: "0.01em" }],
        base: ["14px", { lineHeight: "20px", letterSpacing: "0em" }],
        md: ["15px", { lineHeight: "22px", letterSpacing: "0em" }],
        lg: ["17px", { lineHeight: "24px", letterSpacing: "-0.01em" }],
        xl: ["20px", { lineHeight: "28px", letterSpacing: "-0.02em" }],
        "2xl": ["24px", { lineHeight: "32px", letterSpacing: "-0.02em" }],
        "3xl": ["30px", { lineHeight: "38px", letterSpacing: "-0.03em" }]
      },
      fontWeight: {
        body: "400",
        label: "500",
        title: "600"
      },
      borderRadius: {
        component: "6px",
        card: "6px",
        pill: "100px"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(11,14,20,0.03)",
        card: "0 1px 2px rgba(11,14,20,0.03)",
        modal: "0 8px 32px rgba(11,14,20,0.12)"
      },
      transitionDuration: {
        fast: "150ms",
        normal: "250ms"
      },
      transitionTimingFunction: {
        fast: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        normal: "cubic-bezier(0.2, 0.8, 0.2, 1)"
      },
      keyframes: {
        spinner: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" }
        },
        "overlay-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" }
        },
        "overlay-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" }
        },
        "modal-in": {
          "0%": { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        "modal-out": {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.96)" }
        }
      },
      animation: {
        spinner: "spinner 0.9s linear infinite",
        "overlay-in": "overlay-in 150ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "overlay-out": "overlay-out 150ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "modal-in": "modal-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1)",
        "modal-out": "modal-out 150ms cubic-bezier(0.2, 0.8, 0.2, 1)"
      }
    }
  },
  plugins: []
};

export default config;
