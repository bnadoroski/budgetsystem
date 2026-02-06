<template>
    <div class="budget-group">
        <div class="group-header" :class="{ 'header-drag-over': isHeaderDragOver }" @click="handleHeaderClick"
            @drop="handleHeaderDrop" @dragover.prevent="handleHeaderDragOver" @dragenter.prevent="handleHeaderDragEnter"
            @dragleave="handleHeaderDragLeave" @touchstart="longPress.onTouchStart" @touchend="longPress.onTouchEnd"
            @touchmove="longPress.onTouchMove">
            <div class="group-info">
                <div class="group-color" :style="{ backgroundColor: group.color }"></div>
                <div class="group-text">
                    <h3 class="group-name">{{ group.name }}</h3>
                    <span class="group-count">{{ groupBudgets.length }} budget{{ groupBudgets.length !== 1 ? 's' : ''
                    }}</span>
                </div>
            </div>
            <div class="group-actions">
                <span class="group-total">{{ formatCurrency(groupTotal) }}</span>
                <svg class="expand-icon" :class="{ expanded: group.isExpanded }" width="20" height="20"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
        </div>

        <!-- Menu de contexto do grupo -->
        <Teleport to="body">
            <Transition name="context-menu">
                <div v-if="showContextMenu" class="context-menu" @click.stop>
                    <button class="context-btn edit" @click="handleEditGroup">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Editar Grupo
                    </button>
                    <button class="context-btn delete" @click="handleDeleteGroup">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2">
                            </path>
                        </svg>
                        Excluir Grupo
                    </button>
                    <button class="context-btn cancel" @click="showContextMenu = false">Cancelar</button>
                </div>
            </Transition>
            <div v-if="showContextMenu" class="overlay" @click="showContextMenu = false"></div>
        </Teleport>

        <Transition name="expand">
            <div v-if="group.isExpanded" class="group-budgets" @drop="handleDrop" @dragover.prevent="handleDragOver"
                @dragenter.prevent="handleDragEnter" @dragleave="handleDragLeave" :class="{ 'drag-over': isDragOver }">
                <button type="button" class="add-budget-btn-inside" @click.stop="handleAddBudgetToGroup"
                    title="Adicionar budget neste grupo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Adicionar Budget
                </button>
                <BudgetBar v-for="budget in groupBudgets" :key="budget.id" :budget="budget"
                    @edit="() => emit('editBudget', budget.id)" @delete="() => emit('deleteBudget', budget.id)"
                    @confirm-reset="() => emit('confirmReset', budget.id)"
                    @view-transactions="() => emit('viewTransactions', budget.id)" />
                <div v-if="groupBudgets.length === 0" class="no-budgets">
                    <p>Nenhum budget neste grupo</p>
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useAuthStore } from '@/stores/auth'
import { useLongPress } from '@/composables/useLongPress'
import type { BudgetGroup } from '@/types/budget'
import BudgetBar from './BudgetBar.vue'

const props = defineProps<{
    group: BudgetGroup
}>()

const emit = defineEmits<{
    editBudget: [budgetId: string]
    deleteBudget: [budgetId: string]
    addBudgetToGroup: [groupId: string]
    confirmReset: [budgetId: string]
    viewTransactions: [budgetId: string]
    editGroup: [groupId: string]
    deleteGroup: [groupId: string]
}>()

const budgetStore = useBudgetStore()
const isDragOver = ref(false)
const dragCounter = ref(0)
const isHeaderDragOver = ref(false)
const headerDragCounter = ref(0)
const showContextMenu = ref(false)

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

onUnmounted(() => {
    stopAutoScroll()
})

// Long press para menu de contexto
const longPress = useLongPress(() => {
    showContextMenu.value = true
}, 500)

const handleHeaderClick = () => {
    if (!longPress.isLongPress.value) {
        budgetStore.toggleGroupExpansion(props.group.id)
    }
}

const handleEditGroup = () => {
    showContextMenu.value = false
    emit('editGroup', props.group.id)
}

const handleDeleteGroup = () => {
    showContextMenu.value = false
    emit('deleteGroup', props.group.id)
}

// Header drag handlers (para grupos fechados)
const handleHeaderDragOver = (event: DragEvent) => {
    event.preventDefault()
    isHeaderDragOver.value = true
    // Auto-scroll durante drag
    if (event.clientY) {
        checkAutoScroll(event.clientY)
    }
}

const handleHeaderDragEnter = (event: DragEvent) => {
    event.preventDefault()
    headerDragCounter.value++
    isHeaderDragOver.value = true
}

const handleHeaderDragLeave = () => {
    headerDragCounter.value--
    if (headerDragCounter.value === 0) {
        isHeaderDragOver.value = false
        stopAutoScroll()
    }
}

const handleHeaderDrop = async (event: DragEvent) => {
    event.preventDefault()
    headerDragCounter.value = 0
    isHeaderDragOver.value = false
    stopAutoScroll()

    let budgetId = event.dataTransfer?.getData('budgetId')
    if (!budgetId) {
        budgetId = event.dataTransfer?.getData('text/plain')
    }

    console.log('🎯 Drop no header do grupo - budgetId:', budgetId, 'groupId:', props.group.id)

    if (budgetId && budgetId !== props.group.id) {
        try {
            await budgetStore.moveBudgetToGroup(budgetId, props.group.id)
            console.log('✅ Budget movido para grupo via header')
        } catch (error) {
            console.error('❌ Erro ao mover budget:', error)
        }
    }
}

const handleAddBudgetToGroup = () => {
    emit('addBudgetToGroup', props.group.id)
}

const groupBudgets = computed(() => {
    // Filtra budgets não ocultos pelo usuário atual
    const authStore = useAuthStore()
    return budgetStore.budgets.filter(b => {
        // Verifica se budget é válido
        if (!b || !b.id) return false
        if (b.groupId !== props.group.id) return false
        const hiddenBy = b.hiddenBy || []
        return !hiddenBy.includes(authStore.userId || '')
    })
})

const groupTotal = computed(() => {
    return groupBudgets.value.reduce((sum, b) => sum + (b.totalValue || 0), 0)
})

const handleToggle = () => {
    budgetStore.toggleGroupExpansion(props.group.id)
}

const formatCurrency = (value: number) => {
    const currencyCode = budgetStore.currency || 'BRL'
    const locale = currencyCode === 'BRL' ? 'pt-BR' : currencyCode === 'EUR' ? 'de-DE' : 'en-US'
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode
    }).format(value)
}

const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    isDragOver.value = true
    // Auto-scroll durante drag
    if (event.clientY) {
        checkAutoScroll(event.clientY)
    }
}

const handleDragEnter = (event: DragEvent) => {
    event.preventDefault()
    dragCounter.value++
    isDragOver.value = true
}

const handleDragLeave = (event: DragEvent) => {
    dragCounter.value--
    if (dragCounter.value === 0) {
        isDragOver.value = false
        stopAutoScroll()
    }
}

const handleDrop = async (event: DragEvent) => {
    event.preventDefault()
    dragCounter.value = 0
    isDragOver.value = false
    stopAutoScroll()

    console.log('🎯 Drop event:', event)
    console.log('🎯 DataTransfer:', event.dataTransfer)
    console.log('🎯 DataTransfer types:', event.dataTransfer?.types)

    let budgetId = event.dataTransfer?.getData('budgetId')
    console.log('🎯 budgetId (custom):', budgetId)

    // Fallback para text/plain
    if (!budgetId) {
        budgetId = event.dataTransfer?.getData('text/plain')
        console.log('🎯 budgetId (text/plain fallback):', budgetId)
    }

    console.log('🎯 Drop detectado - budgetId:', budgetId, 'groupId:', props.group.id)

    if (budgetId && budgetId !== props.group.id) {
        try {
            await budgetStore.moveBudgetToGroup(budgetId, props.group.id)
            console.log('✅ Budget movido para grupo com sucesso')
        } catch (error) {
            console.error('❌ Erro ao mover budget:', error)
        }
    }
}
</script>

<style scoped>
.budget-group {
    margin: 16px 0;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.group-header {
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    user-select: none;
    cursor: pointer;
    transition: background-color 0.2s;
}

.group-header:hover {
    background-color: #f5f5f5;
}

.group-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
}

.group-color {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    flex-shrink: 0;
}

.group-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.group-name {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin: 0;
    line-height: 1.2;
}

.group-count {
    font-size: 12px;
    color: #999;
    font-weight: 400;
}

.group-actions {
    display: flex;
    align-items: center;
    gap: 12px;
}

.group-total {
    font-size: 16px;
    font-weight: 600;
    color: #666;
}

.expand-icon {
    transition: transform 0.3s;
    color: #999;
}

.expand-icon.expanded {
    transform: rotate(180deg);
}

.group-budgets {
    padding: 0 16px 16px;
    transition: all 0.3s ease;
}

.group-budgets.drag-over {
    background-color: #e8f5e9;
    border: 2px dashed #4caf50;
    border-radius: 8px;
}

.add-budget-btn-inside {
    width: calc(100% - 32px);
    margin: 8px 16px;
    padding: 12px;
    background: #E8F5E9;
    color: #2E7D32;
    border: 2px dashed #81C784;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.add-budget-btn-inside:hover {
    background: #C8E6C9;
    border-color: #66BB6A;
    color: #1B5E20;
}

.add-budget-btn-inside:active {
    transform: scale(0.98);
}

.no-budgets {
    text-align: center;
    padding: 30px;
    color: #999;
    font-size: 14px;
    border-radius: 12px;
}

.expand-enter-active,
.expand-leave-active {
    transition: all 0.3s ease;
    max-height: 1000px;
    overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
    max-height: 0;
    opacity: 0;
}

/* Dark Mode */
body.dark-mode .budget-group {
    background: #2d3748;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

body.dark-mode .group-header:hover {
    background-color: #3a4556;
}

body.dark-mode .group-name {
    color: #e2e8f0;
}

body.dark-mode .group-total {
    color: #cbd5e0;
}

/* Header drag over */
.group-header.header-drag-over {
    background-color: #e8f5e9;
    border: 2px dashed #4caf50;
}

body.dark-mode .group-header.header-drag-over {
    background-color: #1a472a;
    border-color: #4caf50;
}

/* Context Menu */
.context-menu {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border-radius: 16px;
    padding: 8px;
    min-width: 200px;
    z-index: 10001;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

body.dark-mode .context-menu {
    background: #2d3748;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.context-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 14px 16px;
    border: none;
    background: none;
    font-size: 16px;
    cursor: pointer;
    border-radius: 10px;
    color: #333;
    transition: background-color 0.2s;
}

body.dark-mode .context-btn {
    color: #e2e8f0;
}

.context-btn:hover {
    background-color: #f5f5f5;
}

body.dark-mode .context-btn:hover {
    background-color: #3a4556;
}

.context-btn.edit {
    color: #1976d2;
}

.context-btn.delete {
    color: #d32f2f;
}

.context-btn.cancel {
    color: #666;
    border-top: 1px solid #eee;
    margin-top: 8px;
    padding-top: 16px;
}

body.dark-mode .context-btn.cancel {
    color: #a0aec0;
    border-top-color: #4a5568;
}

.overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
}

/* Context menu transitions */
.context-menu-enter-active,
.context-menu-leave-active {
    transition: all 0.2s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
}
</style>
