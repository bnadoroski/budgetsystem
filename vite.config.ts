import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Custom plugin to handle API endpoints
const apiPlugin = () => {
  return {
    name: 'api-plugin',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url === '/api/expenses' && req.method === 'POST') {
          let body = ''
          
          req.on('data', (chunk: any) => {
            body += chunk.toString()
          })
          
          req.on('end', () => {
            try {
              const expense = JSON.parse(body)
              console.log('📱 Notification received from Android:', expense)
              
              // Broadcast to all connected clients via WebSocket
              server.ws.send({
                type: 'custom',
                event: 'expense-notification',
                data: expense
              })
              
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ 
                success: true, 
                message: 'Expense received',
                expense 
              }))
            } catch (e) {
              console.error('Error parsing expense:', e)
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }))
            }
          })
        } else {
          next()
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    apiPlugin(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 5173,
  },
  // @ts-ignore - Vitest config
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
