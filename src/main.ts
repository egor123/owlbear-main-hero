import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
// import OBR from '@owlbear-rodeo/sdk';
import { createPinia } from 'pinia'
// import OBR from "@owlbear-rodeo/sdk";

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.mount('#app');

