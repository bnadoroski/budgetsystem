# Guia de Refatoração do App.vue

Este documento mostra como aplicar os novos composables e componentes para reduzir o tamanho do App.vue de ~1915 linhas para ~1200 linhas.

## 1. Substituir Estado de Modais

### Antes (18+ variáveis)
```typescript
const showAddModal = ref(false)
const showAuthModal = ref(false)
const showSettingsModal = ref(false)
const showGroupsModal = ref(false)
const showShareModal = ref(false)
const showHistoryModal = ref(false)
const showPendingExpensesModal = ref(false)
const showDebugPanel = ref(false)
const showPermissionModal = ref(false)
const showEmptyPendingModal = ref(false)
const showProfileModal = ref(false)
const showShareInviteModal = ref(false)
const showInviteResponseModal = ref(false)
const showConfirmResetModal = ref(false)
const showConfirmDeleteModal = ref(false)
const showTransactionsModal = ref(false)
const showTermsModal = ref(false)
const showPremiumModal = ref(false)
const showReferralModal = ref(false)
const showSupportModal = ref(false)
```

### Depois (1 linha)
```typescript
import { useModals } from '@/composables/useModals'

const { modals, open, close, closeTopModal } = useModals()
```

### Uso no template
```vue
<!-- Antes -->
<AddBudgetModal :show="showAddModal" @close="showAddModal = false" />

<!-- Depois -->
<AddBudgetModal :show="modals.add" @close="close('add')" />
```

---

## 2. Substituir Handler do Back Button

### Antes (~60 linhas)
```typescript
const handleBackButton = () => {
  if (showTermsModal.value) { return }
  if (showPremiumModal.value) { showPremiumModal.value = false; return }
  if (showReferralModal.value) { showReferralModal.value = false; return }
  if (showSupportModal.value) { showSupportModal.value = false; return }
  if (showAddModal.value) { showAddModal.value = false; return }
  // ... mais 15 condicionais
  CapacitorApp.minimizeApp()
}

onMounted(async () => {
  CapacitorApp.addListener('backButton', handleBackButton)
})

onUnmounted(() => {
  CapacitorApp.removeAllListeners()
})
```

### Depois (4 linhas)
```typescript
import { useBackButton } from '@/composables/useBackButton'

useBackButton({
  onCloseTopModal: closeTopModal
})
```

---

## 3. Substituir Pull-to-Refresh

### Antes (~50 linhas)
```typescript
const isPulling = ref(false)
const pullDistance = ref(0)
const isRefreshing = ref(false)
const pullThreshold = 80

let startY = 0
const handleTouchStart = (e: TouchEvent) => {
  const scrollContainer = document.querySelector('.app-container')
  if (scrollContainer && scrollContainer.scrollTop === 0 && e.touches[0]) {
    startY = e.touches[0].clientY
    isPulling.value = true
  }
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isPulling.value || isRefreshing.value || !e.touches[0]) return
  const currentY = e.touches[0].clientY
  const diff = currentY - startY
  if (diff > 0) {
    pullDistance.value = Math.min(diff * 0.5, 120)
    if (pullDistance.value > 10) {
      e.preventDefault()
    }
  }
}

const handleTouchEnd = async () => {
  if (!isPulling.value) return
  if (pullDistance.value >= pullThreshold && !isRefreshing.value && authStore.userId) {
    isRefreshing.value = true
    try {
      await budgetStore.loadBudgets(authStore.userId)
      await budgetStore.loadGroups(authStore.userId)
    } finally {
      setTimeout(() => {
        isRefreshing.value = false
        pullDistance.value = 0
        isPulling.value = false
      }, 500)
    }
  } else {
    pullDistance.value = 0
    isPulling.value = false
  }
}
```

### Depois (10 linhas)
```typescript
import { usePullToRefresh } from '@/composables/usePullToRefresh'

const { isPulling, pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
  onRefresh: async () => {
    if (authStore.userId) {
      await budgetStore.loadBudgets(authStore.userId)
      await budgetStore.loadGroups(authStore.userId)
    }
  }
})
```

### Uso no template
```vue
<div 
  class="app-container" 
  @touchstart="pullHandlers.onTouchStart"
  @touchmove.passive="pullHandlers.onTouchMove"
  @touchend="pullHandlers.onTouchEnd"
>
```

---

## 4. Usar BaseModal nos Componentes

### Antes (em cada modal)
```vue
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click="$emit('close')">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h2>Título</h2>
            <button class="close-button" @click="$emit('close')">✕</button>
          </div>
          <div class="modal-body">
            <!-- conteúdo -->
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay { /* 20+ linhas de CSS */ }
.modal-content { /* 15+ linhas de CSS */ }
.modal-header { /* 10+ linhas de CSS */ }
/* ... etc */
</style>
```

### Depois
```vue
<template>
  <BaseModal :show="show" title="Título" @close="$emit('close')">
    <!-- conteúdo -->
  </BaseModal>
</template>

<script setup>
import BaseModal from '@/components/base/BaseModal.vue'
</script>

<!-- Sem CSS duplicado! -->
```

---

## 5. Exemplo Completo de App.vue Refatorado

```typescript
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { useToast } from '@/composables/useToast'
import { useModals } from '@/composables/useModals'
import { useBackButton } from '@/composables/useBackButton'
import { usePullToRefresh } from '@/composables/usePullToRefresh'

// Stores
const budgetStore = useBudgetStore()
const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()
const { toasts } = useToast()

// Modais (agora tudo em uma linha!)
const { modals, open, close, closeTopModal } = useModals()

// Back button do Android (agora em 3 linhas!)
useBackButton({
  onCloseTopModal: closeTopModal
})

// Pull-to-refresh (agora em 10 linhas!)
const { isPulling, pullDistance, isRefreshing, handlers: pullHandlers } = usePullToRefresh({
  onRefresh: async () => {
    if (authStore.userId) {
      await budgetStore.loadBudgets(authStore.userId)
      await budgetStore.loadGroups(authStore.userId)
    }
  }
})

// Resto do código mantém igual, mas usa modals.* em vez de show*Modal.value
</script>
```

---

## Resumo da Economia

| Área | Antes | Depois | Economia |
|------|-------|--------|----------|
| Variáveis de modal | 20 linhas | 1 linha | -19 linhas |
| handleBackButton | 60 linhas | 4 linhas | -56 linhas |
| Pull-to-refresh | 50 linhas | 10 linhas | -40 linhas |
| CSS de modais (10 modais) | ~500 linhas | 0 linhas | -500 linhas |

**Total estimado: ~615 linhas economizadas**

---

## Próximos Passos

1. Migrar cada modal para usar `BaseModal`
2. Substituir o estado no App.vue
3. Testar todos os fluxos
4. Remover código morto
