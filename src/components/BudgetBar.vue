<template>
    <div class="budget-bar-container" :class="{ 'is-dragging': isDragging, 'newly-shared': isNewlyShared }">
        <div class="budget-bar" @click="handleClick">
            <div class="budget-label" :class="{ 'overbudget': percentage >= 100 }" draggable="true"
                @dragstart="handleDragStart" @dragend="handleDragEnd" @touchstart.stop @touchmove.stop @touchend.stop>{{
                    budget.name }}</div>
            <div class="budget-progress" @touchstart="longPress.onTouchStart" @touchend="longPress.onTouchEnd"
                @touchmove="longPress.onTouchMove">
                <div class="budget-fill" :style="{
                    width: `${percentage}%`,
                    background: `linear-gradient(to right, ${darkenColor(budget.color)}, ${budget.color})`
                }">
                    <span v-if="displayMode === 'values'" class="budget-value-inside">
                        {{ formatCurrency(budget.spentValue) }}
                    </span>
                </div>
                <div class="budget-value-outside">
                    {{ displayMode === 'percentage' ? `${percentage}%` : formatCurrency(budget.totalValue) }}
                </div>
            </div>
        </div>

        <!-- Menu de contexto usando Teleport para escapar do stacking context -->
        <Teleport to="body">
            <Transition name="context-menu">
                <div v-if="showContextMenu" class="context-menu" @click.stop>
                    <button class="context-btn edit" @click="handleEdit">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Editar
                    </button>
                    <button class="context-btn transactions" @click="handleViewTransactions">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                        Ver Lançamentos
                    </button>
                    <button class="context-btn reset" @click="handleReset">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                        </svg>
                        Resetar
                    </button>
                    <button class="context-btn delete" @click="handleDelete">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2">
                            </path>
                        </svg>
                        Excluir
                    </button>
                    <button class="context-btn cancel" @click="showContextMenu = false">Cancelar</button>
                </div>
            </Transition>

            <!-- Overlay -->
            <div v-if="showContextMenu" class="overlay" @click="showContextMenu = false"></div>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Budget, DisplayMode } from '@/types/budget'
import { useBudgetStore } from '@/stores/budget'
import { useLongPress } from '@/composables/useLongPress'

const props = defineProps<{
    budget: Budget
}>()

const emit = defineEmits<{
    edit: []
    delete: []
    viewTransactions: []
    confirmReset: []
}>()

const budgetStore = useBudgetStore()
const displayMode = ref<DisplayMode>('percentage')
const showContextMenu = ref(false)
const isDragging = ref(false)

const longPress = useLongPress(() => {
    showContextMenu.value = true
}, 500)

const percentage = computed(() => budgetStore.percentage(props.budget))
const isNewlyShared = computed(() => budgetStore.isNewlyShared(props.budget.id))

const handleClick = () => {
    if (!longPress.isLongPress.value) {
        toggleDisplayMode()
    }
}

const toggleDisplayMode = () => {
    displayMode.value = displayMode.value === 'percentage' ? 'values' : 'percentage'
}

const handleEdit = () => {
    showContextMenu.value = false
    emit('edit')
}

const handleReset = () => {
    showContextMenu.value = false
    emit('confirmReset')
}

const handleViewTransactions = () => {
    showContextMenu.value = false
    emit('viewTransactions')
}

const handleDelete = () => {
    showContextMenu.value = false
    emit('delete')
}

const formatCurrency = (value: number) => {
    const currencyCode = budgetStore.currency || 'BRL'
    const locale = currencyCode === 'BRL' ? 'pt-BR' : currencyCode === 'EUR' ? 'de-DE' : 'en-US'
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode
    }).format(value)
}

const darkenColor = (color: string) => {
    // Remove # se existir
    const hex = color.replace('#', '')

    // Converte para RGB
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // Escurece 30%
    const factor = 0.7
    const newR = Math.floor(r * factor)
    const newG = Math.floor(g * factor)
    const newB = Math.floor(b * factor)

    // Converte de volta para hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

const handleDragStart = (event: DragEvent) => {
    isDragging.value = true
    console.log('DragStart - budgetId:', props.budget.id, 'budget:', props.budget)
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('budgetId', props.budget.id)
        event.dataTransfer.setData('text/plain', props.budget.id) // Fallback
        console.log('setData chamado com budgetId:', props.budget.id)
        // Feedback visual durante o drag
        event.dataTransfer.dropEffect = 'move'
    }
}

const handleDragEnd = () => {
    isDragging.value = false
}
</script>

<style scoped>
.budget-bar-container {
    position: relative;
    transition: opacity 0.2s, transform 0.2s;
}

.budget-bar-container.is-dragging {
    opacity: 0.5;
    transform: scale(0.98);
}

.budget-bar {
    margin: 16px 0;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.budget-label {
    font-size: 14px;
    color: #333;
    margin-bottom: 8px;
    font-weight: 500;
    background: rgba(255, 255, 255, 0.85);
    padding: 6px 12px 6px 20px;
    border-radius: 8px;
    display: inline-block;
    backdrop-filter: blur(8px);
    transition: color 0.3s ease, background-color 0.3s ease;
    cursor: grab;
    position: relative;
}

.budget-label:active {
    cursor: grabbing;
}

.budget-label::before {
    content: '⋮⋮';
    position: absolute;
    left: 4px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 10px;
    color: #999;
    letter-spacing: -2px;
}

.budget-label.overbudget {
    color: #ff3b3b;
    font-weight: 600;
}

.budget-progress {
    position: relative;
    height: 50px;
    background-color: #f0f0f0;
    border-radius: 25px;
    overflow: hidden;
    display: flex;
    align-items: center;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
}

.budget-fill {
    height: 100%;
    display: flex;
    align-items: center;
    padding-left: 16px;
    transition: all 0.3s ease;
    position: relative;
    border-radius: 25px;
}

.budget-value-inside {
    color: white;
    font-weight: 600;
    font-size: 14px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.budget-value-outside {
    position: absolute;
    right: 16px;
    color: #666;
    font-weight: 600;
    font-size: 14px;
}

/* Menu de contexto */
.context-menu {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: white;
    border-radius: 20px 20px 0 0;
    padding: 20px;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
    z-index: 1500;
    max-width: 600px;
    margin: 0 auto;
}

.context-btn {
    width: 100%;
    padding: 16px;
    margin-bottom: 12px;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s;
}

.context-btn.edit {
    background: #4CAF50;
    color: white;
}

.context-btn.transactions {
    background: #2196F3;
    color: white;
}

.context-btn.reset {
    background: #FF9800;
    color: white;
}

.context-btn.delete {
    background: #f44336;
    color: white;
}

.context-btn.cancel {
    background: #f0f0f0;
    color: #666;
}

/* Dark Mode - Context Menu */
body.dark-mode .context-menu {
    background: #1e1e2e;
}

body.dark-mode .context-btn.cancel {
    background: #2a2a3e;
    color: #aaa;
}

.context-btn:active {
    transform: scale(0.98);
}

.overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1400;
}

/* Animações */
.context-menu-enter-active,
.context-menu-leave-active {
    transition: transform 0.3s ease;
}

.context-menu-enter-from,
.context-menu-leave-to {
    transform: translateY(100%);
}

@media (max-width: 600px) {
    .budget-progress {
        height: 45px;
    }

    .budget-value-inside,
    .budget-value-outside {
        font-size: 13px;
    }
}

/* Animação de borda piscando para budgets recém-compartilhados */
.budget-bar-container.newly-shared .budget-progress {
    animation: pulse-border 1s ease-in-out infinite;
    box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.6);
}

@keyframes pulse-border {

    0%,
    100% {
        box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.6);
    }

    50% {
        box-shadow: 0 0 0 6px rgba(76, 175, 80, 0.3), 0 0 15px rgba(76, 175, 80, 0.4);
    }
}

/* Dark Mode - Text */
body.dark-mode .budget-label {
    color: #e2e8f0;
}

body.dark-mode .budget-label::before {
    color: #888;
}

body.dark-mode .budget-value-outside {
    color: #ccc;
}
</style>
