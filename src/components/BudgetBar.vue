<template>
  <div class="budget-bar" @click="toggleDisplayMode">
    <div class="budget-label">{{ budget.name }}</div>
    <div class="budget-progress">
      <div 
        class="budget-fill" 
        :style="{ 
          width: `${percentage}%`, 
          background: `linear-gradient(to right, ${darkenColor(budget.color)}, ${budget.color})` 
        }"
      >
        <span v-if="displayMode === 'values'" class="budget-value-inside">
          {{ formatCurrency(budget.spentValue) }}
        </span>
      </div>
      <div class="budget-value-outside">
        {{ displayMode === 'percentage' ? `${percentage}%` : formatCurrency(budget.totalValue) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Budget, DisplayMode } from '@/types/budget'
import { useBudgetStore } from '@/stores/budget'

const props = defineProps<{
  budget: Budget
}>()

const budgetStore = useBudgetStore()
const displayMode = ref<DisplayMode>('percentage')

const percentage = computed(() => budgetStore.percentage(props.budget))

const toggleDisplayMode = () => {
  displayMode.value = displayMode.value === 'percentage' ? 'values' : 'percentage'
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
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
</script>

<style scoped>
.budget-bar {
  margin: 16px 0;
  cursor: pointer;
  user-select: none;
}

.budget-label {
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  font-weight: 500;
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

@media (max-width: 600px) {
  .budget-progress {
    height: 45px;
  }
  
  .budget-value-inside,
  .budget-value-outside {
    font-size: 13px;
  }
}
</style>
