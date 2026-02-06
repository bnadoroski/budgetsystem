<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed, onErrorCaptured } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { App as CapacitorApp } from '@capacitor/app'
import NotificationPlugin from '@/plugins/NotificationPlugin'
import BudgetBar from '@/components/BudgetBar.vue'
import BudgetGroup from '@/components/BudgetGroup.vue'
import AggregatedBudgetBar from '@/components/AggregatedBudgetBar.vue'
import AddBudgetModal from '@/components/AddBudgetModal.vue'
import AuthModal from '@/components/AuthModal.vue'
import SettingsModal from '@/components/SettingsModal.vue'
import GroupsModal from '@/components/GroupsModal.vue'
import ShareBudgetModal from '@/components/ShareBudgetModal.vue'
import HistoryModal from '@/components/HistoryModal.vue'
import FinancialAnalysisModal from '@/components/FinancialAnalysisModal.vue'
import PendingExpensesModal from '@/components/PendingExpensesModal.vue'
import DebugPanel from '@/components/DebugPanel.vue'
import DailyBudgetCard from '@/components/DailyBudgetCard.vue'
import PermissionModal from '@/components/PermissionModal.vue'
import EmptyPendingModal from '@/components/EmptyPendingModal.vue'
import ProfileModal from '@/components/ProfileModal.vue'
import ShareInviteModal from '@/components/ShareInviteModal.vue'
import InviteResponseModal from '@/components/InviteResponseModal.vue'
import ConfirmResetModal from '@/components/ConfirmResetModal.vue'
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal.vue'
import TransactionsModal from '@/components/TransactionsModal.vue'
import ToastNotification from '@/components/ToastNotification.vue'
import WelcomeScreen from '@/components/WelcomeScreen.vue'
import TermsOfServiceModal from '@/components/TermsOfServiceModal.vue'
import PremiumUpgradeModal from '@/components/PremiumUpgradeModal.vue'
import ReferralModal from '@/components/ReferralModal.vue'
import SupportModal from '@/components/SupportModal.vue'
import LogViewerModal from '@/components/LogViewerModal.vue'
import { useToast } from '@/composables/useToast'
import { useModals } from '@/composables/useModals'
import { usePullToRefresh } from '@/composables/usePullToRefresh'
import { initFCM, checkPushPermission, requestPushPermission } from '@/plugins/FCMPlugin'
import { useLogger } from '@/services/LoggerService'

const budgetStore = useBudgetStore()
const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()
const logger = useLogger()
const { toasts } = useToast()

// Gerenciamento centralizado de modais
const { modals, open: openModal, close: closeModal, closeTopModal } = useModals()

// Pull-to-refresh
const { isPulling, pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
  onRefresh: async () => {
    logger.info('Pull to refresh triggered', 'App')
    if (authStore.userId) {
      await budgetStore.loadBudgets(authStore.userId)
      await budgetStore.loadGroups(authStore.userId)
    }
  }
})

// Error handling state
const errorMessage = ref<string | null>(null)
const errorDetails = ref<string | null>(null)

// Global error handler
const handleError = (error: Error, context: string) => {
  console.error(`❌ Erro em ${context}:`, error)
  logger.error(`Erro em ${context}`, 'App.handleError', {
    errorMessage: error.message,
    errorName: error.name,
    stack: error.stack
  }, error)

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
  logger.error('Vue component error captured', 'App.onErrorCaptured', {
    info,
    componentName: instance?.$options?.name || 'unknown'
  }, error)
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
// Estado específico não gerenciado pelo useModals
const inviteResponseData = ref<{ isAccepted: boolean, email: string }>({ isAccepted: false, email: '' })
const blockedPremiumFeature = ref<'sharing' | 'autoNotifications' | null>(null)
const currentInvite = ref<any>(null)
const selectedGroupIdForNewBudget = ref<string | undefined>(undefined)
const pendingExpenseToAdd = ref<any>(null)
const debugInfo = ref('')
const editingBudgetId = ref<string | undefined>(undefined)
const editingBudgetData = ref<any>(null)
const permissionDenied = ref(false)
const resetBudgetData = ref<{ id: string, name: string, total: number, spent: number, isShared: boolean } | null>(null)
const deleteBudgetData = ref<{ id: string, name: string, total: number, spent: number, transactionCount: number } | null>(null)
const transactionsBudgetData = ref<{ id: string, name: string } | null>(null)

const pendingExpensesCount = computed(() => budgetStore.pendingExpenses.length)

// Computed para convites pendentes (não vistos ou pending status)
const pendingInvitesCount = computed(() => {
  return budgetStore.shareInvites.filter(inv =>
    inv.status === 'pending' &&
    inv.toUserEmail?.toLowerCase() === authStore.userEmail?.toLowerCase()
  ).length
})

// Handler do botão voltar do Android (agora usa useModals)
const handleBackButton = () => {
  // Tenta fechar a modal de maior prioridade
  const closed = closeTopModal()
  if (!closed) {
    // Nenhuma modal aberta - minimiza o app
    CapacitorApp.minimizeApp()
  }
}

const handleAddBudget = async (name: string, value: number, color: string, groupId?: string, shareWithPartner?: boolean) => {
  await budgetStore.addBudget(name, value, color, groupId, shareWithPartner)
  const { success } = useToast()
  success(`Budget "${name}" criado com sucesso!`)

  // Se há uma despesa pendente aguardando, adiciona ao budget recém-criado
  if (pendingExpenseToAdd.value) {
    const newBudget = budgetStore.budgets.find(b => b.name === name)
    if (newBudget) {
      // Usa approvePendingExpenseWithTransaction para salvar transação e mapeamento merchant->budget
      await budgetStore.approvePendingExpenseWithTransaction(pendingExpenseToAdd.value.id, newBudget.id)
      pendingExpenseToAdd.value = null
      success('Despesa pendente adicionada!')
    }
  }

  selectedGroupIdForNewBudget.value = undefined
  editingBudgetId.value = undefined
  editingBudgetData.value = null
}

const handleUpdateBudget = async (id: string, name: string, value: number, color: string, groupId?: string) => {
  await budgetStore.updateBudget(id, {
    name,
    totalValue: value,
    color,
    groupId: groupId || undefined
  })
  const { success } = useToast()
  success(`Budget "${name}" atualizado!`)

  editingBudgetId.value = undefined
  editingBudgetData.value = null
}

const handleAddBudgetToGroup = (groupId: string) => {
  if (!authStore.isAuthenticated) {
    openModal('auth')
  } else {
    selectedGroupIdForNewBudget.value = groupId
    openModal('add')
  }
}

const handleEditBudget = (budgetId: string) => {
  const budget = budgetStore.budgets.find(b => b.id === budgetId)
  if (budget) {
    editingBudgetId.value = budget.id
    editingBudgetData.value = {
      name: budget.name,
      value: budget.totalValue,
      color: budget.color,
      groupId: budget.groupId
    }
    openModal('add')
  }
}

const handleDeleteBudget = async (budgetId: string) => {
  const budget = budgetStore.budgets.find(b => b.id === budgetId)
  if (budget) {
    // Carregar contagem de transações
    const transactions = await budgetStore.loadTransactions(budgetId)
    deleteBudgetData.value = {
      id: budget.id,
      name: budget.name,
      total: budget.totalValue,
      spent: budget.spentValue,
      transactionCount: transactions.length
    }
    openModal('confirmDelete')
  }
}

const handleDeleteConfirmed = async () => {
  if (deleteBudgetData.value) {
    const budgetName = deleteBudgetData.value.name
    logger.info('Budget delete confirmed', 'App.handleDeleteConfirmed', {
      budgetId: deleteBudgetData.value.id,
      budgetName
    })
    // Primeiro deleta todos os lançamentos
    await budgetStore.deleteAllTransactionsForBudget(deleteBudgetData.value.id)
    // Depois deleta o budget
    await budgetStore.deleteBudget(deleteBudgetData.value.id)
    closeModal('confirmDelete')
    deleteBudgetData.value = null
    const { success } = useToast()
    success(`Budget "${budgetName}" excluído!`)
  }
}

const handleConfirmReset = (budgetId: string) => {
  const budget = budgetStore.budgets.find(b => b.id === budgetId)
  if (budget) {
    // Verifica se é um budget compartilhado
    const isShared = (budget.sharedWith && budget.sharedWith.length > 0) ||
      (budget.ownerId && budget.ownerId !== authStore.userId)
    resetBudgetData.value = {
      id: budget.id,
      name: budget.name,
      total: budget.totalValue,
      spent: budget.spentValue,
      isShared: !!isShared
    }
    openModal('confirmReset')
  }
}

const handleResetConfirmed = async () => {
  if (resetBudgetData.value) {
    const budget = budgetStore.budgets.find(b => b.id === resetBudgetData.value?.id)
    if (budget) {
      logger.info('Budget reset confirmed', 'App.handleResetConfirmed', {
        budgetId: budget.id,
        budgetName: budget.name,
        previousSpent: budget.spentValue
      })
      // Salva no histórico ANTES de resetar
      await budgetStore.saveToHistory(budget)
    }
    // Processa lançamentos parcelados antes de deletar
    await budgetStore.processInstallmentsOnReset(resetBudgetData.value.id)
    // Depois reseta o valor gasto
    await budgetStore.updateBudget(resetBudgetData.value.id, { spentValue: 0 })
    closeModal('confirmReset')
    resetBudgetData.value = null
    const { success } = useToast()
    success('Budget resetado e salvo no histórico!')
  }
}

const handleViewTransactions = (budgetId: string) => {
  console.log('[APP] handleViewTransactions chamado com budgetId:', budgetId)
  const budget = budgetStore.budgets.find(b => b.id === budgetId)
  console.log('[APP] Budget encontrado:', budget)
  if (budget) {
    transactionsBudgetData.value = {
      id: budget.id,
      name: budget.name
    }
    openModal('transactions')
    console.log('[APP] modals.transactions definido como true')
  }
}

const handleAddBudgetClick = () => {
  if (!authStore.isAuthenticated) {
    openModal('auth')
  } else {
    editingBudgetId.value = undefined
    editingBudgetData.value = null
    openModal('add')
  }
}

const handleGroupsClick = () => {
  if (!authStore.isAuthenticated) {
    openModal('auth')
  } else {
    editGroupIdForModal.value = null
    deleteGroupIdForModal.value = null
    openModal('groups')
  }
}

// Handler para abrir compartilhamento com verificação de premium
const handleShareClick = () => {
  if (!authStore.isAuthenticated) {
    openModal('auth')
    return
  }

  // Verifica se tem permissão para compartilhar
  if (!subscriptionStore.canShare) {
    blockedPremiumFeature.value = 'sharing'
    openModal('premium')
    return
  }

  openModal('share')
}

// Handler para verificar se pode usar notificações automáticas
const checkAutoNotificationsPermission = (): boolean => {
  if (!subscriptionStore.canUseAutoNotifications) {
    blockedPremiumFeature.value = 'autoNotifications'
    openModal('premium')
    return false
  }
  return true
}

// Handlers para editar/deletar grupo via long-press
const editGroupIdForModal = ref<string | null>(null)
const deleteGroupIdForModal = ref<string | null>(null)

const handleEditGroup = (groupId: string) => {
  editGroupIdForModal.value = groupId
  deleteGroupIdForModal.value = null
  openModal('groups')
}

const handleDeleteGroup = (groupId: string) => {
  deleteGroupIdForModal.value = groupId
  editGroupIdForModal.value = null
  openModal('groups')
}

const ungroupedBudgets = computed(() => {
  // Filtra budgets não agrupados e não ocultos pelo usuário atual
  return budgetStore.budgets.filter(b => {
    if (b.groupId) return false
    const hiddenBy = b.hiddenBy || []
    return !hiddenBy.includes(authStore.userId || '')
  })
})

// Agrupa budgets com mesmo nome
const aggregatedUngroupedBudgets = computed(() => {
  const budgets = ungroupedBudgets.value
  const grouped = new Map<string, any[]>()

  budgets.forEach(budget => {
    const key = budget.name
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(budget)
  })

  const result: any[] = []

  grouped.forEach((budgetGroup, name) => {
    if (budgetGroup.length === 1) {
      // Budget único, não agregado
      result.push({ type: 'single', budget: budgetGroup[0] })
    } else {
      // Budgets agregados (mesmo nome)
      const totalValue = budgetGroup.reduce((sum, b) => sum + b.totalValue, 0)
      const spentValue = budgetGroup.reduce((sum, b) => sum + b.spentValue, 0)
      result.push({
        type: 'aggregated',
        aggregated: {
          name,
          budgets: budgetGroup,
          totalValue,
          spentValue,
          color: budgetGroup[0].color,
          groupId: budgetGroup[0].groupId
        }
      })
    }
  })

  return result
})

// Handler para abrir modal de login da WelcomeScreen
const handleWelcomeLogin = () => {
  console.log('🔐 handleWelcomeLogin called, opening AuthModal')
  openModal('auth')
}

// Handler para quando login Google requer aceite de termos
const handleGoogleRequireTerms = () => {
  console.log('📋 Google login requer aceite de termos')
  closeModal('auth')
  openModal('terms')
}

const handleProfileClick = () => {
  if (authStore.isAuthenticated) {
    openModal('profile')
  } else {
    openModal('auth')
  }
}

const handleProfileLogout = () => {
  closeModal('profile')
  authStore.signOut()
}

const handleReviewInvite = (invite: any) => {
  closeModal('profile')
  currentInvite.value = invite
  openModal('shareInvite')
}

// Drag & Drop handlers para área sem grupo
const isUngroupedAreaDragOver = ref(false)
const ungroupedDragCounter = ref(0)

// Auto-scroll durante drag
let scrollInterval: number | null = null
const SCROLL_ZONE = 80 // pixels da borda para ativar scroll
const SCROLL_SPEED = 10 // pixels por frame

const startAutoScroll = (direction: 'up' | 'down') => {
  if (scrollInterval) return
  scrollInterval = window.setInterval(() => {
    window.scrollBy(0, direction === 'up' ? -SCROLL_SPEED : SCROLL_SPEED)
  }, 16) // ~60fps
}

const stopAutoScroll = () => {
  if (scrollInterval) {
    clearInterval(scrollInterval)
    scrollInterval = null
  }
}

const checkAutoScroll = (clientY: number) => {
  const viewportHeight = window.innerHeight
  if (clientY < SCROLL_ZONE) {
    startAutoScroll('up')
  } else if (clientY > viewportHeight - SCROLL_ZONE) {
    startAutoScroll('down')
  } else {
    stopAutoScroll()
  }
}

const handleUngroupedDragOver = (event: DragEvent) => {
  event.preventDefault()
  isUngroupedAreaDragOver.value = true
  // Auto-scroll durante drag
  if (event.clientY) {
    checkAutoScroll(event.clientY)
  }
}

const handleUngroupedDragEnter = (event: DragEvent) => {
  event.preventDefault()
  ungroupedDragCounter.value++
  isUngroupedAreaDragOver.value = true
}

const handleUngroupedDragLeave = () => {
  ungroupedDragCounter.value--
  if (ungroupedDragCounter.value === 0) {
    isUngroupedAreaDragOver.value = false
    stopAutoScroll()
  }
}

const handleUngroupedDrop = async (event: DragEvent) => {
  event.preventDefault()
  ungroupedDragCounter.value = 0
  isUngroupedAreaDragOver.value = false
  stopAutoScroll()

  let budgetId = event.dataTransfer?.getData('budgetId')
  if (!budgetId) {
    budgetId = event.dataTransfer?.getData('text/plain')
  }

  console.log('🎯 Drop na área sem grupo - budgetId:', budgetId)

  if (budgetId) {
    try {
      // Move para "sem grupo" (groupId = undefined)
      await budgetStore.moveBudgetToGroup(budgetId, undefined)
      console.log('✅ Budget removido do grupo com sucesso')
    } catch (error) {
      console.error('❌ Erro ao remover budget do grupo:', error)
    }
  }
}

const handlePendingExpensesClick = async () => {
  // Verifica se tem permissão
  const permissionResult = await NotificationPlugin.checkPermission()

  if (!permissionResult.hasPermission) {
    // Não tem permissão - solicita
    openModal('permission')
    return
  }

  // Tem permissão - verifica se há despesas
  if (pendingExpensesCount.value > 0) {
    openModal('pendingExpenses')
  } else {
    // Mostra modal bonita de que não há despesas
    openModal('emptyPending')
  }
}

const handleHistoryClick = () => {
  openModal('history')
}

const handlePermissionAllow = async () => {
  closeModal('permission')
  await NotificationPlugin.requestPermission()
  permissionDenied.value = false

  // Após conceder permissão de notificação, verifica otimização de bateria
  // Isso é importante para o serviço funcionar em background
  setTimeout(async () => {
    try {
      const batteryResult = await NotificationPlugin.checkBatteryOptimization()
      if (!batteryResult.isIgnoring) {
        // Solicita para ignorar otimização de bateria
        await NotificationPlugin.requestIgnoreBatteryOptimization()
      }
    } catch (error) {
      console.log('Verificação de bateria não disponível (provavelmente web)')
    }
  }, 2000) // Aguarda 2 segundos para o usuário processar a primeira permissão
}

const handlePermissionCancel = () => {
  closeModal('permission')
  permissionDenied.value = true
}

const handleOpenAddBudgetFromPending = (expense: any) => {
  pendingExpenseToAdd.value = expense
  closeModal('pendingExpenses')
  openModal('add')
}

const handleAcceptInvite = async (inviteId: string) => {
  console.log('🎯 handleAcceptInvite chamado com inviteId:', inviteId)
  try {
    await budgetStore.acceptShareInvite(inviteId)
    console.log('✅ Convite aceito com sucesso')
    const { success } = useToast()
    success('Convite aceito! Budget compartilhado com você.')
    closeModal('shareInvite')
    currentInvite.value = null
  } catch (error: any) {
    console.error('❌ Erro ao aceitar convite:', error)
    const { error: showError } = useToast()
    showError('Erro ao aceitar convite. Tente novamente.')
    handleError(error, 'aceitar convite')
  }
}

const handleRejectInvite = async (inviteId: string) => {
  try {
    await budgetStore.rejectShareInvite(inviteId)
    const { info } = useToast()
    info('Convite recusado.')
    closeModal('shareInvite')
    currentInvite.value = null
  } catch (error: any) {
    const { error: showError } = useToast()
    showError('Erro ao recusar convite.')
    handleError(error, 'recusar convite')
  }
}

// Watch para novos convites e respostas de convites
watch(() => budgetStore.shareInvites, (newInvites) => {
  // 1. Verificar se tem convite que EU ENVIEI e foi respondido (sem notificação ao remetente)
  const respondedInvite = newInvites.find(inv =>
    inv.fromUserId === authStore.userId &&
    (inv.status === 'accepted' || inv.status === 'rejected') &&
    !inv.senderNotifiedAt
  )

  if (respondedInvite && !modals.inviteResponse) {
    const { success, error: showError } = useToast()

    // Mostrar toast imediato
    if (respondedInvite.status === 'accepted') {
      success(`${respondedInvite.toUserEmail} aceitou seu convite! 🎉`)
    } else {
      showError(`${respondedInvite.toUserEmail} recusou seu convite.`)
    }

    // Mostrar modal de resposta
    inviteResponseData.value = {
      isAccepted: respondedInvite.status === 'accepted',
      email: respondedInvite.toUserEmail
    }
    openModal('inviteResponse')
    // Marcar como notificado
    budgetStore.markInviteSenderNotified(respondedInvite.id)
  }

  // 2. Verificar se tem convite não visto E modal não está aberta (evita duplicação)
  if (!modals.shareInvite && !modals.inviteResponse) {
    const unviewedInvite = newInvites.find(inv =>
      !inv.viewedAt &&
      inv.status === 'pending' &&
      inv.toUserEmail.toLowerCase() === authStore.userEmail?.toLowerCase()
    )
    if (unviewedInvite) {
      const { info } = useToast()
      info(`Você recebeu um convite de ${unviewedInvite.fromUserEmail}! 📬`)

      currentInvite.value = unviewedInvite
      openModal('shareInvite')
      // Marcar como visto
      budgetStore.markInviteAsViewed(unviewedInvite.id)
    }
  }
}, { deep: true })

// Quando o usuário faz login/logout
watch(() => authStore.user, async (newUser, oldUser) => {
  try {
    if (newUser && !oldUser) {
      logger.info('User logged in', 'App.authWatch', {
        userId: newUser.uid,
        email: newUser.email
      })
      // Atualiza o logger com informações do usuário
      logger.setUser(newUser.uid, newUser.email || null)

      // Limpa dados antigos antes de carregar novos
      budgetStore.clearLocalData()

      // Para listeners antigos antes de iniciar novos
      budgetStore.stopBudgetsListener()
      budgetStore.stopGroupsListener()

      // await budgetStore.migrateBudgetsToFirestore(newUser.uid)
      await budgetStore.loadBudgets(newUser.uid)
      await budgetStore.loadGroups(newUser.uid)
      await budgetStore.startSharedBudgetsListener(newUser.uid)

      // Iniciar listener de convites (enviados e recebidos)
      if (newUser.email) {
        budgetStore.startInvitesListener(newUser.email, newUser.uid)
      }
    } else if (!newUser && oldUser) {
      // Usuário fez logout
      logger.info('User logged out', 'App.authWatch', {
        previousUserId: oldUser.uid
      })
      logger.setUser(null, null)

      budgetStore.stopBudgetsListener()
      budgetStore.stopGroupsListener()
      budgetStore.stopInvitesListener()
      budgetStore.clearLocalData()
    }
  } catch (error) {
    handleError(error as Error, 'autenticação')
  }
})

// Carrega budgets do usuário autenticado na inicialização
onMounted(async () => {
  logger.info('App mounted', 'App.onMounted', {
    hasUser: !!authStore.user,
    userId: authStore.user?.uid
  })

  // Verifica se é retorno do Stripe (pagamento)
  const urlParams = new URLSearchParams(window.location.search)
  const paymentStatus = urlParams.get('payment')

  if (paymentStatus) {
    logger.info('Payment return detected', 'App.onMounted', { paymentStatus })

    // Remove o parâmetro da URL para não reprocessar
    const cleanUrl = window.location.pathname
    window.history.replaceState({}, document.title, cleanUrl)

    if (paymentStatus === 'success') {
      // Aguarda um pouco para o webhook do Stripe processar
      console.log('✅ Pagamento realizado! Aguardando confirmação...')
      const { success: showSuccess } = useToast()
      showSuccess('Pagamento realizado! Verificando sua assinatura...')

      // Faz polling para verificar status premium
      let attempts = 0
      const maxAttempts = 10
      const checkInterval = 2000 // 2 segundos

      const checkPremiumStatus = async () => {
        attempts++
        await subscriptionStore.loadSubscription()

        if (subscriptionStore.isPremium) {
          console.log('🎉 Status premium confirmado!')
          showSuccess('🎉 Bem-vindo ao Premium! Todas as funcionalidades estão liberadas.')
          return true
        }

        if (attempts < maxAttempts) {
          console.log(`⏳ Verificando status premium... (${attempts}/${maxAttempts})`)
          setTimeout(checkPremiumStatus, checkInterval)
        } else {
          console.log('⚠️ Timeout ao verificar status premium')
          showSuccess('Pagamento processado! Se não aparecer como premium, faça logout e login novamente.')
        }
        return false
      }

      // Inicia verificação após 2 segundos
      setTimeout(checkPremiumStatus, checkInterval)
    } else if (paymentStatus === 'canceled') {
      const { warning } = useToast()
      warning('Pagamento cancelado')
    }
  }

  try {
    // authStore já monitora automaticamente o estado com onAuthStateChanged
    if (authStore.user) {
      logger.setUser(authStore.user.uid, authStore.user.email || null)
      await budgetStore.loadBudgets(authStore.user.uid)
      await budgetStore.loadGroups(authStore.user.uid)
      await budgetStore.startSharedBudgetsListener(authStore.user.uid)

      // Carrega dados de subscription/premium
      await subscriptionStore.loadSubscription()

      // Verifica se precisa aceitar os termos de uso
      if (subscriptionStore.needsTermsAcceptance) {
        openModal('terms')
      }

      // Atualiza lastActiveAt para controle de inatividade
      await authStore.updateLastActive()

      // Initialize FCM
      try {
        await initFCM()
        logger.info('FCM initialized', 'App.onMounted')
      } catch (error) {
        logger.warn('FCM initialization failed', 'App.onMounted', undefined, error as Error)
      }

      // Verifica se é primeira instalação para push notifications
      const hasAskedPushPermission = localStorage.getItem('hasAskedPushPermission')
      const pushPermissionDenied = localStorage.getItem('pushPermissionDenied')

      if (!hasAskedPushPermission && pushPermissionDenied !== 'true') {
        // Primeira vez - solicita permissão de push
        console.log('📱 Primeira instalação - solicitando permissão de push...')
        localStorage.setItem('hasAskedPushPermission', 'true')

        setTimeout(async () => {
          try {
            const result = await requestPushPermission()
            if (result.granted) {
              console.log('✅ Permissão de push concedida!')
              localStorage.setItem('notificationsEnabled', 'true')
              localStorage.setItem('pushPermissionDenied', 'false')
            } else {
              console.log('❌ Permissão de push negada pelo usuário')
              localStorage.setItem('notificationsEnabled', 'false')
              localStorage.setItem('pushPermissionDenied', 'true')
            }
          } catch (error) {
            console.error('Erro ao solicitar permissão de push:', error)
          }
        }, 2000) // Delay para não sobrecarregar o usuário
      }
    }

    // Registra listener do botão voltar do Android
    CapacitorApp.addListener('backButton', handleBackButton)

    // Listener para quando app volta do background - atualiza lastActiveAt
    CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      if (isActive && authStore.isAuthenticated) {
        console.log('📱 App voltou ao primeiro plano - atualizando lastActiveAt')
        await authStore.updateLastActive()
      }
    })

    // Verifica se tem permissão
    const permissionResult = await NotificationPlugin.checkPermission()

    if (!permissionResult.hasPermission) {
      console.warn('⚠️ Permissão de notificação não habilitada!')
      // Mostra modal bonita depois de um pequeno delay
      setTimeout(() => {
        openModal('permission')
      }, 1000)
    }

    await NotificationPlugin.addListener('bankExpense', (expense) => {
      console.log('💰 ===== NOTIFICAÇÃO BANCÁRIA RECEBIDA =====')
      console.log('🏦 Banco:', expense.bank)
      console.log('💵 Valor: R$', expense.amount)
      console.log('📝 Descrição:', expense.description)
      console.log('🏷️ Categoria:', expense.category)
      console.log('🕐 Timestamp:', new Date(expense.timestamp).toLocaleString())
      console.log('==========================================')

      // Verifica se usuário tem permissão premium para captura automática
      if (!subscriptionStore.canUseAutoNotifications) {
        console.log('⚠️ Usuário não tem permissão premium para captura automática')
        // Não processa a notificação, mas mostra modal de upgrade
        blockedPremiumFeature.value = 'autoNotifications'
        openModal('premium')
        return
      }

      // Adiciona a despesa pendente para aprovação
      budgetStore.addPendingExpense({
        amount: expense.amount,
        bank: expense.bank,
        description: expense.description,
        category: expense.category,
        timestamp: expense.timestamp
      })

      // Abre modal automaticamente se houver despesas pendentes
      if (budgetStore.pendingExpenses.length > 0) {
        openModal('pendingExpenses')
      }
    })

    // Listener para verificação de email
    await NotificationPlugin.addListener('emailVerification', async () => {
      console.log('📧 ===== NOTIFICAÇÃO DE VERIFICAÇÃO DE EMAIL =====')

      // Tenta verificar automaticamente se o email foi verificado
      if (authStore.isAuthenticated && !authStore.isEmailVerified) {
        console.log('🔄 Verificando status do email...')
        const result = await authStore.checkEmailVerification()
        if (result.verified) {
          console.log('✅ Email verificado com sucesso!')
          // Mostra toast de sucesso
          window.dispatchEvent(new CustomEvent('show-toast', {
            detail: { message: '✓ Email verificado com sucesso!', type: 'success' }
          }))
        }
      }
    })

    // Carrega despesas pendentes que foram capturadas com o app fechado
    try {
      const pendingResult = await NotificationPlugin.loadPendingExpenses()
      console.log('📂 Despesas pendentes carregadas:', pendingResult.count)

      if (pendingResult.count > 0) {
        // Adiciona cada despesa pendente ao store
        for (const expense of pendingResult.expenses) {
          budgetStore.addPendingExpense({
            amount: expense.amount,
            bank: expense.bank,
            description: expense.description,
            category: expense.category,
            timestamp: expense.timestamp,
            merchantName: expense.merchantName,
            installmentNumber: expense.installmentNumber,
            installmentTotal: expense.installmentTotal
          })
        }

        // Limpa as despesas do SharedPreferences nativo
        await NotificationPlugin.clearPendingExpenses()
        console.log('✅ Despesas pendentes processadas e limpas!')

        // Mostra modal de despesas pendentes
        setTimeout(() => {
          openModal('pendingExpenses')
        }, 1500)
      }
    } catch (e) {
      console.log('Carregamento de despesas pendentes não disponível (web)')
    }

    // Aguarda o Firebase verificar se há usuário autenticado
    const maxWaitTime = 2000 // 2 segundos no máximo
    const startTime = Date.now()

    while (authStore.loading && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    if (authStore.user) {
      // Usuário autenticado - carrega cache primeiro, depois Firebase
      await budgetStore.loadBudgets(authStore.user.uid)
      await budgetStore.loadGroups(authStore.user.uid)
      await budgetStore.startSharedBudgetsListener(authStore.user.uid)
    } else if (authStore.isOffline && authStore.hasCachedUser) {
      // Offline mas tem dados em cache - carrega do cache sem forçar login
      console.log('📵 Modo offline - carregando dados do cache')
      debugInfo.value = '📵 Modo offline'
      // Os dados já estão no localStorage e serão carregados automaticamente pelo store
    } else {
      // Não está autenticado e está online - limpa dados locais e grupos fantasmas
      // IMPORTANTE: NÃO limpa pendingExpenses - elas devem sobreviver ao logout
      // pois são capturadas pelo NotificationListener mesmo com app fechado
      localStorage.removeItem('budgets')
      localStorage.removeItem('budgetGroups')
      // localStorage.removeItem('pendingExpenses') - REMOVIDO para manter despesas
      budgetStore.clearLocalData() // Limpa grupos em memória também (mas não pendingExpenses)
      authStore.clearCachedUser() // Limpa cache de usuário ao forçar logout

      // Abre modal de login automaticamente
      setTimeout(() => {
        openModal('auth')
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
  stopAutoScroll()
})
</script>

<template>
  <!-- Tela de Boas-vindas quando não logado (e online sem cache) -->
  <WelcomeScreen
    v-if="!authStore.isAuthenticated && !authStore.loading && !(authStore.isOffline && authStore.hasCachedUser)"
    @login="handleWelcomeLogin" />

  <div v-else class="app-container" @touchstart="pullHandlers.onTouchStart"
    @touchmove.passive="pullHandlers.onTouchMove" @touchend="pullHandlers.onTouchEnd">
    <!-- Offline Banner -->
    <div v-if="authStore.isOffline" class="offline-banner">
      <span class="offline-icon">📵</span>
      <span>Modo offline - dados do cache</span>
    </div>

    <!-- Loading State -->
    <div v-if="authStore.loading" class="loading-screen">
      <div class="loading-spinner"></div>
      <p>Carregando...</p>
    </div>

    <!-- Pull to Refresh Indicator -->
    <div class="pull-to-refresh" :style="{ transform: `translateY(${pullDistance - 60}px)` }">
      <div class="pull-spinner" :class="{ spinning: isRefreshing }">
        <svg v-if="!isRefreshing" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        <div v-else class="spinner"></div>
      </div>
    </div>

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

    <!-- Help Button (top left) -->
    <button class="help-button" @click="openModal('support')" title="Ajuda e Suporte">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    </button>

    <!-- History Button -->
    <div class="pt-8">
      <button class="history-button" @click="handleHistoryClick" title="Ver histórico">
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
        @delete-budget="handleDeleteBudget" @add-budget-to-group="handleAddBudgetToGroup"
        @confirm-reset="handleConfirmReset" @view-transactions="handleViewTransactions" @edit-group="handleEditGroup"
        @delete-group="handleDeleteGroup" />

      <!-- Ungrouped Budgets (com agregação) - Drop Zone -->
      <div class="ungrouped-drop-zone" :class="{ 'drag-over': isUngroupedAreaDragOver }"
        @dragover="handleUngroupedDragOver" @dragenter="handleUngroupedDragEnter" @dragleave="handleUngroupedDragLeave"
        @drop="handleUngroupedDrop">
        <div v-if="ungroupedBudgets.length === 0 && isUngroupedAreaDragOver" class="drop-hint">
          Solte aqui para remover do grupo
        </div>
        <template v-for="item in aggregatedUngroupedBudgets"
          :key="item.type === 'single' ? item.budget.id : item.aggregated.name">
          <BudgetBar v-if="item.type === 'single'" :budget="item.budget" @edit="() => handleEditBudget(item.budget.id)"
            @delete="() => handleDeleteBudget(item.budget.id)" @confirm-reset="() => handleConfirmReset(item.budget.id)"
            @view-transactions="() => handleViewTransactions(item.budget.id)" />
          <AggregatedBudgetBar v-else :aggregated-budget="item.aggregated" @edit="(id) => handleEditBudget(id)"
            @view-transactions="(id) => handleViewTransactions(id)" @confirm-reset="(id) => handleConfirmReset(id)" />
        </template>
      </div>
    </div>

    <!-- Daily Budget Card -->
    <DailyBudgetCard />

    <div class="bottom-nav">
      <button class="nav-button pending-btn" title="Despesas Pendentes" @click="handlePendingExpensesClick">
        <span class="badge" v-if="pendingExpensesCount > 0">{{ pendingExpensesCount }}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <g fill="none">
            <path fill="url(#SVGjugm2bKq)" d="M26.394 12.39a5 5 0 1 0-6.785-6.785a11.03 11.03 0 0 1 6.785 6.786" />
            <path fill="url(#SVGE4gBAcai)" d="M26.394 12.39a5 5 0 1 0-6.785-6.785a11.03 11.03 0 0 1 6.785 6.786" />
            <path fill="url(#SVGjp3ajd0O)" d="M12.39 5.606a11.03 11.03 0 0 0-6.784 6.785a5 5 0 1 1 6.785-6.785" />
            <path fill="url(#SVG0H4igb9F)" d="M12.39 5.606a11.03 11.03 0 0 0-6.784 6.785a5 5 0 1 1 6.785-6.785" />
            <path fill="url(#SVGjsFRTkNg)" d="m5.707 27.707l3-3l-1.414-1.414l-3 3a1 1 0 0 0 1.414 1.414" />
            <path fill="url(#SVGjsFRTkNg)" d="m27.707 26.293l-3-3l-1.414 1.414l3 3a1 1 0 1 0 1.414-1.414" />
            <path fill="url(#SVGxNFSRyGS)"
              d="M28 16c0 6.627-5.373 12-12 12S4 22.627 4 16S9.373 4 16 4s12 5.373 12 12" />
            <path fill="url(#SVGtuctPdhH)"
              d="M26 16c0 5.523-4.477 10-10 10S6 21.523 6 16S10.477 6 16 6s10 4.477 10 10" />
            <path fill="url(#SVGxkhECe8k)" fill-rule="evenodd"
              d="M15 9a1 1 0 0 1 1 1v6h4a1 1 0 1 1 0 2h-5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1" clip-rule="evenodd" />
            <defs>
              <linearGradient id="SVGjugm2bKq" x1="30.106" x2="20.77" y1="12.826" y2="5.188"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#ff6f47" />
                <stop offset="1" stop-color="#ffcd0f" />
              </linearGradient>
              <linearGradient id="SVGjp3ajd0O" x1="13.844" x2="4.507" y1="13.826" y2="6.188"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#ff6f47" />
                <stop offset="1" stop-color="#ffcd0f" />
              </linearGradient>
              <linearGradient id="SVGjsFRTkNg" x1="5" x2="5.946" y1="21.272" y2="29.551" gradientUnits="userSpaceOnUse">
                <stop stop-color="#cad2d9" />
                <stop offset="1" stop-color="#70777d" />
              </linearGradient>
              <linearGradient id="SVGxNFSRyGS" x1="8" x2="20" y1="2.667" y2="29.333" gradientUnits="userSpaceOnUse">
                <stop stop-color="#1ec8b0" />
                <stop offset="1" stop-color="#2764e7" />
              </linearGradient>
              <linearGradient id="SVGtuctPdhH" x1="9.043" x2="22.087" y1="3.826" y2="31.652"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#fdfdfd" />
                <stop offset="1" stop-color="#dedeff" />
              </linearGradient>
              <linearGradient id="SVGxkhECe8k" x1="16.8" x2="20.573" y1="10.845" y2="17.132"
                gradientUnits="userSpaceOnUse">
                <stop stop-color="#1ec8b0" />
                <stop offset="1" stop-color="#2764e7" />
              </linearGradient>
              <radialGradient id="SVGE4gBAcai" cx="0" cy="0" r="1"
                gradientTransform="rotate(-45 27.718 -12.973)scale(14.7078)" gradientUnits="userSpaceOnUse">
                <stop offset=".644" stop-color="#ff6f47" />
                <stop offset=".942" stop-color="#ff6f47" stop-opacity="0" />
              </radialGradient>
              <radialGradient id="SVG0H4igb9F" cx="0" cy="0" r="1"
                gradientTransform="rotate(225 11.88 4.92)scale(14.7078)" gradientUnits="userSpaceOnUse">
                <stop offset=".659" stop-color="#ff6f47" />
                <stop offset=".949" stop-color="#ff6f47" stop-opacity="0" />
              </radialGradient>
            </defs>
          </g>
        </svg>
      </button>

      <button class="nav-button" title="Grupos" @click="handleGroupsClick">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32">
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

      <button class="nav-button add-button" @click="handleAddBudgetClick" title="Adicionar Budget">
        <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 32 32">
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

      <button class="nav-button" title="Configurações" @click="openModal('settings')">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
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

      <button class="nav-button" title="Perfil" @click="handleProfileClick">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32">
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
        <span v-if="pendingInvitesCount > 0" class="invite-badge">{{ pendingInvitesCount }}</span>
      </button>
    </div>

    <AddBudgetModal :show="modals.add" :preselected-group-id="selectedGroupIdForNewBudget"
      :edit-budget-id="editingBudgetId" :edit-budget-name="editingBudgetData?.name"
      :edit-budget-value="editingBudgetData?.value" :edit-budget-color="editingBudgetData?.color"
      :edit-budget-group-id="editingBudgetData?.groupId"
      @close="closeModal('add'); selectedGroupIdForNewBudget = undefined; editingBudgetId = undefined; editingBudgetData = null"
      @submit="handleAddBudget" @update="handleUpdateBudget" />
    <SettingsModal :show="modals.settings" @close="closeModal('settings')"
      @confirm-reset="(budgetId) => handleConfirmReset(budgetId)"
      @view-transactions="(budgetId) => handleViewTransactions(budgetId)" />
    <GroupsModal :show="modals.groups" :edit-group-id="editGroupIdForModal" :delete-group-id="deleteGroupIdForModal"
      @close="closeModal('groups'); editGroupIdForModal = null; deleteGroupIdForModal = null" />
    <ShareBudgetModal :show="modals.share" @close="closeModal('share')" />
    <HistoryModal :show="modals.history" @close="closeModal('history')"
      @open-analysis="closeModal('history'); openModal('analysis')" />
    <FinancialAnalysisModal :show="modals.analysis" @close="closeModal('analysis')"
      @upgrade="closeModal('analysis'); openModal('premium')" />
    <PendingExpensesModal :show="modals.pendingExpenses" @close="closeModal('pendingExpenses')"
      @open-add-budget="handleOpenAddBudgetFromPending"
      @require-premium="() => { closeModal('pendingExpenses'); blockedPremiumFeature = 'autoNotifications'; openModal('premium') }" />
    <DebugPanel :show="modals.debug" @close="closeModal('debug')" />
    <PermissionModal :show="modals.permission" @allow="handlePermissionAllow" @cancel="handlePermissionCancel"
      @close="handlePermissionCancel" />
    <EmptyPendingModal :show="modals.emptyPending" @close="closeModal('emptyPending')" />
    <ProfileModal :show="modals.profile" :email="authStore.user?.email || ''" @close="closeModal('profile')"
      @logout="handleProfileLogout" @review-invite="handleReviewInvite"
      @require-premium="(feature) => { blockedPremiumFeature = feature; openModal('premium') }"
      @show-premium-modal="openModal('premium')" @show-referral-modal="openModal('referral')"
      @show-terms-modal="openModal('terms')" />
    <ShareInviteModal :show="modals.shareInvite" :invite="currentInvite" @accept="handleAcceptInvite"
      @reject="handleRejectInvite" @close="closeModal('shareInvite')" />
    <InviteResponseModal :show="modals.inviteResponse" :isAccepted="inviteResponseData.isAccepted"
      :email="inviteResponseData.email" @close="closeModal('inviteResponse')" />
    <ConfirmResetModal v-if="resetBudgetData" :show="modals.confirmReset" :budget-name="resetBudgetData.name"
      :budget-total="resetBudgetData.total" :budget-spent="resetBudgetData.spent" :is-shared="resetBudgetData.isShared"
      @close="closeModal('confirmReset'); resetBudgetData = null" @confirm="handleResetConfirmed" />
    <ConfirmDeleteModal v-if="deleteBudgetData" :show="modals.confirmDelete" :budget-name="deleteBudgetData.name"
      :budget-total="deleteBudgetData.total" :budget-spent="deleteBudgetData.spent"
      :transaction-count="deleteBudgetData.transactionCount"
      @close="closeModal('confirmDelete'); deleteBudgetData = null" @confirm="handleDeleteConfirmed" />
    <TransactionsModal v-if="transactionsBudgetData" :show="modals.transactions" :budget-id="transactionsBudgetData.id"
      :budget-name="transactionsBudgetData.name" @close="closeModal('transactions'); transactionsBudgetData = null" />

    <!-- Premium/SaaS Modals -->
    <TermsOfServiceModal :show="modals.terms" @close="closeModal('terms')" @accepted="closeModal('terms')" />
    <PremiumUpgradeModal :show="modals.premium" :blocked-feature="blockedPremiumFeature"
      @close="closeModal('premium'); blockedPremiumFeature = null" @upgraded="closeModal('premium')"
      @show-referral="closeModal('premium'); openModal('referral')" />
    <ReferralModal :show="modals.referral" @close="closeModal('referral')" />
    <SupportModal :show="modals.support" @close="closeModal('support')"
      @show-logs="closeModal('support'); openModal('logs')" @show-terms="closeModal('support'); openModal('terms')" />
    <LogViewerModal :show="modals.logs" @close="closeModal('logs')" />

    <!-- Toast Notifications -->
    <ToastNotification v-for="toast in toasts" :key="toast.id" :message="toast.message" :type="toast.type"
      :duration="toast.duration" :show="true" @close="() => { }" />
  </div>

  <!-- AuthModal fora do v-else para funcionar na WelcomeScreen -->
  <AuthModal :show="modals.auth" :persist="!authStore.isAuthenticated" @close="closeModal('auth')"
    @require-terms="handleGoogleRequireTerms" />
</template>

<style scoped>
.app-container {
  max-width: 600px;
  margin: 0 auto;
  min-height: 100dvh;
  background-color: #f5f5f5;
  position: relative;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
  padding-top: env(safe-area-inset-top);
  overflow-y: auto;
}

/* Offline Banner */
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: linear-gradient(135deg, #ff9800, #f57c00);
  color: white;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.offline-icon {
  font-size: 16px;
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

/* Pull to Refresh Styles */
.pull-to-refresh {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  z-index: 1000;
  transition: transform 0.1s ease-out;
  pointer-events: none;
}

.pull-spinner {
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
  color: #4CAF50;
  transition: transform 0.2s;
}

.pull-spinner.spinning {
  animation: none;
}

.pull-spinner svg {
  transition: transform 0.3s;
}

.pull-spinner:not(.spinning) svg {
  transform: rotate(0deg);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e0e0e0;
  border-top-color: #4CAF50;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.budget-list {
  padding: 20px;
  position: relative;
  z-index: 1;
  padding-bottom: 160px;
  overflow-y: auto;
  max-height: calc(100dvh - env(safe-area-inset-top) - 80px);
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

.ungrouped-drop-zone {
  min-height: 60px;
  border-radius: 12px;
  transition: all 0.3s ease;
  padding: 10px;
  margin-top: 10px;
}

.ungrouped-drop-zone.drag-over {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.15), rgba(16, 185, 129, 0.15));
  border: 2px dashed rgba(16, 185, 129, 0.5);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.drop-hint {
  text-align: center;
  padding: 20px;
  color: #10b981;
  font-weight: 500;
  font-size: 14px;
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

.help-button {
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
  color: #6366f1;
}

.help-button:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  color: #4f46e5;
}

.help-button:active {
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
  height: auto;
  padding: 10px 0;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  background-color: #e0e0e0;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  max-width: 600px;
  margin: 0 auto;
  z-index: 100;
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

.invite-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  min-width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
  border-radius: 10px;
  color: white;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 5px;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  animation: pulse-invite 2s ease-in-out infinite;
}

@keyframes pulse-invite {

  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  50% {
    transform: scale(1.1);
    box-shadow: 0 2px 8px rgba(255, 107, 107, 0.5);
  }
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

.pending-btn {
  position: relative;
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #E91E63;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: bold;
  min-width: 18px;
  text-align: center;
  animation: pulse 2s infinite;
}

@keyframes pulse {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.1);
  }
}

@media (min-width: 601px) {
  .bottom-nav {
    left: 50%;
    transform: translateX(-50%);
  }
}

/* Loading Screen */
.loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  z-index: 9998;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

.loading-screen p {
  font-size: 16px;
  opacity: 0.9;
}
</style>
