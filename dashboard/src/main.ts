import { createApp, watch, type Plugin } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import vuetify from './plugins/vuetify';
import confirmPlugin from './plugins/confirmPlugin';
import { setupI18n } from './i18n/composables';
import '@/scss/style.scss';
import VueApexCharts from 'vue3-apexcharts';

import githubHljsCssUrl from 'highlight.js/styles/github.css?url';
import githubDarkHljsCssUrl from 'highlight.js/styles/github-dark.css?url';

import print from 'vue3-print-nb';
import axios from 'axios';

import { loader } from '@guolao/vue-monaco-editor'
import * as monaco from 'monaco-editor';
import setupMonacoWorkers from '@/utils/monacoSetup';

setupMonacoWorkers();

function applyHljsTheme(isDark: boolean) {
  if (typeof document === 'undefined') return;

  const id = 'hljs-theme';
  const href = isDark ? githubDarkHljsCssUrl : githubHljsCssUrl;

  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  if (link.href !== href) link.href = href;
}

watch(
  () => vuetify.theme.global.current.value.dark,
  (isDark) => applyHljsTheme(isDark),
  { immediate: true },
);

// 初始化新的i18n系统，等待完成后再挂载应用
setupI18n().then(() => {
  console.log('🌍 i18n系统初始化完成');
  
  const app = createApp(App);
  app.use(router);
  const pinia = createPinia();
  app.use(pinia);
  app.use(print);
  app.use(VueApexCharts as Plugin);
  app.use(vuetify);
  app.use(confirmPlugin);
  app.mount('#app');
  
  // 挂载后同步 Vuetify 主题
  import('./stores/customizer').then(({ useCustomizerStore }) => {
    const customizer = useCustomizerStore(pinia);
    vuetify.theme.global.name.value = customizer.uiTheme;
  });
}).catch(error => {
  console.error('❌ 新i18n系统初始化失败:', error);
  
  // 即使i18n初始化失败，也要挂载应用（使用回退机制）
  const app = createApp(App);
  app.use(router);
  const pinia = createPinia();
  app.use(pinia);
  app.use(print);
  app.use(VueApexCharts as Plugin);
  app.use(vuetify);
  app.use(confirmPlugin);
  app.mount('#app');
  
  // 挂载后同步 Vuetify 主题
  import('./stores/customizer').then(({ useCustomizerStore }) => {
    const customizer = useCustomizerStore(pinia);
    vuetify.theme.global.name.value = customizer.uiTheme;
  });
});


axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// 这里依然保留，告诉 loader 使用我们配置好环境的 monaco 实例
loader.config({
  monaco,
})