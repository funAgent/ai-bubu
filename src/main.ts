import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import './styles/main.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
