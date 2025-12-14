<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, onErrorCaptured } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useAuthStore } from '@/stores/auth'
import { App as CapacitorApp } from '@capacitor/app'
import BudgetBar from '@/components/BudgetBar.vue'
import BudgetGroup from '@/components/BudgetGroup.vue'
import AddBudgetModal from '@/components/AddBudgetModal.vue'
import AuthModal from '@/components/AuthModal.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import GroupsModal from '@/components/GroupsModal.vue'
import ShareBudgetModal from '@/components/ShareBudgetModal.vue'
import HistoryModal from '@/components/HistoryModal.vue'
import DebugPanel from '@/components/DebugPanel.vue'

const budgetStore = useBudgetStore()
const authStore = useAuthStore()

// Error handling state
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string | null>(null)

// Global error handler
const handleError = (error: Error, context: string) => {
  console.error(`❌ Erro em ${context}:`, error)
  errorMessage.value = `Erro em ${context}`
  errorDetails.value = `${error.name}: ${error.message}\n\nStack:\n${error.stack || 'Não disponível'}`

  // Auto-hide depois de 10 segundos
  setTimeout(() => {
    errorMessage.value = null
    errorDetails.value = null
  }, 10000)
}

// Capture Vue component errors
onErrorCaptured((error: Error, instance, info) => {
  handleError(error, `componente Vue (${info})`)
  return false // Prevent error propagation
})

// Handle unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled Promise Rejection:', event.reason)
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason))
    handleError(error, 'Promise não tratada')
    event.preventDefault()
  })

  // Handle global errors
  window.addEventListener('error', (event) => {
    console.error('❌ Global Error:', event.error)
    handleError(event.error || new Error(event.message), 'erro global')
    event.preventDefault()
  })
}
const showAddModal = ref(false)
const showAuthModal = ref(false)
const showSettingsModal = ref(false)
const showGroupsModal = ref(false)
const showShareModal = ref(false)
const showHistoryModal = ref(false)
const showDebugPanel = ref(false)
const selectedGroupIdForNewBudget = ref<string | undefined>(undefined)
const debugInfo = ref('')

// Handler do botão voltar do Android
const handleBackButton = () => {
  // Fecha modais abertas na ordem de prioridade
  if (showAddModal.value) {
    showAddModal.value = false
    return
  }
  if (showAuthModal.value) {
    showAuthModal.value = false
    return
  }
  if (showSettingsModal.value) {
    showSettingsModal.value = false
    return
  }
  if (showGroupsModal.value) {
    showGroupsModal.value = false
    return
  }
  if (showShareModal.value) {
    showShareModal.value = false
    return
  }
  if (showHistoryModal.value) {
    showHistoryModal.value = false
    return
  }
  if (showDebugPanel.value) {
    showDebugPanel.value = false
    return
  }

  // Se nenhuma modal está aberta, minimiza o app
  CapacitorApp.minimizeApp()
}

const handleAddBudget = (name: string, value: number, color: string, groupId?: string) => {
  budgetStore.addBudget(name, value, color, groupId)
  selectedGroupIdForNewBudget.value = undefined
}

const handleAddBudgetToGroup = (groupId: string) => {
  if (!authStore.isAuthenticated) {
    showAuthModal.value = true
  } else {
    selectedGroupIdForNewBudget.value = groupId
    showAddModal.value = true
  }
}

const handleEditBudget = (budgetId: string) => {
  // TODO: Implementar modal de edição
  console.log('Editar budget:', budgetId)
}

const handleDeleteBudget = async (budgetId: string) => {
  if (confirm('Tem certeza que deseja excluir este budget?')) {
    await budgetStore.deleteBudget(budgetId)
  }
}

const handleAddBudgetClick = () => {
  if (!authStore.isAuthenticated) {
    showAuthModal.value = true
  } else {
    showAddModal.value = true
  }
}

const handleGroupsClick = () => {
  if (!authStore.isAuthenticated) {
    showAuthModal.value = true
  } else {
    showGroupsModal.value = true
  }
}

const ungroupedBudgets = computed(() => {
  return budgetStore.budgets.filter(b => !b.groupId)
})

const handleProfileClick = () => {
  if (authStore.isAuthenticated) {
    // Mostrar menu de perfil ou logout com email
    const email = authStore.userEmail || 'usuário'
    if (confirm(`Logado como: ${email}\n\nDeseja fazer logout?`)) {
      authStore.signOut()
    }
  } else {
    showAuthModal.value = true
  }
}

// Quando o usuário faz login/logout
watch(() => authStore.user, async (newUser, oldUser) => {
  try {
    if (newUser && !oldUser) {
      // Limpa dados antigos antes de carregar novos
      budgetStore.clearLocalData()

      // Para listeners antigos antes de iniciar novos
      budgetStore.stopBudgetsListener()
      budgetStore.stopGroupsListener()

      await budgetStore.migrateBudgetsToFirestore(newUser.uid)
      await budgetStore.loadBudgets(newUser.uid)
      await budgetStore.loadGroups(newUser.uid)
      await budgetStore.startSharedBudgetsListener(newUser.uid)
    } else if (!newUser && oldUser) {
      // Usuário fez logout
      budgetStore.stopBudgetsListener()
      budgetStore.stopGroupsListener()
      budgetStore.clearLocalData()
    }
  } catch (error) {
    handleError(error as Error, 'autenticação')
  }
})
// Carrega budgets do usuário autenticado na inicialização
onMounted(async () => {
  try {
    // Registra listener do botão voltar do Android
    CapacitorApp.addListener('backButton', handleBackButton)

    // Aguarda o Firebase verificar se há usuário autenticado
    const maxWaitTime = 2000 // 2 segundos no máximo
    const startTime = Date.now()

    while (authStore.loading && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    if (authStore.user) {
      // Usuário autenticado - carrega dados do Firebase
      await budgetStore.loadBudgets(authStore.user.uid)
      await budgetStore.loadGroups(authStore.user.uid)
      await budgetStore.startSharedBudgetsListener(authStore.user.uid)
    } else {
      // Não está autenticado - limpa dados locais e grupos fantasmas
      localStorage.removeItem('budgets')
      localStorage.removeItem('budgetGroups')
      localStorage.removeItem('pendingExpenses')
      budgetStore.clearLocalData() // Limpa grupos em memória também

      // Abre modal de login automaticamente
      setTimeout(() => {
        showAuthModal.value = true
      }, 500)
    }
  } catch (error) {
    handleError(error as Error, 'inicialização do app')
    debugInfo.value = '❌ Erro na inicialização'
  }
})

// Remove listener ao desmontar componente
onUnmounted(() => {
  CapacitorApp.removeAllListeners()
})
</script>

<template>
  <div class="app-container">
    <!-- Error Notification -->
    <div v-if="errorMessage" class="error-notification">
      <div class="error-header">
        <span class="error-icon">❌</span>
        <span class="error-title">{{ errorMessage }}</span>
        <button class="error-close" @click="errorMessage = null; errorDetails = null">×</button>
      </div>
      <div v-if="errorDetails" class="error-details">
        <pre>{{ errorDetails }}</pre>
      </div>
    </div>

    <!-- Debug Info (top center) -->
    <!-- <div v-if="debugInfo" class="debug-info">
      {{ debugInfo }}
    </div> -->

    <!-- Debug Button (top left) -->
    <!-- <button class="debug-button" @click="showDebugPanel = true" title="Debug Panel">
      🐛
    </button> -->

    <!-- History Button -->
    <div class="pt-8">
      <button class="history-button" @click="showHistoryModal = true" title="Ver histórico">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48">
          <g fill="none">
            <path fill="url(#SVGVSdJzcMZ)"
              d="M42 35.75A6.25 6.25 0 0 1 35.75 42h-23.5A6.25 6.25 0 0 1 6 35.75V16l18-1l18 1z" />
            <path fill="url(#SVGD1CMpKTK)"
              d="M42 35.75A6.25 6.25 0 0 1 35.75 42h-23.5A6.25 6.25 0 0 1 6 35.75V16l18-1l18 1z" />
            <g filter="url(#SVGJXIjpdIN)">
              <path fill="url(#SVGL6uCze5T)"
                d="M15.5 26a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5m11-2.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0m6 2.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5M18 31.5a2.5 2.5 0 1 1-5 0a2.5 2.5 0 0 1 5 0m6 2.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 0 0 0 5" />
            </g>
            <path fill="url(#SVGHrxJFdSI)" d="M12.25 6A6.25 6.25 0 0 0 6 12.25V16h36v-3.75A6.25 6.25 0 0 0 35.75 6z" />
            <defs>
              <linearGradient id="SVGVSdJzcMZ" x1="30.5" x2="20.973" y1="45.316" y2="16.104"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#b3e0ff" />
                <stop offset="1" stop-color="#b3e0ff" />
              </linearGradient>
              <linearGradient id="SVGD1CMpKTK" x1="27.857" x2="32.563" y1="26.046" y2="48.229"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#dcf8ff" stop-opacity="0" />
                <stop offset="1" stop-color="#ff6ce8" stop-opacity="0.7" />
              </linearGradient>
              <linearGradient id="SVGL6uCze5T" x1="22" x2="26.043" y1="19.5" y2="45.493" gradientUnits="userSpaceOnUse">
                <stop stop-color="#0078d4" />
                <stop offset="1" stop-color="#0067bf" />
              </linearGradient>
              <linearGradient id="SVGHrxJFdSI" x1="6" x2="36.743" y1="6" y2="-3.926" gradientUnits="userSpaceOnUse">
                <stop stop-color="#0094f0" />
                <stop offset="1" stop-color="#2764e7" />
              </linearGradient>
              <filter id="SVGJXIjpdIN" width="24.667" height="15.667" x="11.667" y="20.333"
                color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse">
                <feFlood flood-opacity="0" result="BackgroundImageFix" />
                <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" />
                <feOffset dy=".667" />
                <feGaussianBlur stdDeviation=".667" />
                <feColorMatrix values="0 0 0 0 0.1242 0 0 0 0 0.323337 0 0 0 0 0.7958 0 0 0 0.32 0" />
                <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_378174_9807" />
                <feBlend in="SourceGraphic" in2="effect1_dropShadow_378174_9807" result="shape" />
              </filter>
            </defs>
          </g>
        </svg>
      </button>
    </div>

    <div class="budget-list pt-8">
      <div v-if="budgetStore.budgets.length === 0 && budgetStore.groups.length === 0" class="empty-state">
        <div class="empty-state-card">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 6v6l4 2"></path>
          </svg>
          <h3>Nenhum budget criado</h3>
          <p>Clique no botão + abaixo para criar seu primeiro budget e começar a acompanhar seus gastos</p>
        </div>
      </div>

      <!-- Groups -->
      <BudgetGroup v-for="group in budgetStore.groups" :key="group.id" :group="group" @edit-budget="handleEditBudget"
        @delete-budget="handleDeleteBudget" @add-budget-to-group="handleAddBudgetToGroup" />

      <!-- Ungrouped Budgets -->
      <BudgetBar v-for="budget in ungroupedBudgets" :key="budget.id" :budget="budget"
        @edit="() => handleEditBudget(budget.id)" @delete="() => handleDeleteBudget(budget.id)" />
    </div>

    <div class="bottom-nav">
      <button class="nav-button" title="Grupos" @click="handleGroupsClick">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32">
          <g fill="none">
            <path fill="url(#SVGlHpytcfC)"
              d="M11 28h14.5a2.5 2.5 0 0 0 2.5-2.5v-2a2.5 2.5 0 0 0-2.5-2.5H11l-1 3.5zm0-9h14.5a2.5 2.5 0 0 0 2.5-2.5v-1a2.5 2.5 0 0 0-2.5-2.5H11l-1 3zm0-8h14.5A2.5 2.5 0 0 0 28 8.5v-2A2.5 2.5 0 0 0 25.5 4H11l-1 3.5z" />
            <path fill="url(#SVG5RI0JguJ)"
              d="M11 13v6H6.5A2.5 2.5 0 0 1 4 16.5v-1A2.5 2.5 0 0 1 6.5 13zm0-9v7H6.5A2.5 2.5 0 0 1 4 8.5v-2A2.5 2.5 0 0 1 6.5 4zm0 17v7H6.5A2.5 2.5 0 0 1 4 25.5v-2A2.5 2.5 0 0 1 6.5 21z" />
            <defs>
              <linearGradient id="SVGlHpytcfC" x1="7.3" x2="27.919" y1=".571" y2="26.64" gradientUnits="userSpaceOnUse">
                <stop stop-color="#36dff1" />
                <stop offset="1" stop-color="#0094f0" />
              </linearGradient>
              <linearGradient id="SVG5RI0JguJ" x1="5.665" x2="16.071" y1="7.19" y2="12.037"
                gradientUnits="userSpaceOnUse">
                <stop offset=".125" stop-color="#9c6cfe" />
                <stop offset="1" stop-color="#7a41dc" />
              </linearGradient>
            </defs>
          </g>
        </svg>
      </button>

      <button class="nav-button" title="Configurações" @click="showSettingsModal = true">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 20 20">
          <g fill="none">
            <path fill="url(#SVGPftDHeRF)"
              d="M16 5.117V10.5h-3V5.117a20 20 0 0 1-.29-.554a8 8 0 0 1-.148-.313A.6.6 0 0 1 12.5 4q0-.086.07-.312q.071-.228.157-.493t.171-.5q.087-.234.125-.351a.46.46 0 0 1 .18-.242A.55.55 0 0 1 13.5 2h2q.164 0 .29.094a.57.57 0 0 1 .187.25q.03.109.117.344l.18.5q.093.265.156.492q.062.225.07.32a.7.7 0 0 1-.062.242q-.063.15-.141.32a3 3 0 0 1-.164.313a2 2 0 0 0-.133.242" />
            <path fill="url(#SVGBGOkQeOY)"
              d="M17 11.5h-5v4.055q0 .507.203.953t.547.781A2.5 2.5 0 0 0 14.5 18q.5 0 .953-.195a2.7 2.7 0 0 0 .797-.524q.345-.327.547-.773a2.3 2.3 0 0 0 .203-.953z" />
            <path fill="url(#SVG58viBcga)"
              d="M17 12v-1.5a.6.6 0 0 0-.07-.273a.37.37 0 0 0-.172-.149a1 1 0 0 0-.235-.062a2 2 0 0 0-.257-.016h-3.532q-.14 0-.265.016a.7.7 0 0 0-.235.07a.44.44 0 0 0-.171.148a.5.5 0 0 0-.063.266V12z" />
            <path fill="url(#SVGFNnBvbYS)"
              d="M5.78 2.126a.5.5 0 0 1 .22.415v3.457a1 1 0 0 0 2 0V2.541a.5.5 0 0 1 .688-.463A4.501 4.501 0 0 1 9 10.282v5.716a2 2 0 1 1-4 0v-5.716a4.5 4.5 0 0 1 .312-8.204a.5.5 0 0 1 .467.048" />
            <defs>
              <linearGradient id="SVGPftDHeRF" x1="15.833" x2="12.81" y1=".38" y2="16.965"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#2bdabe" />
                <stop offset=".853" stop-color="#0067bf" />
              </linearGradient>
              <linearGradient id="SVGBGOkQeOY" x1="16.999" x2="10.446" y1="18.145" y2="13.592"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#ff6f47" />
                <stop offset="1" stop-color="#ffcd0f" />
              </linearGradient>
              <linearGradient id="SVG58viBcga" x1="13.376" x2="14.043" y1="10.484" y2="12.151"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#ffa43d" />
                <stop offset="1" stop-color="#fb5937" />
              </linearGradient>
              <linearGradient id="SVGFNnBvbYS" x1="10" x2="4.8" y1="-1" y2="18.48" gradientUnits="userSpaceOnUse">
                <stop stop-color="#2bdabe" />
                <stop offset="1" stop-color="#0067bf" />
              </linearGradient>
            </defs>
          </g>
        </svg>
      </button>

      <button class="nav-button add-button" @click="handleAddBudgetClick" title="Adicionar Budget">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <g fill="none">
            <path fill="url(#SVGau1xsAGW)"
              d="M30 16c0 7.732-6.268 14-14 14S2 23.732 2 16S8.268 2 16 2s14 6.268 14 14" />
            <path fill="url(#SVGYbPd5clO)"
              d="M15 10a1 1 0 1 1 2 0v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5h-5a1 1 0 1 1 0-2h5z" />
            <defs>
              <linearGradient id="SVGau1xsAGW" x1="3" x2="22.323" y1="7.25" y2="27.326" gradientUnits="userSpaceOnUse">
                <stop stop-color="#52d17c" />
                <stop offset="1" stop-color="#22918b" />
              </linearGradient>
              <linearGradient id="SVGYbPd5clO" x1="11.625" x2="15.921" y1="10.428" y2="25.592"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#fff" />
                <stop offset="1" stop-color="#e3ffd9" />
              </linearGradient>
            </defs>
          </g>
        </svg>
      </button>

      <button class="nav-button" title="Compartilhar" @click="showShareModal = true">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32">
          <g fill="none">
            <path fill="url(#SVGTCIsBbRM)" fill-rule="evenodd"
              d="M15 15H9.5A2.5 2.5 0 0 0 7 17.5V22h2v-4.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5V22h2v-4.5a2.5 2.5 0 0 0-2.5-2.5H17v-5h-2z"
              clip-rule="evenodd" />
            <path fill="url(#SVGpzlRP9hG)" fill-rule="evenodd"
              d="M15 15H9.5A2.5 2.5 0 0 0 7 17.5V22h2v-4.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5V22h2v-4.5a2.5 2.5 0 0 0-2.5-2.5H17v-5h-2z"
              clip-rule="evenodd" />
            <path fill="url(#SVG5sIYteLx)" fill-rule="evenodd"
              d="M15 15H9.5A2.5 2.5 0 0 0 7 17.5V22h2v-4.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5V22h2v-4.5a2.5 2.5 0 0 0-2.5-2.5H17v-5h-2z"
              clip-rule="evenodd" />
            <path fill="url(#SVGudKsbcgX)" fill-rule="evenodd"
              d="M15 15H9.5A2.5 2.5 0 0 0 7 17.5V22h2v-4.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 .5.5V22h2v-4.5a2.5 2.5 0 0 0-2.5-2.5H17v-5h-2z"
              clip-rule="evenodd" />
            <path fill="url(#SVGB8kyadpq)" d="M29 25a5 5 0 1 1-10 0a5 5 0 0 1 10 0" />
            <path fill="url(#SVGlrkOvePN)" d="M13 25a5 5 0 1 1-10 0a5 5 0 0 1 10 0" />
            <path fill="url(#SVGb6Cejerf)" d="M21 7a5 5 0 1 1-10 0a5 5 0 0 1 10 0" />
            <defs>
              <radialGradient id="SVGpzlRP9hG" cx="0" cy="0" r="1"
                gradientTransform="matrix(0 7.60577 -11.4087 0 16 6.394)" gradientUnits="userSpaceOnUse">
                <stop offset=".695" stop-color="#70777d" />
                <stop offset="1" stop-color="#70777d" stop-opacity="0" />
              </radialGradient>
              <radialGradient id="SVG5sIYteLx" cx="0" cy="0" r="1"
                gradientTransform="rotate(-90.216 16.302 8.464)scale(7.47121 11.2068)" gradientUnits="userSpaceOnUse">
                <stop offset=".549" stop-color="#70777d" />
                <stop offset="1" stop-color="#70777d" stop-opacity="0" />
              </radialGradient>
              <radialGradient id="SVGudKsbcgX" cx="0" cy="0" r="1"
                gradientTransform="rotate(-89.564 24.515 .257)scale(7.38483 11.0773)" gradientUnits="userSpaceOnUse">
                <stop offset=".549" stop-color="#70777d" />
                <stop offset="1" stop-color="#70777d" stop-opacity="0" />
              </radialGradient>
              <radialGradient id="SVGB8kyadpq" cx="0" cy="0" r="1"
                gradientTransform="rotate(53.616 -2.282 17.25)scale(27.0426 23.1608)" gradientUnits="userSpaceOnUse">
                <stop offset=".529" stop-color="#7b7bff" />
                <stop offset="1" stop-color="#4a43cb" />
              </radialGradient>
              <radialGradient id="SVGlrkOvePN" cx="0" cy="0" r="1"
                gradientTransform="rotate(53.616 -10.282 1.417)scale(27.0426 23.1608)" gradientUnits="userSpaceOnUse">
                <stop offset=".529" stop-color="#1ec8b0" />
                <stop offset="1" stop-color="#1a7f7c" />
              </radialGradient>
              <radialGradient id="SVGb6Cejerf" cx="0" cy="0" r="1"
                gradientTransform="rotate(53.616 11.529 .333)scale(27.0426 23.1608)" gradientUnits="userSpaceOnUse">
                <stop offset=".529" stop-color="#0fafff" />
                <stop offset="1" stop-color="#0067bf" />
              </radialGradient>
              <linearGradient id="SVGTCIsBbRM" x1="7" x2="10.055" y1="10" y2="23.094" gradientUnits="userSpaceOnUse">
                <stop stop-color="#b9c0c7" />
                <stop offset="1" stop-color="#70777d" />
              </linearGradient>
            </defs>
          </g>
        </svg>
      </button>

      <button class="nav-button" title="Perfil" @click="handleProfileClick">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32">
          <g fill="none">
            <path fill="#212121"
              d="M7.5 18A3.5 3.5 0 0 0 4 21.5v.5c0 2.393 1.523 4.417 3.685 5.793C9.859 29.177 12.802 30 16 30s6.14-.823 8.315-2.206C26.477 26.418 28 24.394 28 22v-.5a3.5 3.5 0 0 0-3.5-3.5z" />
            <path fill="url(#SVGKCH4Jk8K)"
              d="M7.5 18A3.5 3.5 0 0 0 4 21.5v.5c0 2.393 1.523 4.417 3.685 5.793C9.859 29.177 12.802 30 16 30s6.14-.823 8.315-2.206C26.477 26.418 28 24.394 28 22v-.5a3.5 3.5 0 0 0-3.5-3.5z" />
            <path fill="url(#SVGcp1ycBLD)"
              d="M7.5 18A3.5 3.5 0 0 0 4 21.5v.5c0 2.393 1.523 4.417 3.685 5.793C9.859 29.177 12.802 30 16 30s6.14-.823 8.315-2.206C26.477 26.418 28 24.394 28 22v-.5a3.5 3.5 0 0 0-3.5-3.5z" />
            <path fill="#242424" d="M16 16a7 7 0 1 0 0-14a7 7 0 0 0 0 14" />
            <path fill="url(#SVGUxDSsduC)" d="M16 16a7 7 0 1 0 0-14a7 7 0 0 0 0 14" />
            <defs>
              <linearGradient id="SVGKCH4Jk8K" x1="9.707" x2="13.584" y1="19.595" y2="31.977"
                gradientUnits="userSpaceOnUse">
                <stop offset=".125" stop-color="#9c6cfe" />
                <stop offset="1" stop-color="#7a41dc" />
              </linearGradient>
              <linearGradient id="SVGcp1ycBLD" x1="16" x2="21.429" y1="16.571" y2="36.857"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#885edb" stop-opacity="0" />
                <stop offset="1" stop-color="#e362f8" />
              </linearGradient>
              <linearGradient id="SVGUxDSsduC" x1="12.329" x2="19.464" y1="3.861" y2="15.254"
                gradientUnits="userSpaceOnUse">
                <stop offset=".125" stop-color="#9c6cfe" />
                <stop offset="1" stop-color="#7a41dc" />
              </linearGradient>
            </defs>
          </g>
        </svg>
        <span v-if="authStore.isAuthenticated" class="auth-indicator"></span>
      </button>
    </div>

    <AddBudgetModal :show="showAddModal" :preselected-group-id="selectedGroupIdForNewBudget"
      @close="showAddModal = false; selectedGroupIdForNewBudget = undefined" @submit="handleAddBudget" />
    <AuthModal :show="showAuthModal" @close="showAuthModal = false" />
    <SettingsModal :show="showSettingsModal" @close="showSettingsModal = false" />
    <GroupsModal :show="showGroupsModal" @close="showGroupsModal = false" />
    <ShareBudgetModal :show="showShareModal" @close="showShareModal = false" />
    <HistoryModal :show="showHistoryModal" @close="showHistoryModal = false" />
    <DebugPanel :show="showDebugPanel" @close="showDebugPanel = false" />
  </div>
</template>

<style scoped>
.app-container {
  max-width: 600px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: #f5f5f5;
  position: relative;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
  padding-top: env(safe-area-inset-top);
}

.app-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('/fundo.png');
  background-size: 400px 400px;
  background-repeat: repeat;
  opacity: 0.5;
  z-index: 0;
  pointer-events: none;
}

.budget-list {
  padding: 20px;
  position: relative;
  z-index: 1;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 60px 30px;
  color: #999;
}

.empty-state-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 40px 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-state svg {
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 20px;
  color: #666;
  margin-bottom: 12px;
}

.empty-state p {
  font-size: 14px;
  line-height: 1.6;
  max-width: 300px;
}

.debug-info {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(76, 175, 80, 0.95);
  color: white;
  padding: 12px 24px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  white-space: pre-line;
  text-align: center;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }

  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.debug-button {
  position: absolute;
  top: 30px;
  left: 20px;
  background: white;
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
  z-index: 10;
  -webkit-tap-highlight-color: transparent;
  font-size: 24px;
}

.debug-button:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.debug-button:active {
  transform: scale(0.95);
}

.history-button {
  position: absolute;
  top: 30px;
  right: 20px;
  background: white;
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
  z-index: 10;
  -webkit-tap-highlight-color: transparent;
}

.history-button:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.history-button:active {
  transform: scale(0.95);
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(70px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background-color: #e0e0e0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  margin: 0 auto;
}

.nav-button {
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 10px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  position: relative;
  -webkit-tap-highlight-color: transparent;
}

.nav-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.auth-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background-color: #4CAF50;
  border-radius: 50%;
  border: 2px solid #e0e0e0;
}

.add-button {
  width: 56px;
  height: 56px;
  background-color: transparent;
  border: none;
  box-shadow: none;
}

.add-button:hover {
  background-color: transparent;
  transform: scale(1.1);
}

/* Dark mode overrides */
body.dark-mode .history-button {
  background: #2d3748;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

body.dark-mode .history-button:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

/* Error Notification */
.error-notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 90%;
  width: 500px;
  background-color: #ff5252;
  color: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }

  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.error-header {
  display: flex;
  align-items: center;
  padding: 16px;
  gap: 12px;
}

.error-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.error-title {
  flex: 1;
  font-weight: 600;
  font-size: 16px;
}

.error-close {
  background: none;
  border: none;
  color: white;
  font-size: 32px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.error-close:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.error-details {
  background-color: rgba(0, 0, 0, 0.2);
  padding: 12px 16px;
  border-radius: 0 0 12px 12px;
  max-height: 300px;
  overflow-y: auto;
}

.error-details pre {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.pt-8 {
  padding-top: 1.5rem;
}

@media (min-width: 601px) {
  .bottom-nav {
    left: 50%;
    transform: translateX(-50%);
  }
}
</style>
