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
          "primary": "#D89A17",           // Buffalo gold
          "primary-content": "#000000",   // Black for better contrast on gold
          "secondary": "#F4E4C1",         // Buffalo cream
          "secondary-content": "#000000", // Black for better contrast
          "accent": "#393939",            // Dark accent
          "accent-content": "#ffffff",    // White text on dark accent
          "neutral": "#1f2937",           // Neutral gray
          "neutral-content": "#f9fafb",   // Light text on neutral
          "base-100": "#111827",          // Main dark background
          "base-200": "#1f2937",          // Card backgrounds
          "base-300": "#374151",          // Hover states
          "base-content": "#f9fafb",      // Main text color (light on dark)
          "info": "#3b82f6",              // Info blue
          "info-content": "#ffffff",      // White text on info
          "success": "#22c55e",           // Microchip green
          "success-content": "#ffffff",   // White text on success
          "warning": "#f59e0b",           // Orange warning
          "warning-content": "#000000",   // Black text on warning for better contrast
          "error": "#D04848",             // Error red
          "error-content": "#ffffff",     // White text on error
        },
      },
    ],
  },
  plugins: [require("daisyui")],
} satisfies Config;
