import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
// import OBR from '@owlbear-rodeo/sdk';
import { createPinia } from 'pinia'
import OBR, { type Theme } from "@owlbear-rodeo/sdk";

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.mount('#app');

export function applyTheme(theme: Theme) {
  const root = document.documentElement

  root.style.setProperty('--bg-default', theme.background.default)
  root.style.setProperty('--bg-paper', theme.background.paper)

  // text
  root.style.setProperty('--text-primary', theme.text.primary)
  root.style.setProperty('--text-secondary', theme.text.secondary)
  root.style.setProperty('--text-disabled', theme.text.disabled)

  // primary
  root.style.setProperty('--primary-main', theme.primary.main)
  root.style.setProperty('--primary-light', theme.primary.light)
  root.style.setProperty('--primary-dark', theme.primary.dark)
  root.style.setProperty('--primary-contrast', theme.primary.contrastText)

  // secondary
  root.style.setProperty('--secondary-main', theme.secondary.main)
  root.style.setProperty('--secondary-light', theme.secondary.light)
  root.style.setProperty('--secondary-dark', theme.secondary.dark)
  root.style.setProperty('--secondary-contrast', theme.secondary.contrastText)

  root.dataset.themeMode = theme.mode.toLowerCase()
}
OBR.onReady(() => {
  OBR.theme.onChange(applyTheme);
  OBR.theme.getTheme().then(applyTheme);
});