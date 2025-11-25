import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { aliases, mdi } from "vuetify/iconsets/mdi";
import "vuetify/styles";


const lightTheme = {
  dark: false,
  colors: {
    primary: "#FF6B35", 
    secondary: "#2C3E50", 
    accent: "#3498DB", 
    error: "#E74C3C", 
    info: "#3498DB", 
    success: "#27AE60", 
    warning: "#F39C12", 
    background: "#F5F7FA", 
    surface: "#FFFFFF", 
    "surface-variant": "#ECF0F1", 
    "on-surface": "#2C3E50", 
    "on-primary": "#FFFFFF", 
    "on-background": "#2C3E50", 
  },
};

const darkTheme = {
  dark: true,
  colors: {
    primary: "#FF6B35", 
    secondary: "#34495E", 
    accent: "#3498DB", 
    error: "#E74C3C", 
    info: "#3498DB", 
    success: "#27AE60", 
    warning: "#F39C12", 
    background: "#1A1D29", 
    surface: "#242837", 
    "surface-variant": "#2C3142", 
    "on-surface": "#E8EAF0", 
    "on-primary": "#FFFFFF", 
    "on-background": "#E8EAF0", 
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
