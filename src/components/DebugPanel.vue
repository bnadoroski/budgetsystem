<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click="close">
        <div class="modal-content debug-panel" @click.stop>
          <h2>🐛 Debug Panel</h2>

          <div class="debug-section">
            <h3>Server Connection</h3>
            <div class="info-row">
              <span>Status:</span>
              <span :class="connectionStatus">{{ connectionText }}</span>
            </div>
            <div class="info-row">
              <span>Endpoint:</span>
              <code>{{ serverEndpoint }}</code>
            </div>
            <button class="btn-test" @click="testConnection">Test Connection</button>
          </div>

          <div class="debug-section">
            <h3>🔥 Firebase Connection Test</h3>
            <div v-if="firebaseTestResult" class="test-result">
              <pre>{{ firebaseTestResult }}</pre>
            </div>
            <button class="btn-test" @click="runFirebaseTest" :disabled="testingFirebase">
              {{ testingFirebase ? 'Testing...' : 'Run Firebase Test' }}
            </button>
          </div>

          <div class="debug-section">
            <h3>📊 Mock Data (Testing)</h3>
            <p class="section-description">Cria transações fictícias de janeiro 2026 para testar o calendário e
              histórico.</p>
            <div v-if="mockDataResult" class="test-result">
              <pre>{{ mockDataResult }}</pre>
            </div>
            <button class="btn-test btn-mock" @click="generateMockData" :disabled="creatingMockData">
              {{ creatingMockData ? 'Criando...' : '📅 Criar Dados de Janeiro 2026' }}
            </button>
          </div>

          <div class="debug-section">
            <h3>💳 Sincronizar Assinatura Stripe</h3>
            <p class="section-description">Força sincronização da assinatura do Stripe após pagamento.</p>
            <div v-if="syncSubscriptionResult" class="test-result">
              <pre>{{ syncSubscriptionResult }}</pre>
            </div>
            <button class="btn-test btn-sync-stripe" @click="syncStripeSubscription" :disabled="syncingSubscription">
              {{ syncingSubscription ? 'Sincronizando...' : '🔄 Sincronizar Assinatura' }}
            </button>
          </div>

          <div class="debug-section">
            <h3>Simulate Notification</h3>
            <form @submit.prevent="sendTestNotification">
              <div class="form-group">
                <label>Bank</label>
                <select v-model="testNotification.bank">
                  <option value="Nubank">Nubank</option>
                  <option value="Inter">Inter</option>
                  <option value="C6 Bank">C6 Bank</option>
                  <option value="PicPay">PicPay</option>
                </select>
              </div>

              <div class="form-group">
                <label>Amount (R$)</label>
                <input v-model.number="testNotification.amount" type="number" step="0.01" required />
              </div>

              <div class="form-group">
                <label>Description</label>
                <input v-model="testNotification.description" type="text" required />
              </div>

              <div class="form-group">
                <label>Category</label>
                <select v-model="testNotification.category">
                  <option value="Alimentação">Alimentação</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Lazer">Lazer</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Contas Fixas">Contas Fixas</option>
                  <option value="Vestuário">Vestuário</option>
                  <option value="Educação">Educação</option>
                  <option value="Casa">Casa</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <button type="submit" class="btn-send">Send Test Notification</button>
            </form>
          </div>

          <div class="debug-section">
            <h3>Pending Expenses ({{ budgetStore.pendingExpenses.length }})</h3>
            <div v-if="budgetStore.pendingExpenses.length === 0" class="empty-state">
              No pending expenses
            </div>
            <div v-else class="expenses-list">
              <div v-for="expense in budgetStore.pendingExpenses" :key="expense.id" class="expense-item">
                <div class="expense-header">
                  <strong>{{ expense.bank }}</strong>
                  <span class="amount">{{ formatCurrency(expense.amount) }}</span>
                </div>
                <div class="expense-details">
                  <span>{{ expense.description }}</span>
                  <span class="category">{{ expense.category }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="debug-section">
            <h3>Recent Logs</h3>
            <div class="logs-container">
              <div v-for="(log, index) in logs" :key="index" class="log-entry" :class="log.type">
                <span class="log-time">{{ log.time }}</span>
                <span class="log-message">{{ log.message }}</span>
              </div>
            </div>
          </div>

          <button class="btn-close" @click="close">Close</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { testFirebaseConnection, formatTestResults } from '@/utils/firebaseTest'
import { createMockTransactions } from '@/utils/createMockData'
import { stripeService } from '@/services/StripeService'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const budgetStore = useBudgetStore()
const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()

const connectionStatus = ref<'connected' | 'disconnected' | 'testing'>('disconnected')
const serverEndpoint = ref('http://192.168.18.16:5173/api/expenses')
const testingFirebase = ref(false)
const firebaseTestResult = ref('')
const creatingMockData = ref(false)
const mockDataResult = ref('')
const syncingSubscription = ref(false)
const syncSubscriptionResult = ref('')

const testNotification = ref({
  bank: 'Nubank',
  amount: 45.90,
  description: 'Compra aprovada',
  category: 'Alimentação'
})

const logs = ref<Array<{ time: string; message: string; type: string }>>([])

const connectionText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return '✅ Connected'
    case 'testing':
      return '⏳ Testing...'
    default:
      return '❌ Disconnected'
  }
})

const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
  const now = new Date()
  const time = now.toLocaleTimeString()
  logs.value.unshift({ time, message, type })
  if (logs.value.length > 10) {
    logs.value.pop()
  }
}

const testConnection = async () => {
  connectionStatus.value = 'testing'
  addLog('Testing connection...', 'info')

  try {
    const response = await fetch(serverEndpoint.value, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'test',
        timestamp: Date.now()
      })
    })

    if (response.ok) {
      connectionStatus.value = 'connected'
      addLog('Connection successful!', 'success')
    } else {
      connectionStatus.value = 'disconnected'
      addLog(`Connection failed: ${response.status}`, 'error')
    }
  } catch (error) {
    connectionStatus.value = 'disconnected'
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    addLog(`Connection error: ${errorMessage}`, 'error')
  }
}

const sendTestNotification = async () => {
  addLog('Sending test notification...', 'info')

  try {
    const payload = {
      type: 'expense',
      amount: testNotification.value.amount,
      bank: testNotification.value.bank,
      description: testNotification.value.description,
      category: testNotification.value.category,
      timestamp: Date.now()
    }

    const response = await fetch(serverEndpoint.value, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      const result = await response.json()
      addLog(`Test notification sent successfully`, 'success')

      // Add to pending expenses
      budgetStore.addPendingExpense({
        amount: payload.amount,
        bank: payload.bank,
        description: payload.description,
        category: payload.category,
        timestamp: payload.timestamp
      })
    } else {
      addLog(`Failed to send: ${response.status}`, 'error')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    addLog(`Error: ${errorMessage}`, 'error')
  }
}

const runFirebaseTest = async () => {
  testingFirebase.value = true
  firebaseTestResult.value = 'Testing...'
  addLog('Running Firebase connection test...', 'info')

  try {
    const results = await testFirebaseConnection()
    firebaseTestResult.value = formatTestResults(results)

    if (results.firestore && results.write) {
      addLog('✅ Firebase fully operational', 'success')
    } else if (results.auth && results.read) {
      addLog('⚠️ Firebase connected but writes failing', 'error')
    } else {
      addLog('❌ Firebase connection issues detected', 'error')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    firebaseTestResult.value = `Test failed: ${errorMessage}`
    addLog(`Firebase test error: ${errorMessage}`, 'error')
  } finally {
    testingFirebase.value = false
  }
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const generateMockData = async () => {
  if (!authStore.user?.uid) {
    mockDataResult.value = '❌ Usuário não logado'
    addLog('Mock data: User not logged in', 'error')
    return
  }

  creatingMockData.value = true
  mockDataResult.value = 'Criando transações...'
  addLog('Creating mock transactions for January 2026...', 'info')

  try {
    await createMockTransactions(authStore.user.uid)
    mockDataResult.value = '✅ Transações de janeiro 2026 criadas!'
    addLog('Mock data created successfully', 'success')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    mockDataResult.value = `❌ Erro: ${errorMessage}`
    addLog(`Mock data error: ${errorMessage}`, 'error')
  } finally {
    creatingMockData.value = false
  }
}

const syncStripeSubscription = async () => {
  syncingSubscription.value = true
  syncSubscriptionResult.value = 'Sincronizando com Stripe...'
  addLog('Syncing Stripe subscription...', 'info')

  try {
    const result = await stripeService.syncSubscription()

    if (result.isPremium) {
      syncSubscriptionResult.value = `✅ Premium ativo!\nStatus: ${result.subscription?.status}\nVálido até: ${result.subscription?.currentPeriodEnd}`
      addLog('Subscription synced: Premium active', 'success')
      // Recarrega subscription no store
      await subscriptionStore.loadSubscription()
    } else if (result.subscription) {
      syncSubscriptionResult.value = `⚠️ Status: ${result.subscription.status}\nNão é uma assinatura ativa`
      addLog(`Subscription synced: ${result.subscription.status}`, 'info')
    } else {
      syncSubscriptionResult.value = '❌ Nenhuma assinatura encontrada no Stripe'
      addLog('No subscription found in Stripe', 'error')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    syncSubscriptionResult.value = `❌ Erro: ${errorMessage}`
    addLog(`Sync error: ${errorMessage}`, 'error')
  } finally {
    syncingSubscription.value = false
  }
}

const close = () => {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  overflow-y: auto;
  padding: 20px;
}

.debug-panel {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

h2 {
  margin: 0 0 20px 0;
  font-size: 24px;
  color: #333;
}

h3 {
  font-size: 16px;
  color: #555;
  margin-bottom: 12px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 8px;
}

.debug-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 14px;
}

.info-row code {
  background: #e0e0e0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
}

.connected {
  color: #4CAF50;
  font-weight: 600;
}

.disconnected {
  color: #f44336;
  font-weight: 600;
}

.testing {
  color: #FF9800;
  font-weight: 600;
}

.test-result {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.test-result pre {
  margin: 0;
  font-size: 12px;
  line-height: 1.4;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #555;
  font-size: 14px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 8px;
  -webkit-tap-highlight-color: transparent;
}

.btn-test {
  background-color: #2196F3;
  color: white;
}

.btn-test:hover {
  background-color: #1976D2;
}

.btn-mock {
  background-color: #9C27B0;
}

.btn-mock:hover {
  background-color: #7B1FA2;
}

.btn-sync-stripe {
  background-color: #FF9800;
}

.btn-sync-stripe:hover {
  background-color: #F57C00;
}

.section-description {
  font-size: 12px;
  color: #666;
  margin-bottom: 12px;
}

.btn-send {
  background-color: #4CAF50;
  color: white;
}

.btn-send:hover {
  background-color: #45a049;
}

.btn-close {
  background-color: #f0f0f0;
  color: #666;
}

.btn-close:hover {
  background-color: #e0e0e0;
}

.expenses-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.expense-item {
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.expense-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.expense-header strong {
  color: #333;
}

.amount {
  color: #E91E63;
  font-weight: 600;
}

.expense-details {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.category {
  background: #E3F2FD;
  padding: 2px 8px;
  border-radius: 4px;
  color: #1565C0;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 14px;
}

.logs-container {
  background: #2d2d2d;
  color: #fff;
  padding: 12px;
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 12px;
}

.log-entry {
  padding: 4px 0;
  border-bottom: 1px solid #444;
}

.log-entry:last-child {
  border-bottom: none;
}

.log-time {
  color: #888;
  margin-right: 8px;
}

.log-entry.success {
  color: #4CAF50;
}

.log-entry.error {
  color: #f44336;
}

.log-entry.info {
  color: #fff;
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
