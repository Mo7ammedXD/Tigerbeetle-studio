import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { aliases, mdi } from "vuetify/iconsets/mdi";
import "vuetify/styles";

// Light Theme - Clean and Professional
const lightTheme = {
  dark: false,
  colors: {
    primary: "#FF6B35", // TigerBeetle Orange - vibrant and energetic
    secondary: "#2C3E50", // Dark Blue-Gray - professional
    accent: "#3498DB", // Bright Blue - modern accent
    error: "#E74C3C", // Red - clear error indication
    info: "#3498DB", // Blue - informative
    success: "#27AE60", // Green - positive actions
    warning: "#F39C12", // Amber - warnings
    background: "#F5F7FA", // Light Gray - easy on eyes
    surface: "#FFFFFF", // Pure White - clean cards
    "surface-variant": "#ECF0F1", // Light Gray - subtle variation
    "on-surface": "#2C3E50", // Dark text on light
    "on-primary": "#FFFFFF", // White text on primary
    "on-background": "#2C3E50", // Dark text on background
  },
};

const darkTheme = {
  dark: true,
  colors: {
    primary: "#FF6B35", // TigerBeetle Orange - consistent branding
    secondary: "#34495E", // Slate Gray - sophisticated
    accent: "#3498DB", // Bright Blue - pops on dark
    error: "#E74C3C", // Red - clear visibility
    info: "#3498DB", // Blue - informative
    success: "#27AE60", // Green - positive feedback
    warning: "#F39C12", // Amber - attention-grabbing
    background: "#1A1D29", // Deep Blue-Black - reduced eye strain
    surface: "#242837", // Slightly lighter - card elevation
    "surface-variant": "#2C3142", // Mid-tone - subtle depth
    "on-surface": "#E8EAF0", // Light Gray - readable text
    "on-primary": "#FFFFFF", // White text on primary
    "on-background": "#E8EAF0", // Light text on dark background
  },
};

export default createVuetify({
  components,
  directives,
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: "light",
    themes: {
      light: lightTheme,
      dark: darkTheme,
    },
  },
});
