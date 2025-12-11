import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

const pinia = createPinia()
app.use(pinia)
app.use(router)

app.mount('#app')

// Setup WebSocket listener for expense notifications (only in dev mode with HMR)
if (import.meta.hot) {
  import.meta.hot.on('expense-notification', (data: any) => {
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
