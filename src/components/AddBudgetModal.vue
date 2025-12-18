<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click="close">
                <div class="modal-content" @click.stop>
                    <!-- Tabs -->
                    <div class="tabs">
                        <button type="button" class="tab" :class="{ active: activeTab === 'budget' }"
                            @click="activeTab = 'budget'">
                            Novo Budget
                        </button>
                        <button type="button" class="tab" :class="{ active: activeTab === 'expense' }"
                            @click="activeTab = 'expense'">
                            Novo Lançamento
                        </button>
                    </div>

                    <!-- Form para Novo Budget -->
                    <form v-if="activeTab === 'budget'" @submit.prevent="handleSubmit">
                        <h2>{{ props.editBudgetId ? 'Editar Budget' : 'Novo Budget' }}</h2>
                        <div class="form-group">
                            <label for="budget-name">Nome do Budget</label>
                            <input id="budget-name" v-model="budgetName" type="text" required
                                placeholder="Ex: Alimentação" />
                        </div>
                        <div class="form-group">
                            <label for="budget-value">Valor Total</label>
                            <input id="budget-value" required :model-modifiers="{ number: true }"
                                v-model.lazy="budgetValue" v-money3="moneyConfig" />
                            <QuickAmountButtons @add="addAmount" />
                        </div>
                        <div class="form-group">
                            <label for="budget-group">Grupo (opcional)</label>
                            <select id="budget-group" v-model="selectedGroupId">
                                <option value="">Sem grupo</option>
                                <option v-for="group in budgetStore.groups" :key="group.id" :value="group.id">
                                    {{ group.name }}
                                </option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="budget-color">Cor</label>
                            <div class="color-picker">
                                <div v-for="color in availableColors" :key="color" class="color-option"
                                    :class="{ selected: budgetColor === color }" :style="{ backgroundColor: color }"
                                    @click="budgetColor = color"></div>
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-cancel" @click="close">Cancelar</button>
                            <button type="submit" class="btn-submit">{{ props.editBudgetId ? 'Salvar' : 'Adicionar'
                                }}</button>
                        </div>
                    </form>

                    <!-- Form para Novo Lançamento -->
                    <form v-else-if="activeTab === 'expense'" @submit.prevent="handleExpenseSubmit">
                        <h2>Novo Lançamento</h2>

                        <div class="form-group">
                            <label for="expense-value">Valor</label>
                            <input id="expense-value" required :model-modifiers="{ number: true }"
                                v-model.lazy="expenseValue" v-money3="moneyConfig" />
                            <QuickAmountButtons @add="addExpenseAmount" />
                        </div>

                        <div class="form-group">
                            <label for="expense-type">Tipo</label>
                            <select id="expense-type" v-model="expenseType">
                                <option value="expense">Gasto (-)</option>
                                <option value="income">Recebimento (+)</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="expense-budget">Budget</label>
                            <select id="expense-budget" v-model="selectedExpenseBudgetId" required>
                                <option value="">Selecione um budget</option>
                                <option v-for="budget in budgetStore.budgets" :key="budget.id" :value="budget.id">
                                    {{ budget.name }}
                                </option>
                            </select>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn-cancel" @click="close">Cancelar</button>
                            <button type="submit" class="btn-submit">Adicionar Lançamento</button>
                        </div>
                    </form>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { Money3Directive } from 'v-money3'
import QuickAmountButtons from './QuickAmountButtons.vue'

const vMoney3 = Money3Directive

const props = defineProps<{
    show: boolean
    preselectedGroupId?: string
    editBudgetId?: string
    editBudgetName?: string
    editBudgetValue?: number
    editBudgetColor?: string
    editBudgetGroupId?: string
}>()

const emit = defineEmits<{
    close: []
    submit: [name: string, value: number, color: string, groupId?: string]
    update: [id: string, name: string, value: number, color: string, groupId?: string]
}>()

const budgetStore = useBudgetStore()
const budgetName = ref('')
const budgetValue = ref('0.00')
const budgetColor = ref('#4CAF50')
const selectedGroupId = ref<string>('')
const activeTab = ref<'budget' | 'expense'>('budget')
const expenseValue = ref('0.00')
const expenseType = ref<'expense' | 'income'>('expense')
const selectedExpenseBudgetId = ref<string>('')

const moneyConfig = {
    decimal: ',',
    thousands: '.',
    prefix: 'R$ ',
    suffix: '',
    precision: 2,
    masked: true
}

const addAmount = (amount: number) => {
    // Garante que estamos trabalhando com número, não string
    let current = 0

    try {
        const rawValue = budgetValue.value

        if (typeof rawValue === 'number') {
            current = rawValue
        } else if (typeof rawValue === 'string') {
            // v-money3 SEMPRE formata para brasileiro: R$ 4.000,00
            // Então sempre usa formato brasileiro: remove pontos de milhar, vírgula vira ponto
            const cleanStr = rawValue
                .replace(/[R$\s]/g, '')     // Remove R$ e espaços
                .replace(/\./g, '')         // Remove pontos de milhar  
                .replace(',', '.')          // Vírgula vira ponto decimal

            current = parseFloat(cleanStr) || 0
        }
    } catch (e) {
        console.error('Erro ao processar valor atual:', e)
        current = 0
    }

    // IMPORTANTE: Garante que amount também é número
    const numAmount = Number(amount)
    const newValue = current + numAmount

    console.log('addAmount:', {
        rawInput: budgetValue.value,
        current,
        amount: numAmount,
        newValue,
        types: {
            current: typeof current,
            amount: typeof numAmount,
            result: typeof newValue
        }
    })

    // Atribui como string numérica pura (ex: "520.00")
    budgetValue.value = newValue.toFixed(2)
}

const addExpenseAmount = (amount: number) => {
    // Garante que estamos trabalhando com número, não string
    let current = 0

    try {
        const rawValue = expenseValue.value

        if (typeof rawValue === 'number') {
            current = rawValue
        } else if (typeof rawValue === 'string') {
            const cleanStr = rawValue
                .replace(/[R$\s]/g, '')
                .replace(/\./g, '')
                .replace(',', '.')

            current = parseFloat(cleanStr) || 0
        }
    } catch (e) {
        console.error('Erro ao processar valor atual:', e)
        current = 0
    }

    const numAmount = Number(amount)
    const newValue = current + numAmount

    expenseValue.value = newValue.toFixed(2)
}

const availableColors = [
    // Verdes (claro, médio, escuro)
    '#E8F5E9', '#4CAF50', '#2E7D32',
    // Azuis (claro, médio, escuro)
    '#E3F2FD', '#2196F3', '#1565C0',
    // Vermelhos/Rosas (claro, médio, escuro)
    '#FCE4EC', '#E91E63', '#AD1457',
    // Laranjas (claro, médio, escuro)
    '#FFF3E0', '#FF9800', '#E65100',
    // Roxos (claro, médio, escuro)
    '#F3E5F5', '#9C27B0', '#6A1B9A',
    // Amarelos/Lima (claro, médio, escuro)
    '#F9FBE7', '#CDDC39', '#9E9D24',
    // Cianos/Turquesa (claro, médio)
    '#E0F7FA', '#00BCD4',
    // Marrons (médio)
    '#795548'
]



watch(() => props.show, (newVal) => {
    if (newVal) {
        activeTab.value = 'budget'

        // Se está em modo de edição, preenche os campos
        if (props.editBudgetId) {
            budgetName.value = props.editBudgetName || ''
            budgetValue.value = (props.editBudgetValue || 0).toFixed(2)
            budgetColor.value = props.editBudgetColor || '#4CAF50'
            selectedGroupId.value = props.editBudgetGroupId || ''
        } else {
            // Modo criação - limpa os campos
            budgetName.value = ''
            budgetValue.value = '0.00'
            budgetColor.value = '#4CAF50'
            selectedGroupId.value = props.preselectedGroupId || ''
        }

        expenseValue.value = '0.00'
        expenseType.value = 'expense'
        selectedExpenseBudgetId.value = ''
    }
})

const handleSubmit = () => {
    // v-money3 sempre formata para brasileiro, então sempre processa assim
    let numericValue = 0
    const rawValue = budgetValue.value

    if (typeof rawValue === 'number') {
        numericValue = rawValue
    } else if (typeof rawValue === 'string') {
        // v-money3 formata para: R$ 4.000,00
        const cleanStr = rawValue
            .replace(/[R$\s]/g, '')     // Remove R$ e espaços
            .replace(/\./g, '')         // Remove pontos de milhar
            .replace(',', '.')          // Vírgula vira ponto decimal

        numericValue = parseFloat(cleanStr) || 0
    }

    if (budgetName.value && numericValue > 0) {
        // Se está editando, emite update, senão emite submit
        if (props.editBudgetId) {
            emit('update', props.editBudgetId, budgetName.value, numericValue, budgetColor.value, selectedGroupId.value || undefined)
            close()
        } else {
            // Verificar se já existe budget com mesmo nome
            const nameExists = budgetStore.budgets.some(
                b => b.name.toLowerCase() === budgetName.value.toLowerCase()
            )

            if (nameExists) {
                alert(`❌ Já existe um budget chamado "${budgetName.value}"`)
                return
            }

            emit('submit', budgetName.value, numericValue, budgetColor.value, selectedGroupId.value || undefined)
            close()
        }
    }
}

const close = () => {
    emit('close')
}

const handleExpenseSubmit = async () => {
    let numericValue = 0
    const rawValue = expenseValue.value

    if (typeof rawValue === 'number') {
        numericValue = rawValue
    } else if (typeof rawValue === 'string') {
        const cleanStr = rawValue
            .replace(/[R$\s]/g, '')
            .replace(/\./g, '')
            .replace(',', '.')

        numericValue = parseFloat(cleanStr) || 0
    }

    if (numericValue > 0 && selectedExpenseBudgetId.value) {
        // Se for recebimento, subtrai do valor gasto (como se fosse um "estorno")
        const finalAmount = expenseType.value === 'income' ? -numericValue : numericValue

        await budgetStore.addExpense(selectedExpenseBudgetId.value, finalAmount)
        close()
    }
}
</script>

<style scoped>
.tabs {
    display: flex;
    border-bottom: 2px solid #e0e0e0;
    margin-bottom: 20px;
}

.tab {
    flex: 1;
    padding: 12px;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    font-size: 15px;
    font-weight: 500;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
}

.tab:hover {
    color: #4CAF50;
    background: rgba(76, 175, 80, 0.05);
}

.tab.active {
    color: #4CAF50;
    border-bottom-color: #4CAF50;
}

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
    z-index: 2000;
}

.modal-content {
    background: white;
    border-radius: 12px;
    padding: 24px;
    width: 90%;
    max-width: 400px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

h2 {
    margin: 0 0 20px 0;
    font-size: 24px;
    color: #333;
}

.form-group {
    margin-bottom: 16px;
}

label {
    display: block;
    margin-bottom: 6px;
    font-weight: 500;
    color: #555;
    font-size: 14px;
}

input,
select {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 16px;
    box-sizing: border-box;
    transition: border-color 0.2s;
}

input:focus {
    outline: none;
    border-color: #4CAF50;
}

.color-picker {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
    gap: 12px;
    max-height: 250px;
    overflow-y: auto;
    padding: 4px;
}

.color-option {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
    border: 3px solid transparent;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
}

.color-option:active {
    transform: scale(0.9);
}

.color-option.selected {
    border-color: #333;
    box-shadow: 0 0 0 2px #fff, 0 0 0 4px #333;
    transform: scale(1.05);
}

/* Improve scrollbar for color picker on mobile */
.color-picker::-webkit-scrollbar {
    width: 6px;
}

.color-picker::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
}

.color-picker::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 3px;
}

.color-picker::-webkit-scrollbar-thumb:hover {
    background: #555;
}

.form-actions {
    display: flex;
    gap: 12px;
    margin-top: 24px;
}

button {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-cancel {
    background-color: #f0f0f0;
    color: #666;
}

.btn-cancel:hover {
    background-color: #e0e0e0;
}

.btn-submit {
    background-color: #4CAF50;
    color: white;
}

.btn-submit:hover {
    background-color: #45a049;
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

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
    transition: transform 0.3s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
    transform: scale(0.9);
}
</style>
