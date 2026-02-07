import { createApp } from 'vue';
import './style.css';
import App from './App.vue';
// import OBR from '@owlbear-rodeo/sdk';
import { createPinia } from 'pinia'
// import OBR from "@owlbear-rodeo/sdk";

// window.addEventListener("keydown", (e)=> console.log(e));
// document.addEventListener("keydown", (e) =>console.log(e));

const pinia = createPinia();
const app = createApp(App);

app.use(pinia);
app.mount('#app');
// async function spam() {
//     console.log("FUCK!");
//     await new Promise((res) => setTimeout(res, 100));
//     requestAnimationFrame(spam);
// }
// spam();

// OBR.onReady(() => {
//     console.log("Aasasassas?!");
//     OBR.scene.onReadyChange((v) => {
//         console.log("IM I READY?!");
//         console.log(v);
//     });
// });
