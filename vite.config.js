import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      '/express-api': {
        target: 'https://quick.glcpaints.com:7790',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/express-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIExprssControlOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      },
      '/hr-api': {
        target: 'https://quick.glcpaints.com:7001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/hr-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIHRControlOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      },
      '/api': {
        target: 'https://quick.glcpaints.com:7003',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIERPControlOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      },
      '/plus-api': {
        target: 'https://quick.glcpaints.com:7003',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/plus-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIPlusOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      },
      '/query-api': {
        target: 'https://quick.glcpaints.com:7003',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/query-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIPlusQueryOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      },
      '/purchasing-api': {
        target: 'https://quick.glcpaints.com:7003',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/purchasing-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIPlusPurchasingOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      },
      '/logistics-api': {
        target: 'https://quick.glcpaints.com:7003',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/logistics-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIPlusLogisticsOperation')
            proxyReq.setHeader('Accept', 'application/json')
            proxyReq.setHeader('Content-Type', 'application/json')
          })
        }
      },
      '/express-codes-api': {
        target: 'https://be.glcpaints.com:7788',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/express-codes-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('SP_Name', 'APIPlusExpressGenerateCodeOperation')
            proxyReq.setHeader('Accept', 'application/json')
          })
        }
      }
    }
  }
})
