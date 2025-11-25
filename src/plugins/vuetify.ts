import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import { aliases, mdi } from "vuetify/iconsets/mdi";
import "vuetify/styles";


const lightTheme = {
  dark: false,
  colors: {
    primary: "#1A1A1A",
    secondary: "#5F6368",
    accent: "#3C4043",
    error: "#D32F2F",
    info: "#1976D2",
    success: "#388E3C",
    warning: "#FBC02D",
    background: "#FFFFFF",
    surface: "#F5F5F7",
    "surface-variant": "#000000",
    "on-surface": "#1A1A1A",
    "on-primary": "#FFFFFF",
    "on-background": "#1A1A1A",
    border: "#E1E1E1",
  },
};

const darkTheme = {
  dark: true,
  colors: {
    primary: "#FFFFFF",
    secondary: "#A1A1A1",
    accent: "#D0D0D0",
    

    error: "#EF5350",
    info: "#64B5F6",
    success: "#81C784",
    warning: "#FFD54F",

    background: "#121212",
    surface: "#000000", 
    "surface-variant": "#ffffff",
    "on-surface": "#E8EAF0",
    "on-primary": "#000000",
    "on-background": "#E8EAF0",
    

    border: "#404040", 
  },
};


const defaults = {
  global: {
    ripple: false, 
    elevation: 0,
  },
  VAppBar: {
    flat: true,
    border: 'b',
    color: 'background',
    density: 'comfortable',
  },
  VNavigationDrawer: {
    flat: true,
    border: 'e',
    color: 'background',
  },
  VCard: {
    flat: true,
    border: true,

    rounded: 'lg', 
  },
  VBtn: {
    flat: true,
    height: 48, 
    rounded: 'lg',
    fontWeight: '600',
    letterSpacing: '0.5px',
  },

  VTextField: { variant: 'outlined', density: 'comfortable', color: 'primary', hideDetails: 'auto', rounded: 'md' },
  VTextarea:  { variant: 'outlined', density: 'comfortable', color: 'primary', hideDetails: 'auto', rounded: 'md' },
  VSelect:    { variant: 'outlined', density: 'comfortable', color: 'primary', hideDetails: 'auto', rounded: 'md' },
  VCheckbox:  { color: 'primary', density: 'comfortable' },
  VRadio:     { color: 'primary', density: 'comfortable' },
  VSwitch:    { color: 'primary', inset: true, density: 'compact' },
  
  VChip: {

    rounded: 'md', 

    fontWeight: '600', 
    variant: 'flat',
    density: 'comfortable',
  },
  VDialog: {
    elevation: 10, 
    rounded: 'lg',
  },
  VDataTable: {
    density: 'comfortable',
    hover: true,
  }
};


export default createVuetify({
  components,
  directives,
  defaults,
  icons: {
    defaultSet: "mdi",
    aliases,
    sets: {
      mdi,
    },
  },
  theme: {
    defaultTheme: "dark", 
    themes: {
      light: lightTheme,
      dark: darkTheme,
    },

    variables: {

      'border-radius-root': '4px', 

      'heading-font-family': 'inherit',
      'body-font-family': 'inherit',
      

      'h1-letter-spacing': '-0.015625em',
      'h2-letter-spacing': '-0.0083333333em',
      'h3-letter-spacing': 'normal',
      'h4-letter-spacing': '0.0025em',
      'h5-letter-spacing': 'normal',
      'h6-letter-spacing': '0.0125em',

      'h1-weight': '700',
      'h2-weight': '700',
      'h3-weight': '600',
      'h4-weight': '600',
      
      'btn-text-transform': 'none',
    },
  },
});