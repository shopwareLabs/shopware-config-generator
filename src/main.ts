import { createApp, type Plugin } from 'vue'
import { createI18n } from 'vue-i18n'
import { DeviceHelperPlugin } from '@shopware-ag/meteor-component-library'
import '@shopware-ag/meteor-component-library/styles.css'
import '@shopware-ag/meteor-component-library/font.css'
import './style.css'
import App from './App.vue'
import { initUrlSync } from './config'

const i18n = createI18n({
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en: {} },
  legacy: false,
})

initUrlSync()
createApp(App).use(i18n).use(DeviceHelperPlugin as unknown as Plugin).mount('#app')
