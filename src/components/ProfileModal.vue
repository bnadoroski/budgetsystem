<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click="$emit('close')">
                <div class="modal-content" @click.stop>
                    <div class="modal-header">
                        <h2>Perfil</h2>
                        <button class="close-button" @click="$emit('close')">✕</button>
                    </div>

                    <div class="profile-body">
                        <!-- User Info Section -->
                        <div class="user-section">
                            <div class="user-info">
                                <p class="user-email">{{ email }}</p>
                            </div>
                        </div>

                        <!-- Divider -->
                        <div class="divider"></div>

                        <!-- Share Section -->
                        <div class="action-section share-section">
                            <h3>Compartilhamento</h3>
                            <p class="section-description">Compartilhe budgets e valor total com seu cônjuge/parceiro(a)
                            </p>

                            <!-- Campo de email -->
                            <div class="share-input-group">
                                <input v-model="shareEmail" type="email" placeholder="email@exemplo.com"
                                    class="share-input" />
                                <button class="btn-share" @click="handleShare" :disabled="!shareEmail || isSharing">
                                    <span v-if="isSharing">Enviando...</span>
                                    <span v-else>Enviar<br>Convite</span>
                                </button>
                            </div>

                            <!-- Mensagens de feedback -->
                            <Transition name="fade">
                                <div v-if="shareSuccess" class="share-message success">
                                    ✓ Convite enviado com sucesso!
                                </div>
                            </Transition>
                            <Transition name="fade">
                                <div v-if="shareError" class="share-message error">
                                    ⚠️ {{ shareError }}
                                </div>
                            </Transition>

                            <!-- Lista de compartilhamentos ativos -->
                            <div v-if="activeShares.length > 0" class="shared-list">
                                <p class="shared-label">Compartilhado com:</p>
                                <div v-for="share in activeShares" :key="share.email" class="shared-user">
                                    <div class="share-info">
                                        <span class="share-email">{{ share.email }}</span>
                                        <span class="share-status">{{ share.budgetCount }} budget{{ share.budgetCount >
                                            1 ? 's' : '' }}</span>
                                    </div>
                                    <button class="btn-remove" @click="handleRemoveShare(share.email)"
                                        title="Remover compartilhamento">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <!-- Convites pendentes -->
                            <div v-if="pendingInvites.length > 0" class="pending-invites">
                                <p class="shared-label">Convites Pendentes:</p>
                                <div v-for="invite in pendingInvites" :key="invite.id" class="pending-invite">
                                    <div class="invite-info">
                                        <span class="invite-type" v-if="invite.fromUserId === authStore.userId">➡️
                                            Enviado para:</span>
                                        <span class="invite-type" v-else>⬅️ Recebido de:</span>
                                        <span class="invite-email">{{ invite.fromUserId === authStore.userId ?
                                            invite.toUserEmail : invite.fromUserEmail }}</span>
                                    </div>
                                    <button
                                        v-if="invite.toUserEmail.toLowerCase() === authStore.userEmail?.toLowerCase()"
                                        class="btn-review" @click="handleReviewInvite(invite)">
                                        Ver
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Divider -->
                        <div class="divider"></div>

                        <!-- Manage Shared Budgets Section -->
                        <div v-if="hasActiveSharing" class="action-section manage-budgets-section">
                            <h3>Gerenciar Budgets Compartilhados</h3>
                            <p class="section-description">Escolha quais budgets você quer compartilhar</p>

                            <div class="budgets-list">
                                <label v-for="budget in myBudgets" :key="budget.id" class="budget-checkbox">
                                    <input type="checkbox" :checked="isBudgetShared(budget.id)"
                                        @change="toggleBudgetSharing(budget.id)" />
                                    <span class="checkbox-custom"></span>
                                    <span class="budget-label">
                                        <span class="budget-name">{{ budget.name }}</span>
                                        <span class="budget-value">R$ {{ budget.totalValue.toFixed(2) }}</span>
                                    </span>
                                </label>
                            </div>

                            <button class="btn-update-sharing" @click="updateSharing" :disabled="isUpdating">
                                <span v-if="isUpdating">Atualizando...</span>
                                <span v-else>Atualizar Compartilhamento</span>
                            </button>

                            <Transition name="fade">
                                <div v-if="updateSuccess" class="share-message success">
                                    ✓ Compartilhamento atualizado!
                                </div>
                            </Transition>
                            <Transition name="fade">
                                <div v-if="updateError" class="share-message error">
                                    ⚠️ {{ updateError }}
                                </div>
                            </Transition>
                        </div>

                        <!-- Divider -->
                        <div class="divider"></div>

                        <!-- Logout Button -->
                        <button class="action-button logout" @click="$emit('logout')">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Sair da Conta
                        </button>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- Modal de confirmação para remover compartilhamento -->
        <ConfirmModal
            :show="showRemoveShareConfirm"
            title="Remover Compartilhamento"
            :message="`Deseja <strong>remover o compartilhamento</strong> com <strong>${emailToRemove}</strong>?`"
            type="warning"
            confirm-text="Remover"
            confirm-icon="🔗"
            @confirm="confirmRemoveShare"
            @cancel="cancelRemoveShare"
        />
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useAuthStore } from '@/stores/auth'
import ConfirmModal from './ConfirmModal.vue'

const props = defineProps<{
    show: boolean
    email: string
}>()

const emit = defineEmits<{
    close: []
    logout: []
    reviewInvite: [invite: any]
}>()

const budgetStore = useBudgetStore()
const authStore = useAuthStore()

const shareEmail = ref('')
const isSharing = ref(false)
const shareSuccess = ref(false)
const shareError = ref('')

// Estado para gerenciamento de budgets compartilhados
const selectedBudgetIds = ref<Set<string>>(new Set())
const isUpdating = ref(false)
const updateSuccess = ref(false)
const updateError = ref('')
const showRemoveShareConfirm = ref(false)
const emailToRemove = ref('')

// Compartilhamentos ativos (convites aceitos)
const activeShares = computed(() => {
    const shares: { email: string, budgetCount: number }[] = []

    // Convites que EU enviei e foram aceitos
    budgetStore.shareInvites
        .filter(invite => invite.fromUserId === authStore.userId && invite.status === 'accepted')
        .forEach(invite => {
            shares.push({
                email: invite.toUserEmail,
                budgetCount: invite.budgetIds.length
            })
        })

    return shares
})

// Convites pendentes
const pendingInvites = computed(() => {
    return budgetStore.shareInvites.filter(invite =>
        invite.status === 'pending' &&
        (invite.fromUserId === authStore.userId ||
            invite.toUserEmail.toLowerCase() === authStore.userEmail?.toLowerCase())
    )
})

// Lista de emails com quem está compartilhado (LEGADO - mantido para compatibilidade)
const sharedWith = computed(() => {
    return activeShares.value.map(share => share.email)
})

// Meus budgets
const myBudgets = computed(() => {
    return budgetStore.budgets.filter(b => b.ownerId === authStore.userId)
})

// Verificar se tem compartilhamento ativo
const hasActiveSharing = computed(() => {
    // Se tem convites aceitos onde eu sou o remetente ou destinatário
    return budgetStore.shareInvites.some(invite =>
        invite.status === 'accepted' &&
        (invite.fromUserId === authStore.userId || invite.toUserEmail.toLowerCase() === authStore.userEmail?.toLowerCase())
    )
})

// Inicializar budgets selecionados com os que já estão compartilhados
const initializeSelectedBudgets = () => {
    selectedBudgetIds.value.clear()

    // Buscar convites aceitos onde eu sou o remetente
    const myInvites = budgetStore.shareInvites.filter(invite =>
        invite.fromUserId === authStore.userId &&
        invite.status === 'accepted'
    )

    myInvites.forEach(invite => {
        invite.budgetIds.forEach(id => selectedBudgetIds.value.add(id))
    })
}

// Verificar se um budget está compartilhado
const isBudgetShared = (budgetId: string) => {
    return selectedBudgetIds.value.has(budgetId)
}

// Toggle compartilhamento de um budget
const toggleBudgetSharing = (budgetId: string) => {
    if (selectedBudgetIds.value.has(budgetId)) {
        selectedBudgetIds.value.delete(budgetId)
    } else {
        selectedBudgetIds.value.add(budgetId)
    }
}

// Inicializar quando o modal abre
const initializeModal = () => {
    if (props.show && hasActiveSharing.value) {
        initializeSelectedBudgets()
    }
}

// Watch para inicializar quando abre
import { watch } from 'vue'
watch(() => props.show, () => {
    if (props.show) {
        initializeModal()
    }
})

const handleShare = async () => {
    if (!shareEmail.value) return

    shareError.value = ''
    shareSuccess.value = false
    isSharing.value = true

    try {
        // Enviar convite com todos os budgets do usuário
        const myBudgetIds = budgetStore.budgets
            .filter(b => b.ownerId === authStore.userId)
            .map(b => b.id)

        if (myBudgetIds.length === 0) {
            throw new Error('Você não tem budgets para compartilhar')
        }

        await budgetStore.sendShareInvite(shareEmail.value, myBudgetIds)

        shareSuccess.value = true
        shareEmail.value = ''

        setTimeout(() => {
            shareSuccess.value = false
        }, 3000)
    } catch (error: any) {
        shareError.value = error.message || 'Erro ao enviar convite'
        setTimeout(() => {
            shareError.value = ''
        }, 5000)
    } finally {
        isSharing.value = false
    }
}

const handleRemoveShare = async (email: string) => {
    emailToRemove.value = email
    showRemoveShareConfirm.value = true
}

const confirmRemoveShare = async () => {
    try {
        // TODO: Implementar remoção de compartilhamento
        console.log('Remover compartilhamento com:', emailToRemove.value)
    } catch (error) {
        console.error('Erro ao remover compartilhamento:', error)
    }
    emailToRemove.value = ''
    showRemoveShareConfirm.value = false
}

const cancelRemoveShare = () => {
    emailToRemove.value = ''
    showRemoveShareConfirm.value = false
}

const handleReviewInvite = (invite: any) => {
    emit('reviewInvite', invite)
}

const updateSharing = async () => {
    updateError.value = ''
    updateSuccess.value = false
    isUpdating.value = true

    try {
        const budgetIds = Array.from(selectedBudgetIds.value)

        if (budgetIds.length === 0) {
            throw new Error('Selecione pelo menos um budget para compartilhar')
        }

        await budgetStore.updateSharedBudgets(budgetIds)

        updateSuccess.value = true
        setTimeout(() => {
            updateSuccess.value = false
        }, 3000)
    } catch (error: any) {
        updateError.value = error.message || 'Erro ao atualizar compartilhamento'
        setTimeout(() => {
            updateError.value = ''
        }, 5000)
    } finally {
        isUpdating.value = false
    }
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
    justify-content: center;
    align-items: center;
    z-index: 2000;
    padding: 20px;
}

.modal-content {
    background: white;
    border-radius: 20px;
    max-width: 400px;
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
    margin: 0;
    font-size: 20px;
    color: #333;
}

.close-button {
    background: none;
    border: none;
    font-size: 28px;
    color: #999;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
}

.close-button:hover {
    background-color: #f5f5f5;
    color: #666;
}

.profile-body {
    padding: 24px;
    overflow-y: auto;
}

.user-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    margin-bottom: 24px;
    padding: 30px 20px;
}

.user-info {
    width: 100%;
}

.user-email {
    font-size: 16px;
    font-weight: 500;
    color: #333;
    margin: 0;
    word-break: break-word;
}

.divider {
    height: 1px;
    background: #e0e0e0;
    margin: 24px 0;
}

.action-section h3 {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin: 0 0 8px 0;
}

.section-description {
    font-size: 14px;
    color: #666;
    margin: 0 0 16px 0;
    line-height: 1.4;
}

.share-section {
    margin-bottom: 0;
}

.share-input-group {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
}

.share-input {
    flex: 1;
    padding: 10px 14px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 14px;
    transition: border-color 0.3s;
}

.share-input:focus {
    outline: none;
    border-color: #1ec8b0;
}

.btn-share {
    padding: 8px 12px;
    background: linear-gradient(135deg, #1ec8b0 0%, #2764e7 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: normal;
    line-height: 1.3;
    min-width: 60px;
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-share:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(30, 200, 176, 0.3);
}

.btn-share:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.share-message {
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    margin-bottom: 12px;
}

.share-message.success {
    background: #e8f5e9;
    color: #2e7d32;
}

.share-message.error {
    background: #ffebee;
    color: #c62828;
}

.shared-list {
    margin-top: 16px;
}

.shared-label {
    font-size: 13px;
    color: #666;
    margin: 0 0 8px 0;
    font-weight: 500;
}

.shared-user {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: #f5f5f5;
    border-radius: 8px;
    margin-bottom: 6px;
    font-size: 14px;
    color: #333;
}

.share-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.share-email {
    font-size: 14px;
    font-weight: 500;
    color: #333;
}

.share-status {
    font-size: 12px;
    color: #666;
}

.pending-invites {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e0e0e0;
}

.pending-invite {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: #fff3e0;
    border-radius: 8px;
    margin-bottom: 6px;
}

.invite-info {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
}

.invite-type {
    font-size: 14px;
}

.invite-email {
    font-size: 14px;
    font-weight: 500;
    color: #333;
}

.btn-review {
    padding: 6px 14px;
    background: linear-gradient(135deg, #1ec8b0 0%, #2764e7 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-review:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(30, 200, 176, 0.3);
}

.btn-remove {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: #999;
    transition: color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.btn-remove:hover {
    color: #e53935;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* Manage Budgets Section */
.manage-budgets-section {
    margin-bottom: 0;
}

.budgets-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
    max-height: 300px;
    overflow-y: auto;
}

.budget-checkbox {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #f9f9f9;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s;
    user-select: none;
}

.budget-checkbox:hover {
    background: #f0f0f0;
}

.budget-checkbox input[type="checkbox"] {
    display: none;
}

.checkbox-custom {
    width: 20px;
    height: 20px;
    border: 2px solid #ddd;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
}

.budget-checkbox input[type="checkbox"]:checked+.checkbox-custom {
    background: linear-gradient(135deg, #1ec8b0 0%, #2764e7 100%);
    border-color: #1ec8b0;
}

.budget-checkbox input[type="checkbox"]:checked+.checkbox-custom::after {
    content: '✓';
    color: white;
    font-size: 14px;
    font-weight: bold;
}

.budget-label {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.budget-name {
    font-size: 14px;
    font-weight: 500;
    color: #333;
}

.budget-value {
    font-size: 14px;
    color: #666;
    font-weight: 500;
}

.btn-update-sharing {
    width: 100%;
    padding: 12px;
    background: linear-gradient(135deg, #1ec8b0 0%, #2764e7 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 12px;
}

.btn-update-sharing:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(30, 200, 176, 0.3);
}

.btn-update-sharing:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.action-button {
    width: 100%;
    padding: 14px 20px;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: all 0.2s;
}

.action-button.share {
    background: linear-gradient(135deg, #1ec8b0 0%, #2764e7 100%);
    color: white;
}

.action-button.share:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(30, 200, 176, 0.3);
}

.action-button.logout {
    background: #f5f5f5;
    color: #e53935;
}

.action-button.logout:hover {
    background: #ffe5e5;
}

.action-button:active {
    transform: scale(0.98);
}

.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
    transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
    transform: scale(0.9) translateY(20px);
}
</style>
