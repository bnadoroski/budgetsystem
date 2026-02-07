<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useAuthStore } from '@/stores/auth'
import type { Budget } from '@/types/budget'
import { Money3Directive } from 'v-money3'
import QuickAmountButtons from './QuickAmountButtons.vue'
import NotificationPlugin from '@/plugins/NotificationPlugin'
import { checkPushPermission, requestPushPermission } from '@/plugins/FCMPlugin'
import { Capacitor } from '@capacitor/core'
import ConfirmModal from './ConfirmModal.vue'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'

const vMoney3 = Money3Directive

const props = defineProps<{
    show: boolean
}>()

const emit = defineEmits<{
    close: []
    confirmReset: [budgetId: string]
    viewTransactions: [budgetId: string]
}>()

const budgetStore = useBudgetStore()
const totalBudgetLimit = ref((budgetStore.totalBudgetLimit || 0).toFixed(2).replace('.', ','))
const resetDay = ref(budgetStore.resetDay || 5)
const editingBudget = ref<Budget | null>(null)
const editName = ref('')
const editTotal = ref(0)
const editColor = ref('')
const savedLimitFeedback = ref(false)
const showDeleteConfirm = ref(false)
const budgetToDelete = ref<string | null>(null)

// Valor do parceiro carregado do Firebase
const partnerBudgetLimitLoaded = ref(0)

// Valor do parceiro (de convites aceitos)
// Precisamos buscar o valor correto dependendo se somos remetente ou destinatário
const partnerBudgetLimit = computed(() => {
    const authStore = useAuthStore()
    const acceptedInvite = budgetStore.shareInvites.find(inv => inv.status === 'accepted')

    if (!acceptedInvite) return 0

    // Se EU sou o REMETENTE (fromUserId), o totalBudgetLimit do convite é MEU valor
    // Então preciso buscar o valor do parceiro (destinatário) em outro lugar
    if (acceptedInvite.fromUserId === authStore.userId) {
        // Sou o remetente - o valor no convite é meu, preciso do valor do destinatário
        // Usa partnerTotalBudgetLimit se existir, senão usa o valor carregado do Firebase
        return acceptedInvite.partnerTotalBudgetLimit || partnerBudgetLimitLoaded.value
    } else {
        // Sou o DESTINATÁRIO - o totalBudgetLimit do convite é do REMETENTE (meu parceiro)
        return acceptedInvite.totalBudgetLimit || 0
    }
})

// Carrega o valor do parceiro quando necessário
const loadPartnerBudgetLimit = async () => {
    const authStore = useAuthStore()
    const acceptedInvite = budgetStore.shareInvites.find(inv => inv.status === 'accepted')

    if (!acceptedInvite) return

    // Se sou o remetente e não tem partnerTotalBudgetLimit, busca do Firebase
    if (acceptedInvite.fromUserId === authStore.userId && !acceptedInvite.partnerTotalBudgetLimit) {
        const partnerId = acceptedInvite.toUserId
        if (partnerId) {
            partnerBudgetLimitLoaded.value = await budgetStore.getPartnerBudgetLimit(partnerId)
            console.log('📊 Valor do parceiro carregado:', partnerBudgetLimitLoaded.value)
        }
    }
}

// Nome/email do parceiro
const partnerInfo = computed(() => {
    const acceptedInvite = budgetStore.shareInvites.find(inv => inv.status === 'accepted')
    if (!acceptedInvite) return null

    // Verifica se sou o remetente ou destinatário para pegar o email correto
    const authStore = useAuthStore()
    if (acceptedInvite.fromUserId === authStore.userId) {
        return acceptedInvite.toUserEmail
    }
    return acceptedInvite.fromUserEmail
})

// Total combinado (meu + parceiro)
const combinedBudgetLimit = computed(() => {
    return totalBudgetLimitNumeric.value + partnerBudgetLimit.value
})

// Atualizar valores quando modal abrir
watch(() => props.show, async (isShowing) => {
    if (isShowing) {
        totalBudgetLimit.value = (budgetStore.totalBudgetLimit || 0).toFixed(2).replace('.', ',')
        resetDay.value = budgetStore.resetDay || 5
        // Carrega valor do parceiro se necessário
        await loadPartnerBudgetLimit()
    }
})

const moneyConfig = {
    decimal: ',',
    thousands: '.',
    prefix: 'R$ ',
    suffix: '',
    precision: 2,
    masked: true
}

const addAmountToLimit = (amount: number) => {
    // Garante que estamos trabalhando com número, não string
    let current = 0

    try {
        const rawValue = totalBudgetLimit.value

        if (typeof rawValue === 'number') {
            current = rawValue
        } else if (typeof rawValue === 'string') {
            // Se tem vírgula = valor digitado pelo usuário (formato brasileiro)
            // Se não tem vírgula = valor dos botões (formato americano)
            let cleanStr = rawValue

            if (cleanStr.includes(',')) {
                // Formato brasileiro: R$ 2.000,50
                cleanStr = cleanStr
                    .replace(/[R$\s]/g, '')
                    .replace(/\./g, '')      // Remove pontos de milhar
                    .replace(',', '.')       // Vírgula vira ponto decimal
            } else {
                // Formato americano dos botões: 500.00
                cleanStr = cleanStr.replace(/[^0-9.]/g, '')
            }

            current = parseFloat(cleanStr) || 0
        }
    } catch (e) {
        console.error('Erro ao processar valor atual:', e)
        current = 0
    }

    const numAmount = Number(amount)
    const newValue = current + numAmount

    // Atribui como string numérica pura
    totalBudgetLimit.value = newValue.toFixed(2)
}

// General Settings
const currency = ref('BRL')
const notificationsEnabled = ref(true)
const darkModeEnabled = ref(false)
const isNativePlatform = Capacitor.isNativePlatform()
const batteryOptimizationIgnored = ref(false)

// Textos para o status de bateria (evita problema com formatter)
const batteryStatusTitle = computed(() => batteryOptimizationIgnored.value ? 'Economia desativada' : 'Economia de bateria ativa')
const batteryStatusDesc = computed(() => batteryOptimizationIgnored.value ? 'O app pode capturar notificações em background' : 'O sistema pode impedir o app de funcionar em background')

// Verificar status da otimização de bateria
const checkBatteryStatus = async () => {
    if (isNativePlatform) {
        try {
            const result = await NotificationPlugin.checkBatteryOptimization()
            batteryOptimizationIgnored.value = result.isIgnoring
        } catch (e) {
            console.log('Não foi possível verificar otimização de bateria')
        }
    }
}

// Abrir configurações de bateria
const openBatterySettings = async () => {
    if (isNativePlatform) {
        try {
            await NotificationPlugin.openBatterySettings()
        } catch (e) {
            console.error('Erro ao abrir configurações de bateria:', e)
        }
    }
}

// Solicitar ignorar otimização de bateria
const requestIgnoreBattery = async () => {
    if (isNativePlatform) {
        try {
            await NotificationPlugin.requestIgnoreBatteryOptimization()
            // Verificar novamente após alguns segundos
            setTimeout(checkBatteryStatus, 2000)
        } catch (e) {
            console.error('Erro ao solicitar ignorar bateria:', e)
        }
    }
}

const totalAllocated = computed(() => {
    return budgetStore.budgets.reduce((sum, b) => sum + b.totalValue, 0)
})

const totalBudgetLimitNumeric = computed(() => {
    return parseFloat(totalBudgetLimit.value.replace('R$ ', '').replace(/\./g, '').replace(',', '.')) || 0
})

const isOverLimit = computed(() => {
    // Usa o valor combinado se tiver parceiro, senão só o meu valor
    const totalLimit = combinedBudgetLimit.value > 0 ? combinedBudgetLimit.value : totalBudgetLimitNumeric.value
    return totalLimit > 0 && totalAllocated.value > totalLimit
})

const remainingBudget = computed(() => {
    // Usa o valor combinado se tiver parceiro, senão só o meu valor
    const totalLimit = combinedBudgetLimit.value > 0 ? combinedBudgetLimit.value : totalBudgetLimitNumeric.value
    return totalLimit > 0 ? totalLimit - totalAllocated.value : 0
})

const handleSaveLimit = async () => {
    const numericValue = parseFloat(totalBudgetLimit.value.replace('R$ ', '').replace(/\./g, '').replace(',', '.')) || 0
    await budgetStore.setTotalBudgetLimit(numericValue)
    budgetStore.setResetDay(resetDay.value)
    savedLimitFeedback.value = true
    setTimeout(() => {
        savedLimitFeedback.value = false
    }, 2000)
}

const handleEditBudget = (budget: Budget) => {
    editingBudget.value = budget
    editName.value = budget.name
    editTotal.value = budget.totalValue
    editColor.value = budget.color
}

const handleSaveEdit = () => {
    if (editingBudget.value) {
        budgetStore.updateBudget(editingBudget.value.id, {
            name: editName.value,
            totalValue: editTotal.value,
            color: editColor.value
        })
        editingBudget.value = null
    }
}

const handleCancelEdit = () => {
    editingBudget.value = null
}

const handleResetSpent = (budgetId: string) => {
    emit('confirmReset', budgetId)
}

const handleViewTransactions = (budgetId: string) => {
    emit('viewTransactions', budgetId)
}

const handleDeleteBudget = (budgetId: string) => {
    budgetToDelete.value = budgetId
    showDeleteConfirm.value = true
}

const confirmDeleteBudget = () => {
    if (budgetToDelete.value) {
        budgetStore.deleteBudget(budgetToDelete.value)
    }
    budgetToDelete.value = null
    showDeleteConfirm.value = false
}

const cancelDeleteBudget = () => {
    budgetToDelete.value = null
    showDeleteConfirm.value = false
}

const formatCurrency = (value: number) => {
    const currencyCode = currency.value || 'BRL'
    const locale = currencyCode === 'BRL' ? 'pt-BR' : currencyCode === 'EUR' ? 'de-DE' : 'en-US'
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode
    }).format(value)
}

// Load settings from localStorage
const loadSettings = () => {
    const savedCurrency = localStorage.getItem('currency')
    const savedNotifications = localStorage.getItem('notificationsEnabled')
    const savedDarkMode = localStorage.getItem('darkModeEnabled')

    if (savedCurrency) currency.value = savedCurrency
    if (savedNotifications) notificationsEnabled.value = savedNotifications === 'true'
    if (savedDarkMode) darkModeEnabled.value = savedDarkMode === 'true'
}

// Save settings to localStorage whenever they change
watch(currency, (newValue) => {
    localStorage.setItem('currency', newValue)
    budgetStore.currency = newValue
})

// Função auxiliar para salvar preferência de notificações no Firestore
const saveNotificationPreferenceToFirestore = async (enabled: boolean) => {
    const authStore = useAuthStore()
    if (!authStore.userId) return

    try {
        const userDocRef = doc(db, 'users', authStore.userId)
        await setDoc(userDocRef, {
            notificationsEnabled: enabled,
            notificationsUpdatedAt: new Date().toISOString()
        }, { merge: true })
        console.log('✅ Preferência de notificações salva no Firestore:', enabled)
    } catch (error) {
        console.error('❌ Erro ao salvar preferência no Firestore:', error)
    }
}

watch(notificationsEnabled, async (newValue, oldValue) => {
    // Ignorar mudanças durante a inicialização
    if (oldValue === undefined) return

    if (newValue) {
        // Usuário quer habilitar notificações - solicitar permissão
        try {
            const result = await requestPushPermission()
            if (result.granted) {
                localStorage.setItem('notificationsEnabled', 'true')
                localStorage.setItem('pushPermissionDenied', 'false')
                // Salva no Firestore também
                await saveNotificationPreferenceToFirestore(true)
                console.log('Permissão de notificação concedida')
            } else {
                // Permissão negada - reverter toggle e salvar flag
                notificationsEnabled.value = false
                localStorage.setItem('notificationsEnabled', 'false')
                localStorage.setItem('pushPermissionDenied', 'true')
                await saveNotificationPreferenceToFirestore(false)
                console.log('Permissão de notificação negada pelo usuário')
            }
        } catch (error) {
            console.error('Erro ao solicitar permissão:', error)
            notificationsEnabled.value = false
            localStorage.setItem('notificationsEnabled', 'false')
            await saveNotificationPreferenceToFirestore(false)
        }
    } else {
        // Usuário quer desativar notificações
        localStorage.setItem('notificationsEnabled', 'false')
        // Salva no Firestore também
        await saveNotificationPreferenceToFirestore(false)

        // Abre as configurações de notificação do sistema para o usuário desativar
        if (isNativePlatform) {
            try {
                await NotificationPlugin.openNotificationSettings()
            } catch (e) {
                console.error('Erro ao abrir configurações de notificação:', e)
            }
        }
    }
})

watch(darkModeEnabled, (newValue) => {
    localStorage.setItem('darkModeEnabled', newValue.toString())
    budgetStore.darkMode = newValue
    // Apply dark mode to document
    if (newValue) {
        document.body.classList.add('dark-mode')
    } else {
        document.body.classList.remove('dark-mode')
    }
})

// Initialize settings on mount
onMounted(() => {
    loadSettings()
    // Apply dark mode if enabled
    if (darkModeEnabled.value) {
        document.body.classList.add('dark-mode')
    }
    // Verificar status da bateria
    checkBatteryStatus()
})
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click.self="emit('close')">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Configurações</h2>
                        <button class="close-button" @click="emit('close')">×</button>
                    </div>

                    <div class="modal-body">
                        <!-- Total Budget Limit Section -->
                        <section class="settings-section">
                            <h3>Limite de Orçamento Total</h3>
                            <p class="section-description">
                                Defina o valor total disponível (ex: seu salário) para controlar melhor seus gastos
                            </p>

                            <div class="input-group">
                                <label>Valor Total Disponível</label>
                                <input :model-modifiers="{ number: true }" v-model.lazy="totalBudgetLimit"
                                    v-money3="moneyConfig" />
                                <QuickAmountButtons @add="addAmountToLimit" />
                                <label style="margin-top: 16px;">Dia de Reset Mensal</label>
                                <input v-model.number="resetDay" type="number" placeholder="Dia do mês (1-28)" min="1"
                                    max="28" />
                                <p class="reset-info">💡 Os gastos de todos os budgets serão zerados todo dia {{
                                    resetDay }}</p>
                                <button class="save-button" @click="handleSaveLimit">Salvar Configurações</button>
                                <Transition name="fade">
                                    <div v-if="savedLimitFeedback" class="success-feedback">
                                        ✓ Configurações salvas com sucesso!
                                    </div>
                                </Transition>
                            </div>

                            <div v-if="totalBudgetLimitNumeric > 0 || partnerBudgetLimit > 0" class="budget-summary">
                                <div class="summary-row">
                                    <span>Meu Valor:</span>
                                    <strong>{{ formatCurrency(totalBudgetLimitNumeric) }}</strong>
                                </div>
                                <div v-if="partnerBudgetLimit > 0" class="summary-row partner-row">
                                    <span>💑 Valor do Parceiro(a):</span>
                                    <strong class="partner-value">{{ formatCurrency(partnerBudgetLimit) }}</strong>
                                </div>
                                <div v-if="partnerBudgetLimit > 0" class="summary-row total-combined">
                                    <span>📊 Total Combinado:</span>
                                    <strong class="text-primary">{{ formatCurrency(combinedBudgetLimit) }}</strong>
                                </div>
                                <div v-if="partnerBudgetLimit > 0" class="divider-row"></div>
                                <div class="summary-row">
                                    <span>Total Alocado:</span>
                                    <strong :class="{ 'text-danger': isOverLimit }">
                                        {{ formatCurrency(totalAllocated) }}
                                    </strong>
                                </div>
                                <div class="summary-row">
                                    <span>Restante:</span>
                                    <strong
                                        :class="{ 'text-success': remainingBudget > 0, 'text-danger': remainingBudget < 0 }">
                                        {{ formatCurrency(remainingBudget) }}
                                    </strong>
                                </div>
                            </div>

                            <div v-if="isOverLimit" class="alert-warning">
                                ⚠️ Atenção: O total dos seus budgets excede o limite definido!
                            </div>
                        </section>

                        <!-- Budget Management Section -->
                        <section class="settings-section">
                            <h3>Gerenciar Budgets</h3>
                            <p class="section-description">
                                Edite, redefina ou exclua seus budgets existentes
                            </p>

                            <div v-if="budgetStore.budgets.length === 0" class="no-budgets">
                                <p>Nenhum budget criado ainda</p>
                            </div>

                            <div v-else class="budget-items">
                                <div v-for="budget in budgetStore.budgets" :key="budget.id" class="budget-item">
                                    <!-- Edit Mode -->
                                    <div v-if="editingBudget?.id === budget.id" class="edit-mode">
                                        <input v-model="editName" type="text" placeholder="Nome do budget"
                                            class="edit-input" />
                                        <input v-model.number="editTotal" type="number" placeholder="Valor total"
                                            step="0.01" min="0" class="edit-input" />
                                        <input v-model="editColor" type="color" class="edit-color" />
                                        <div class="edit-actions">
                                            <button class="btn-save" @click="handleSaveEdit">Salvar</button>
                                            <button class="btn-cancel" @click="handleCancelEdit">Cancelar</button>
                                        </div>
                                    </div>

                                    <!-- View Mode -->
                                    <div v-else class="view-mode">
                                        <div class="budget-info">
                                            <div class="color-indicator" :style="{ backgroundColor: budget.color }">
                                            </div>
                                            <div class="budget-details">
                                                <strong>{{ budget.name }}</strong>
                                                <span class="budget-values">
                                                    {{ formatCurrency(budget.spentValue) }} / {{
                                                        formatCurrency(budget.totalValue) }}
                                                </span>
                                            </div>
                                        </div>
                                        <div class="budget-actions">
                                            <button class="action-button" title="Editar"
                                                @click="handleEditBudget(budget)">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                                    stroke="currentColor" stroke-width="2">
                                                    <path
                                                        d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7">
                                                    </path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z">
                                                    </path>
                                                </svg>
                                            </button>
                                            <button class="action-button" title="Ver Lançamentos"
                                                @click="handleViewTransactions(budget.id)">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                                    stroke="currentColor" stroke-width="2">
                                                    <path
                                                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z">
                                                    </path>
                                                    <polyline points="14 2 14 8 20 8"></polyline>
                                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                                    <polyline points="10 9 9 9 8 9"></polyline>
                                                </svg>
                                            </button>
                                            <button class="action-button" title="Resetar gastos"
                                                @click="handleResetSpent(budget.id)">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                                    stroke="currentColor" stroke-width="2">
                                                    <polyline points="23 4 23 10 17 10"></polyline>
                                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                                                </svg>
                                            </button>
                                            <button class="action-button danger" title="Excluir"
                                                @click="handleDeleteBudget(budget.id)">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                                    stroke="currentColor" stroke-width="2">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path
                                                        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2">
                                                    </path>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <!-- Additional Settings Section -->
                        <section class="settings-section">
                            <h3>Configurações Gerais</h3>
                            <p class="section-description">
                                Outras opções e preferências
                            </p>

                            <div class="settings-options">
                                <!-- Moeda comentada - trabalharemos apenas com Real por enquanto -->
                                <!-- <div class="option-item">
                                    <span>Moeda</span>
                                    <select v-model="currency" class="option-select">
                                        <option value="BRL">Real (R$)</option>
                                        <option value="USD">Dólar ($)</option>
                                        <option value="EUR">Euro (€)</option>
                                    </select>
                                </div> -->

                                <div class="option-item">
                                    <span>Notificações</span>
                                    <label class="switch">
                                        <input v-model="notificationsEnabled" type="checkbox" />
                                        <span class="slider"></span>
                                    </label>
                                </div>

                                <div class="option-item">
                                    <span>Modo Escuro</span>
                                    <label class="switch">
                                        <input v-model="darkModeEnabled" type="checkbox" />
                                        <span class="slider"></span>
                                    </label>
                                </div>
                            </div>
                        </section>

                        <!-- Battery Optimization Section (Android only) -->
                        <section v-if="isNativePlatform" class="settings-section">
                            <h3>🔋 Economia de Bateria</h3>
                            <p class="section-description">
                                Para capturar notificações com o app fechado, desative a economia de bateria
                            </p>

                            <div class="battery-status"
                                :class="{ 'status-ok': batteryOptimizationIgnored, 'status-warning': !batteryOptimizationIgnored }">
                                <div class="status-icon">
                                    {{ batteryOptimizationIgnored ? '✅' : '⚠️' }}
                                </div>
                                <div class="status-text">
                                    <strong>{{ batteryStatusTitle }}</strong>
                                    <span>{{ batteryStatusDesc }}</span>
                                </div>
                            </div>

                            <div class="battery-actions">
                                <button v-if="!batteryOptimizationIgnored" class="btn-battery-request"
                                    @click="requestIgnoreBattery">
                                    🔓 Desativar Economia
                                </button>
                                <button class="btn-battery-settings" @click="openBatterySettings">
                                    ⚙️ Abrir Configurações do App
                                </button>
                            </div>

                            <div class="battery-instructions">
                                <p><strong>📱 Samsung:</strong> Vá em Bateria → Uso em segundo plano → Escolha
                                    "Irrestrito"</p>
                                <p><strong>📱 Xiaomi:</strong> Desative "Restrição de segundo plano" e "Economia de
                                    energia"</p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- Modal de confirmação para excluir budget -->
        <ConfirmModal :show="showDeleteConfirm" title="Excluir Budget"
            message="Tem certeza que deseja <strong>excluir</strong> este budget? Esta ação não pode ser desfeita."
            type="danger" confirm-text="Excluir" confirm-icon="🗑️" @confirm="confirmDeleteBudget"
            @cancel="cancelDeleteBudget" />
    </Teleport>
</template>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 20px;
}

.modal-content {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
}

.modal-header h2 {
    margin: 0;
    font-size: 24px;
    color: #333;
}

.close-button {
    background: none;
    border: none;
    font-size: 32px;
    color: #999;
    cursor: pointer;
    line-height: 1;
    padding: 0;
    width: 32px;
    height: 32px;
}

.close-button:hover {
    color: #333;
}

.modal-body {
    padding: 20px;
}

.settings-section {
    margin-bottom: 30px;
}

.settings-section h3 {
    font-size: 18px;
    color: #333;
    margin: 0 0 8px 0;
}

.section-description {
    font-size: 14px;
    color: #666;
    margin: 0 0 20px 0;
    line-height: 1.5;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
}

.input-group label {
    font-size: 14px;
    color: #555;
    font-weight: 500;
}

.input-group input {
    padding: 12px;
    font-size: 16px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    transition: border-color 0.3s;
}

.input-group input:focus {
    outline: none;
    border-color: #4a90e2;
}

.save-button {
    padding: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: transform 0.2s;
}

.save-button:hover {
    transform: scale(1.02);
}

.save-button:active {
    transform: scale(0.98);
}

.success-feedback {
    background: #d4edda;
    border: 1px solid #c3e6cb;
    color: #155724;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
    font-size: 14px;
    font-weight: 500;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

.budget-summary {
    background: #2d3748;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
}

.summary-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 15px;
    color: #e2e8f0;
}

.summary-row:not(:last-child) {
    border-bottom: 1px solid #4a5568;
}

.summary-row strong {
    color: #fff;
}

.partner-row {
    background: rgba(102, 126, 234, 0.15);
    margin: 4px -8px;
    padding: 8px;
    border-radius: 8px;
}

.partner-value {
    color: #a78bfa !important;
}

.total-combined {
    background: rgba(79, 209, 197, 0.15);
    margin: 4px -8px;
    padding: 8px;
    border-radius: 8px;
    font-size: 16px;
}

.text-primary {
    color: #4fd1c5 !important;
}

.divider-row {
    height: 1px;
    background: #4a5568;
    margin: 8px 0;
}

.text-danger {
    color: #fc8181 !important;
}

.text-success {
    color: #68d391 !important;
}

.alert-warning {
    background: #fff3cd;
    border: 1px solid #ffc107;
    color: #856404;
    padding: 12px;
    border-radius: 8px;
    font-size: 14px;
    text-align: center;
}

.no-budgets {
    text-align: center;
    padding: 30px;
    color: #999;
}

.budget-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.budget-item {
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    padding: 16px;
    background: #fafafa;
}

.view-mode {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
}

.budget-info {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
}

.color-indicator {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    flex-shrink: 0;
}

.budget-details {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.budget-details strong {
    font-size: 16px;
    color: #333;
}

.budget-values {
    font-size: 13px;
    color: #666;
}

.budget-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
}

.action-button {
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 8px 12px;
    cursor: pointer;
    color: #666;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 13px;
    white-space: nowrap;
}

.action-button:hover {
    background: #f5f5f5;
    color: #333;
}

.action-button.danger:hover {
    background: #fee;
    color: #e53e3e;
    border-color: #e53e3e;
}

.edit-mode {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.edit-input {
    padding: 10px;
    font-size: 14px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
}

.edit-input:focus {
    outline: none;
    border-color: #4a90e2;
}

.edit-color {
    height: 40px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    cursor: pointer;
}

.edit-actions {
    display: flex;
    gap: 8px;
}

.btn-save,
.btn-cancel {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: transform 0.2s;
}

.btn-save {
    background: #38a169;
    color: white;
}

.btn-cancel {
    background: #e0e0e0;
    color: #666;
}

.btn-save:hover,
.btn-cancel:hover {
    transform: scale(1.02);
}

.settings-options {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.option-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 8px;
}

.option-item span {
    font-size: 15px;
    color: #333;
}

.reset-info {
    font-size: 13px;
    color: #666;
    margin: 8px 0 0 0;
    padding: 8px;
    background: #f0f7ff;
    border-radius: 6px;
}

.option-select {
    padding: 6px 12px;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    background: white;
    font-size: 14px;
    cursor: pointer;
}

/* Toggle Switch */
.switch {
    position: relative;
    display: inline-block;
    width: 48px;
    height: 26px;
}

.switch input {
    opacity: 0;
    width: 0;
    height: 0;
}

.slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
    border-radius: 26px;
}

.slider:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
}

input:checked+.slider {
    background-color: #667eea;
}

input:checked+.slider:before {
    transform: translateX(22px);
}

/* Battery Optimization Styles */
.battery-status {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-radius: 12px;
    margin-bottom: 16px;
}

.battery-status.status-ok {
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
    border: 1px solid #28a745;
}

.battery-status.status-warning {
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
    border: 1px solid #ffc107;
}

.status-icon {
    font-size: 28px;
}

.status-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.status-text strong {
    font-size: 15px;
    color: #333;
}

.status-text span {
    font-size: 13px;
    color: #666;
}

.battery-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
}

.btn-battery-request {
    padding: 14px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}

.btn-battery-request:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-battery-settings {
    padding: 12px 20px;
    background: #f0f0f0;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
}

.btn-battery-settings:hover {
    background: #e0e0e0;
}

.battery-instructions {
    background: #f8f9fa;
    border-radius: 10px;
    padding: 14px;
}

.battery-instructions p {
    margin: 0;
    padding: 6px 0;
    font-size: 13px;
    color: #555;
    line-height: 1.4;
}

.battery-instructions p:not(:last-child) {
    border-bottom: 1px solid #eee;
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
    transition: transform 0.3s;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
    transform: scale(0.9);
}

/* Dark Mode */
body.dark-mode .modal-content {
    background: #1e1e2e;
}

body.dark-mode .modal-header {
    background: #1e1e2e;
    border-bottom-color: #3a3a4e;
}

body.dark-mode .modal-header h2 {
    color: #fff;
}

body.dark-mode .close-button {
    color: #aaa;
}

body.dark-mode .close-button:hover {
    color: #fff;
}

body.dark-mode .settings-section h3 {
    color: #fff;
}

body.dark-mode .section-description {
    color: #aaa;
}

body.dark-mode .input-group label {
    color: #aaa;
}

body.dark-mode .input-group input,
body.dark-mode .input-group select,
body.dark-mode .option-select {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #fff;
}

body.dark-mode .input-group input::placeholder {
    color: #666;
}

body.dark-mode .success-feedback {
    background: #1a3a2a;
    color: #68d391;
}

body.dark-mode .budget-item {
    background: #2a2a3e;
    border-color: #3a3a4e;
}

body.dark-mode .budget-details strong {
    color: #fff;
}

body.dark-mode .budget-values {
    color: #aaa;
}

body.dark-mode .action-button {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #aaa;
}

body.dark-mode .action-button:hover {
    background: #3a3a4e;
    color: #fff;
}

body.dark-mode .edit-input {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #fff;
}

body.dark-mode .btn-cancel {
    background: #2a2a3e;
    color: #aaa;
}

body.dark-mode .btn-cancel:hover {
    background: #3a3a4e;
}

body.dark-mode .option-item {
    background: #2a2a3e;
}

body.dark-mode .option-item span {
    color: #fff;
}

body.dark-mode .reset-info {
    background: #1a2a3e;
    color: #aaa;
}

body.dark-mode .alert-warning {
    background: #3d3020;
    color: #f0c060;
}

body.dark-mode .no-budgets {
    color: #aaa;
}

body.dark-mode .battery-status .status-text strong {
    color: #fff;
}

body.dark-mode .battery-status .status-text span {
    color: #aaa;
}

body.dark-mode .btn-battery-settings {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #fff;
}

body.dark-mode .battery-instructions {
    background: #2a2a3e;
}

body.dark-mode .battery-instructions p {
    color: #aaa;
}

body.dark-mode .battery-instructions p:not(:last-child) {
    border-bottom-color: #3a3a4e;
}
</style>
