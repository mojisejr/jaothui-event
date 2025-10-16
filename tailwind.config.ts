import { type Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        prompt: ["Prompt", ...fontFamily.sans],
      },
      colors: {
        "buffalo-gold": "#D89A17",
        "buffalo-cream": "#F4E4C1",
        "buffalo-brown": "#8B4513",
        "microchip-green": "#22c55e",
        "event-active": "#3b82f6",
        "event-past": "#6b7280",
      },
    },
  },
  daisyui: {
    themes: [
      {
        mytheme: {
          primary: "#D89A17",
          "primary-content": "#ffffff",
          secondary: "#ffffff",
          "secondary-content": "D89A17",
          accent: "#393939",
          "accent-content": "#ffffff",
          error: "#D04848",
          "error-content": "#ffffff",
        },
      },
    ],
  },
  plugins: [require("daisyui")],
} satisfies Config;
