import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { vPermission } from "./directives/permission";
import "./style.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.directive("permission", vPermission);

app.mount("#app");
