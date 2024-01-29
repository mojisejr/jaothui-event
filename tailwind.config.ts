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
