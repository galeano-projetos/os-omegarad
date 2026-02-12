import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "#D1B829",
          dark: "#B89E1F",
          light: "#E8D44D",
          50: "#FDF9E8",
          100: "#FAF0C2",
          200: "#F5E38A",
          300: "#EDD44D",
          400: "#D1B829",
          500: "#B89E1F",
          600: "#9A8318",
          700: "#7A6813",
          800: "#5C4E0F",
          900: "#3D340A",
        },
        dark: {
          DEFAULT: "#1a1a1a",
          50: "#f5f5f5",
          100: "#e5e5e5",
          200: "#d4d4d4",
          300: "#a3a3a3",
          400: "#737373",
          500: "#525252",
          600: "#404040",
          700: "#2d2d2d",
          800: "#1a1a1a",
          900: "#111111",
        },
      },
    },
  },
  plugins: [],
};
export default config;
