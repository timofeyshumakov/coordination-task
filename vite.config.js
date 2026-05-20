import { defineConfig } from 'vite';
import copy from 'rollup-plugin-copy';
import vue from '@vitejs/plugin-vue'

   export default defineConfig({
     plugins: [
      vue(),
      copy({
        targets: [
          { src: 'public/fonts/*', dest: 'dist/assets/fonts' }, // Укажите путь к шрифтам
        ],
        verbose: true, // Для получения информации о копировании
        hook: 'writeBundle', // Копируем после сборки
        apply: 'build', // Применяется только в режиме сборки
      })
    ],
    test: {
      browser: {
        enabled: true,
        name: 'chromium',
      },
    },
     server: {
       https: {
         key: './private.key',
         cert: './cert.pem',
       },
        proxy: {
        '/requests.json': {
          target: 'https://dev2.smartbusinessclub.ru/timofei/b24_iw2sts_bitrix24_ru/requests.json',
          changeOrigin: true,
          secure: false,
        },
      },
        host: '127.0.0.1', // Адрес сервера
        port: 5173          // Порт сервера
     },
     build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined

            if (id.includes('node_modules/vuetify')) {
              return 'vendor-vuetify'
            }
            if (id.includes('node_modules/highcharts') || id.includes('node_modules/highcharts-vue')) {
              return 'vendor-charts'
            }
            if (id.includes('node_modules/@mdi') || id.includes('node_modules/font-awesome')) {
              return 'vendor-icons'
            }
            if (id.includes('node_modules/vue') || id.includes('node_modules/pinia')) {
              return 'vendor-vue'
            }

            return 'vendor'
          },
          chunkFileNames: (chunkInfo) => {
            if (chunkInfo.name?.startsWith('vendor')) {
              return 'assets/[name]-[hash].js'
            }
            return 'assets/[name]-[hash].js'
          },
        },
      },
     },
   });

