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
                        
                        <!-- Checkbox de compartilhar (só aparece se tem compartilhamento ativo) -->
                        <div v-if="hasActiveSharing" class="form-group checkbox-group">
                            <label class="checkbox-label share-checkbox">
                                <input type="checkbox" v-model="shareWithPartner" />
                                <span>💑 Compartilhar com {{ partnerEmail }}</span>
                            </label>
                            <p class="checkbox-hint">O budget será visível para seu parceiro(a)</p>
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

                        <!-- Checkbox de Parcelamento -->
                        <div class="form-group checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" v-model="expenseHasInstallments" />
                                <span>💳 Esta compra é parcelada</span>
                            </label>
                        </div>

                        <!-- Campos de Parcelamento -->
                        <div v-show="expenseHasInstallments" class="installment-section">
                            <label class="section-title">💳 Parcelamento</label>
                            <div class="installment-inputs">
                                <div class="input-group">
                                    <label for="expense-installment-number">Parcela:</label>
                                    <input id="expense-installment-number" v-model.number="expenseInstallmentNumber"
                                        type="number" min="1" :max="expenseInstallmentTotal || 12" />
                                </div>
                                <div class="installment-separator">/</div>
                                <div class="input-group">
                                    <label for="expense-installment-total">Total:</label>
                                    <input id="expense-installment-total" v-model.number="expenseInstallmentTotal"
                                        type="number" min="1" max="99" />
                                </div>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="button" class="btn-cancel" @click="close">Cancelar</button>
                            <button type="submit" class="btn-submit">Adicionar Lançamento</button>
                        </div>
                    </form>
                </div>
            </div>
        </Transition>

        <!-- Toast de erro -->
        <ToastNotification
            :show="showErrorToast"
            :message="errorMessage"
            type="error"
            @close="showErrorToast = false"
        />
    </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useAuthStore } from '@/stores/auth'
import { Money3Directive } from 'v-money3'
import QuickAmountButtons from './QuickAmountButtons.vue'
import ToastNotification from './ToastNotification.vue'

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
    submit: [name: string, value: number, color: string, groupId?: string, shareWithPartner?: boolean]
    update: [id: string, name: string, value: number, color: string, groupId?: string]
}>()

const budgetStore = useBudgetStore()
const authStore = useAuthStore()
const budgetName = ref('')
const budgetValue = ref('0.00')
const budgetColor = ref('#4CAF50')
const selectedGroupId = ref<string>('')
const shareWithPartner = ref(true) // Já vem marcado como sim por padrão
const activeTab = ref<'budget' | 'expense'>('budget')
const expenseValue = ref('0.00')
const expenseType = ref<'expense' | 'income'>('expense')
const selectedExpenseBudgetId = ref<string>('')
const expenseHasInstallments = ref(false)
const expenseInstallmentNumber = ref<number>(1)
const expenseInstallmentTotal = ref<number>(12)
const showErrorToast = ref(false)
const errorMessage = ref('')

// Verifica se tem compartilhamento ativo
const hasActiveSharing = computed(() => {
    return budgetStore.shareInvites.some(inv => 
        inv.status === 'accepted' &&
        (inv.fromUserId === authStore.userId || inv.toUserEmail?.toLowerCase() === authStore.userEmail?.toLowerCase())
    )
})

// Email do parceiro para exibir no checkbox
const partnerEmail = computed(() => {
    const acceptedInvite = budgetStore.shareInvites.find(inv => inv.status === 'accepted')
    if (!acceptedInvite) return ''
    
    if (acceptedInvite.fromUserId === authStore.userId) {
        return acceptedInvite.toUserEmail
    }
    return acceptedInvite.fromUserEmail
})

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
            shareWithPartner.value = true // Reset para true (padrão)
        }

        expenseValue.value = '0.00'
        expenseType.value = 'expense'
        selectedExpenseBudgetId.value = ''
        expenseHasInstallments.value = false
        expenseInstallmentNumber.value = 1
        expenseInstallmentTotal.value = 12
    }
})

// Limpa campos de parcelamento quando checkbox é desmarcado
watch(expenseHasInstallments, (newVal) => {
    if (!newVal) {
        expenseInstallmentNumber.value = 1
        expenseInstallmentTotal.value = 12
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
                errorMessage.value = `Já existe um budget chamado "${budgetName.value}"`
                showErrorToast.value = true
                return
            }

            // Passa shareWithPartner se tiver compartilhamento ativo
            const shouldShare = hasActiveSharing.value ? shareWithPartner.value : false
            emit('submit', budgetName.value, numericValue, budgetColor.value, selectedGroupId.value || undefined, shouldShare)
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

        // Salvar transação para histórico
        const budget = budgetStore.budgets.find(b => b.id === selectedExpenseBudgetId.value)
        if (budget) {
            const manualExpense = {
                id: `manual-${Date.now()}`,
                amount: numericValue,
                merchantName: expenseType.value === 'income' ? 'Recebimento Manual' : 'Lançamento Manual',
                description: expenseType.value === 'income' ? 'Recebimento adicionado manualmente' : 'Gasto adicionado manualmente',
                timestamp: Date.now(),
                installmentNumber: expenseHasInstallments.value ? expenseInstallmentNumber.value : undefined,
                installmentTotal: expenseHasInstallments.value ? expenseInstallmentTotal.value : undefined,
                bank: 'Manual'
            }
            await budgetStore.saveTransactionFromManual(selectedExpenseBudgetId.value, manualExpense, expenseType.value === 'income')
        }

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
    max-height: 85vh;
    overflow-y: auto;
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

/* Estilos para checkbox de parcelamento */
.checkbox-group {
    margin: 16px 0;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
    color: #333;
    user-select: none;
}

.checkbox-label input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #4CAF50;
}

.checkbox-label span {
    cursor: pointer;
}

/* Checkbox de compartilhar com parceiro */
.share-checkbox {
    background: linear-gradient(135deg, #FCE4EC 0%, #F3E5F5 100%);
    padding: 12px 16px;
    border-radius: 12px;
    border: 1px solid #F8BBD9;
}

.share-checkbox span {
    color: #AD1457;
}

.checkbox-hint {
    font-size: 12px;
    color: #666;
    margin: 6px 0 0 30px;
}

/* Estilos para seção de parcelamento */
.installment-section {
    background: #E3F2FD;
    padding: 16px;
    border-radius: 12px;
    margin: 16px 0;
}

.section-title {
    display: block;
    font-weight: 600;
    color: #1976D2;
    margin-bottom: 12px;
    font-size: 14px;
}

.installment-inputs {
    display: flex;
    align-items: flex-end;
    gap: 12px;
    margin-bottom: 8px;
}

.input-group {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.input-group label {
    font-size: 11px;
    color: #666;
    margin-bottom: 4px;
    font-weight: 500;
}

.input-group input[type="number"] {
    padding: 10px;
    border: 2px solid #BBDEFB;
    border-radius: 8px;
    font-size: 16px;
    text-align: center;
    font-weight: 600;
    color: #1976D2;
    background: white;
}

.input-group input[type="number"]:focus {
    outline: none;
    border-color: #1976D2;
}

.installment-separator {
    font-size: 24px;
    font-weight: bold;
    color: #1976D2;
    padding-bottom: 8px;
}

.installment-hint {
    font-size: 11px;
    color: #666;
    margin: 0;
    font-style: italic;
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

/* Dark mode */
body.dark-mode .modal-content {
    background: #1e1e2e;
}

body.dark-mode h2 {
    color: #fff;
}

body.dark-mode .form-label {
    color: #aaa;
}

body.dark-mode .form-input,
body.dark-mode .form-select {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #fff;
}

body.dark-mode .form-input::placeholder {
    color: #666;
}

body.dark-mode .tab {
    color: #aaa;
}

body.dark-mode .tab:hover {
    color: #4CAF50;
    background: rgba(76, 175, 80, 0.1);
}

body.dark-mode .tab.active {
    color: #4CAF50;
}

body.dark-mode .btn-cancel {
    background: #2a2a3e;
    color: #aaa;
}

body.dark-mode .btn-cancel:hover {
    background: #3a3a4e;
}
</style>
