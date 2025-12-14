import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'

// Inicializar GoogleAuth
GoogleAuth.initialize({
  clientId: '962288789210-o9itjf2ii552s82jk4vvte3m6v2krq9m.apps.googleusercontent.com',
  scopes: ['profile', 'email'],
  grantOfflineAccess: true,
})

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)

app.mount('#app')

// Setup WebSocket listener for expense notifications (only in dev mode with HMR)
interface ExpenseNotification {
  amount: number
  bank: string
  description: string
  category: string
  timestamp: number
}

if (import.meta.hot) {
  import.meta.hot.on('expense-notification', (data: ExpenseNotification) => {
    console.log('🔔 Expense notification received:', data)

    // Import budget store and add pending expense
    import('./stores/budget').then(({ useBudgetStore }) => {
      const budgetStore = useBudgetStore(pinia)
      budgetStore.addPendingExpense({
        amount: data.amount,
        bank: data.bank,
        description: data.description,
        category: data.category,
        timestamp: data.timestamp
      })
    })
  })
}
