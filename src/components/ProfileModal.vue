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

                        <!-- Subscription / Premium Section -->
                        <div class="action-section subscription-section">
                            <h3>👑 Minha Conta</h3>

                            <div class="subscription-card" :class="{ premium: subscriptionStore.isPremium }">
                                <div class="subscription-header">
                                    <div class="plan-badge" :class="subscriptionStore.currentPlan">
                                        {{ subscriptionStore.isPremium ? '👑 Premium' : '🆓 Gratuito' }}
                                    </div>
                                    <div v-if="subscriptionStore.isPremium && subscriptionStore.premiumDaysRemaining > 0"
                                        class="days-remaining">
                                        {{ subscriptionStore.premiumDaysRemaining }} dias restantes
                                    </div>
                                </div>

                                <div class="subscription-features">
                                    <div class="feature-row">
                                        <span>Orçamentos</span>
                                        <span class="feature-value">
                                            {{ subscriptionStore.isPremium ? 'Ilimitados ♾️' : 'Até 10' }}
                                        </span>
                                    </div>
                                    <div class="feature-row">
                                        <span>Compartilhamento</span>
                                        <span class="feature-value" :class="{ locked: !subscriptionStore.canShare }">
                                            {{ subscriptionStore.canShare ? '✅ Ativo' : '🔒 Premium' }}
                                        </span>
                                    </div>
                                    <div class="feature-row">
                                        <span>Captura automática</span>
                                        <span class="feature-value"
                                            :class="{ locked: !subscriptionStore.canUseAutoNotifications }">
                                            {{ subscriptionStore.canUseAutoNotifications ? '✅ Ativo' : '🔒 Premium' }}
                                        </span>
                                    </div>
                                </div>

                                <div v-if="!subscriptionStore.isPremium" class="upgrade-cta">
                                    <button class="btn-upgrade" @click="emit('showPremiumModal')">
                                        ⭐ Seja Premium por R$ {{ PREMIUM_PRICE.toFixed(2).replace('.', ',') }}/mês
                                    </button>
                                </div>

                                <!-- Botão de sincronização após pagamento (só mostra se não for premium) -->
                                <div v-if="!subscriptionStore.isPremium" class="sync-subscription">
                                    <button class="btn-sync" @click="handleSyncSubscription"
                                        :disabled="isSyncingSubscription">
                                        <span v-if="isSyncingSubscription">🔄 Sincronizando...</span>
                                        <span v-else>🔄 Sincronizar Assinatura</span>
                                    </button>
                                    <p class="sync-hint">Fez pagamento mas ainda aparece como gratuito?</p>
                                    <Transition name="fade">
                                        <div v-if="syncResult" class="sync-result"
                                            :class="{ success: syncResult.includes('✅'), error: syncResult.includes('❌') }">
                                            {{ syncResult }}
                                        </div>
                                    </Transition>
                                </div>
                            </div>

                            <!-- Referral Section -->
                            <div class="referral-card" @click="emit('showReferralModal')">
                                <div class="referral-icon">🎁</div>
                                <div class="referral-info">
                                    <strong>Indique amigos e ganhe!</strong>
                                    <span>{{ subscriptionStore.activeReferralsCount }} indicações ativas</span>
                                </div>
                                <div class="referral-bonus" v-if="subscriptionStore.subscription?.referralBonusMonths">
                                    +{{ subscriptionStore.subscription.referralBonusMonths }} meses
                                </div>
                                <div class="referral-arrow">›</div>
                            </div>
                        </div>

                        <!-- Divider -->
                        <div class="divider"></div>

                        <!-- Share Section -->
                        <div class="action-section share-section">
                            <h3>Compartilhamento</h3>

                            <!-- Status do compartilhamento -->
                            <div v-if="shareStatus.type !== 'none'" class="share-status-box" :class="shareStatus.type">
                                <div class="status-icon">
                                    <span v-if="shareStatus.type === 'waiting'">⏳</span>
                                    <span v-else-if="shareStatus.type === 'active'">✅</span>
                                    <span v-else-if="shareStatus.type === 'rejected'">❌</span>
                                </div>
                                <div class="status-content">
                                    <p class="status-title">{{ shareStatus.title }}</p>
                                    <p class="status-email">{{ shareStatus.email }}</p>
                                </div>
                                <button v-if="shareStatus.type === 'rejected'" class="btn-clear-status"
                                    @click="clearRejectedInvite">
                                    Entendi
                                </button>
                                <button v-if="shareStatus.type === 'waiting'" class="btn-cancel-invite"
                                    @click="handleCancelInvite">
                                    Cancelar
                                </button>
                            </div>

                            <!-- Campo de email para novo convite (só mostra se não tem compartilhamento ativo) -->
                            <div v-if="!hasActiveSharing && shareStatus.type !== 'waiting'" class="share-input-section">
                                <p class="section-description">Compartilhe budgets e valor total com seu
                                    cônjuge/parceiro(a)</p>
                                <div class="share-input-group mt-1">
                                    <input v-model="shareEmail" type="email" placeholder="email@exemplo.com"
                                        class="share-input" />
                                    <button class="btn-share" @click="handleShare" :disabled="!shareEmail || isSharing">
                                        <span v-if="isSharing">Enviando...</span>
                                        <span v-else>Enviar<br>Convite</span>
                                    </button>
                                </div>
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

                            <!-- Convites pendentes que EU RECEBI -->
                            <div v-if="receivedPendingInvites.length > 0" class="pending-invites">
                                <p class="shared-label">Convites Recebidos:</p>
                                <div v-for="invite in receivedPendingInvites" :key="invite.id"
                                    class="pending-invite received">
                                    <div class="invite-info">
                                        <span class="invite-from">{{ invite.fromUserEmail }}</span>
                                        <span class="invite-count">{{ invite.budgetIds.length }} budget{{
                                            invite.budgetIds.length > 1 ? 's' : '' }}</span>
                                    </div>
                                    <button class="btn-review" @click="handleReviewInvite(invite)">
                                        Ver Convite
                                    </button>
                                </div>
                            </div>

                            <!-- Opção para desfazer compartilhamento ativo -->
                            <div v-if="hasActiveSharing" class="active-share-actions">
                                <button class="btn-remove-share" @click="handleRemoveShare(shareStatus.email)">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                                        fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                    Encerrar Compartilhamento
                                </button>
                            </div>
                        </div>

                        <!-- Divider -->
                        <div class="divider"></div>

                        <!-- Manage Shared Budgets Section - Para ambos os participantes -->
                        <div v-if="hasActiveSharing" class="action-section manage-budgets-section">
                            <h3>Gerenciar Budgets Compartilhados</h3>
                            <div class="section-header">
                                <p class="section-description">Escolha quais dos SEUS budgets você quer compartilhar</p>
                                <button type="button" class="btn-select-all" @click="toggleSelectAllBudgets">
                                    {{ allBudgetsSelected ? '❌ Desmarcar' : '✅ Selecionar todos' }}
                                </button>
                            </div>

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

                        <!-- Terms and Legal Section -->
                        <div class="action-section legal-section">
                            <h3>📜 Legal</h3>
                            <div class="legal-links">
                                <button class="legal-link" @click="emit('showTermsModal')">
                                    <span>Termos de Uso e Privacidade</span>
                                    <span class="link-arrow">›</span>
                                </button>
                                <div class="terms-accepted-info" v-if="subscriptionStore.termsAcceptedAt">
                                    ✅ Aceito em {{ new
                                        Date(subscriptionStore.termsAcceptedAt).toLocaleDateString('pt-BR') }}
                                    <span class="terms-version">(v{{ TERMS_VERSION }})</span>
                                </div>
                            </div>
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
        <ConfirmModal :show="showRemoveShareConfirm" title="Remover Compartilhamento"
            :message="`Deseja <strong>remover o compartilhamento</strong> com <strong>${emailToRemove}</strong>?`"
            type="warning" confirm-text="Remover" confirm-icon="🔗" @confirm="confirmRemoveShare"
            @cancel="cancelRemoveShare" />
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBudgetStore } from '@/stores/budget'
import { useAuthStore } from '@/stores/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { PREMIUM_PRICE, TERMS_VERSION } from '@/types/budget'
import ConfirmModal from './ConfirmModal.vue'
import { stripeService } from '@/services/StripeService'

const props = defineProps<{
    show: boolean
    email: string
}>()

const emit = defineEmits<{
    close: []
    logout: []
    reviewInvite: [invite: any]
    requirePremium: [feature: 'sharing' | 'autoNotifications']
    showPremiumModal: []
    showReferralModal: []
    showTermsModal: []
}>()

const budgetStore = useBudgetStore()
const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()

const shareEmail = ref('')
const isSharing = ref(false)
const shareSuccess = ref(false)
const shareError = ref('')

// Estado para sincronização de assinatura
const isSyncingSubscription = ref(false)
const syncResult = ref<string>('')

// Estado para gerenciamento de budgets compartilhados
const selectedBudgetIds = ref<Set<string>>(new Set())
const isUpdating = ref(false)
const updateSuccess = ref(false)
const updateError = ref('')
const showRemoveShareConfirm = ref(false)
const emailToRemove = ref('')

// Status consolidado do compartilhamento
const shareStatus = computed(() => {
    // 1. Verifica se há convite rejeitado não notificado (prioridade)
    const rejectedInvite = budgetStore.shareInvites.find(invite =>
        invite.fromUserId === authStore.userId &&
        invite.status === 'rejected' &&
        !invite.senderNotifiedAt
    )
    if (rejectedInvite) {
        return {
            type: 'rejected' as const,
            title: 'Convite recusado por',
            email: rejectedInvite.toUserEmail
        }
    }

    // 2. Verifica se há compartilhamento ativo
    const acceptedInvite = budgetStore.shareInvites.find(invite =>
        invite.status === 'accepted' &&
        (invite.fromUserId === authStore.userId || invite.toUserEmail.toLowerCase() === authStore.userEmail?.toLowerCase())
    )
    if (acceptedInvite) {
        const partnerEmail = acceptedInvite.fromUserId === authStore.userId
            ? acceptedInvite.toUserEmail
            : acceptedInvite.fromUserEmail
        return {
            type: 'active' as const,
            title: 'Compartilhando com',
            email: partnerEmail
        }
    }

    // 3. Verifica se há convite pendente que EU ENVIEI
    const pendingInvite = budgetStore.shareInvites.find(invite =>
        invite.fromUserId === authStore.userId &&
        invite.status === 'pending'
    )
    if (pendingInvite) {
        return {
            type: 'waiting' as const,
            title: 'Aguardando resposta de',
            email: pendingInvite.toUserEmail
        }
    }

    return { type: 'none' as const, title: '', email: '' }
})

// Convites pendentes que EU RECEBI (para mostrar botão "Ver Convite")
const receivedPendingInvites = computed(() => {
    return budgetStore.shareInvites.filter(invite =>
        invite.status === 'pending' &&
        invite.toUserEmail.toLowerCase() === authStore.userEmail?.toLowerCase()
    )
})

// Compartilhamentos ativos (convites aceitos) - mantido para compatibilidade
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

// Convites pendentes (todos) - mantido para compatibilidade
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

// Verificar se sou o DONO do compartilhamento (quem enviou o convite)
// Apenas o dono pode gerenciar quais budgets compartilhar
const isShareOwner = computed(() => {
    return budgetStore.shareInvites.some(invite =>
        invite.fromUserId === authStore.userId && invite.status === 'accepted'
    )
})

// Inicializar budgets selecionados com os que já estão compartilhados
// Obter o ID do parceiro de compartilhamento
const partnerId = computed(() => {
    const acceptedInvite = budgetStore.shareInvites.find(invite =>
        invite.status === 'accepted' &&
        (invite.fromUserId === authStore.userId ||
            invite.toUserEmail.toLowerCase() === authStore.userEmail?.toLowerCase())
    )
    if (!acceptedInvite) return null
    return acceptedInvite.fromUserId === authStore.userId
        ? acceptedInvite.toUserId
        : acceptedInvite.fromUserId
})

const initializeSelectedBudgets = () => {
    selectedBudgetIds.value.clear()

    // Buscar meus budgets que já estão compartilhados com o parceiro
    if (partnerId.value) {
        myBudgets.value.forEach(budget => {
            if (budget.sharedWith?.includes(partnerId.value!)) {
                selectedBudgetIds.value.add(budget.id)
            }
        })
    }
}

// Verificar se todos os budgets estão selecionados
const allBudgetsSelected = computed(() => {
    return myBudgets.value.length > 0 && selectedBudgetIds.value.size === myBudgets.value.length
})

// Toggle selecionar/desmarcar todos os budgets
const toggleSelectAllBudgets = () => {
    if (allBudgetsSelected.value) {
        // Desmarcar todos
        selectedBudgetIds.value.clear()
    } else {
        // Selecionar todos
        myBudgets.value.forEach(budget => {
            selectedBudgetIds.value.add(budget.id)
        })
    }
}

// Verificar se um budget está compartilhado
const isBudgetShared = (budgetId: string) => {
    return selectedBudgetIds.value.has(budgetId)
}

// Sincronizar assinatura do Stripe
const handleSyncSubscription = async () => {
    isSyncingSubscription.value = true
    syncResult.value = ''

    try {
        const result = await stripeService.syncSubscription()

        if (result.isPremium) {
            syncResult.value = '✅ Assinatura ativada! Você agora é Premium!'
            // Recarrega a subscription para atualizar a UI
            await subscriptionStore.loadSubscription()
        } else if (result.subscription) {
            syncResult.value = `ℹ️ Status: ${result.subscription.status}`
        } else {
            syncResult.value = '❌ Nenhuma assinatura encontrada no Stripe'
        }

        setTimeout(() => {
            syncResult.value = ''
        }, 5000)
    } catch (error: any) {
        syncResult.value = `❌ Erro: ${error.message || 'Falha na sincronização'}`
        setTimeout(() => {
            syncResult.value = ''
        }, 5000)
    } finally {
        isSyncingSubscription.value = false
    }
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

    // Verifica se tem permissão premium para compartilhar
    if (!subscriptionStore.canShare) {
        emit('requirePremium', 'sharing')
        emit('close')
        return
    }

    shareError.value = ''
    shareSuccess.value = false
    isSharing.value = true

    try {
        // Enviar convite com todos os budgets do usuário (pode ser vazio)
        const myBudgetIds = budgetStore.budgets
            .filter(b => b.ownerId === authStore.userId)
            .map(b => b.id)

        // Permite criar vínculo mesmo sem budgets
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
    console.log('[REMOVE_SHARE] Clicou em remover, email:', email)
    emailToRemove.value = email
    showRemoveShareConfirm.value = true
    console.log('[REMOVE_SHARE] showRemoveShareConfirm:', showRemoveShareConfirm.value)
}

const confirmRemoveShare = async () => {
    console.log('[REMOVE_SHARE] Confirmou remover, email:', emailToRemove.value)
    try {
        await budgetStore.removeSharing(emailToRemove.value)
        console.log('[REMOVE_SHARE] Removido com sucesso')
    } catch (error) {
        console.error('[REMOVE_SHARE] Erro ao remover compartilhamento:', error)
    }
    emailToRemove.value = ''
    showRemoveShareConfirm.value = false
}

const cancelRemoveShare = () => {
    emailToRemove.value = ''
    showRemoveShareConfirm.value = false
}

// Limpar convite rejeitado (marcar como notificado)
const clearRejectedInvite = async () => {
    const rejectedInvite = budgetStore.shareInvites.find(invite =>
        invite.fromUserId === authStore.userId &&
        invite.status === 'rejected' &&
        !invite.senderNotifiedAt
    )
    if (rejectedInvite) {
        await budgetStore.markInviteSenderNotified(rejectedInvite.id)
    }
}

// Cancelar convite pendente que EU ENVIEI
const handleCancelInvite = async () => {
    const pendingInvite = budgetStore.shareInvites.find(invite =>
        invite.fromUserId === authStore.userId &&
        invite.status === 'pending'
    )
    if (pendingInvite) {
        try {
            await budgetStore.cancelShareInvite(pendingInvite.id)
        } catch (error) {
            console.error('Erro ao cancelar convite:', error)
            shareError.value = 'Erro ao cancelar convite'
            setTimeout(() => {
                shareError.value = ''
            }, 3000)
        }
    }
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
    margin: 0;
    line-height: 1.4;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    gap: 8px;
}

.btn-select-all {
    padding: 6px 12px;
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.btn-select-all:hover {
    background: #e8e8e8;
    border-color: #ccc;
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
    flex-direction: column;
    padding: 10px 12px;
    background: #fff3e0;
    border-radius: 8px;
    margin-bottom: 6px;
    gap: 8px;
}

.invite-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    flex: 1;
    min-width: 0;
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
    padding: 6px 12px;
    background: linear-gradient(135deg, #1ec8b0 0%, #2764e7 100%);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    white-space: nowrap;
    align-self: flex-end;
}

@media (max-width: 360px) {
    .pending-invite {
        flex-direction: column;
        align-items: stretch;
    }

    .pending-invite .btn-review {
        width: 100%;
        text-align: center;
        margin-top: 4px;
    }
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

/* Share Status Box */
.share-status-box {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border-radius: 12px;
    margin-bottom: 16px;
}

.share-status-box.waiting {
    background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
    border: 1px solid #ffb74d;
}

.share-status-box.active {
    background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
    border: 1px solid #81c784;
}

.share-status-box.rejected {
    background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
    border: 1px solid #e57373;
}

.status-icon {
    font-size: 24px;
    flex-shrink: 0;
}

.status-content {
    flex: 1;
    min-width: 0;
    overflow: hidden;
}

.status-title {
    font-size: 11px;
    color: #666;
    margin: 0 0 2px 0;
}

.status-email {
    font-size: 13px;
    font-weight: 600;
    color: #333;
    margin: 0;
    word-break: break-all;
}

.btn-clear-status {
    padding: 6px 12px;
    background: white;
    border: 1px solid #e57373;
    color: #c62828;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    white-space: nowrap;
}

.btn-clear-status:hover {
    background: #ffebee;
}

.btn-cancel-invite {
    padding: 6px 12px;
    background: white;
    border: 1px solid #ffb74d;
    color: #f57c00;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
    white-space: nowrap;
}

.btn-cancel-invite:hover {
    background: #fff3e0;
    border-color: #ff9800;
}

/* Responsivo para status box */
@media (max-width: 360px) {
    .share-status-box {
        flex-direction: column;
        align-items: flex-start;
    }

    .share-status-box .btn-clear-status {
        width: 100%;
        margin-top: 8px;
    }
}

.share-input-section {
    margin-bottom: 16px;
}

.pending-invite.received {
    background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
    border: 1px solid #64b5f6;
}

.pending-invite .invite-from {
    font-size: 13px;
    font-weight: 500;
    color: #333;
    word-break: break-all;
}

.pending-invite .invite-count {
    font-size: 11px;
    color: #666;
}

.active-share-actions {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e0e0e0;
}

.btn-remove-share {
    width: 100%;
    padding: 12px;
    background: #fff;
    border: 1px solid #e57373;
    color: #c62828;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s;
}

.btn-remove-share:hover {
    background: #ffebee;
}

/* Dark mode - usando body.dark-mode como padrão do app */
body.dark-mode .modal-content {
    background: #1e1e2e;
}

body.dark-mode .profile-header {
    background: linear-gradient(135deg, #1a3a5c 0%, #0f2336 100%);
}

body.dark-mode .profile-header h2 {
    color: #fff;
}

body.dark-mode .profile-header p {
    color: #aaa;
}

body.dark-mode .action-section h3 {
    color: #fff;
}

body.dark-mode .section-description {
    color: #aaa;
}

body.dark-mode .btn-select-all {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #ccc;
}

body.dark-mode .btn-select-all:hover {
    background: #3a3a4e;
    border-color: #4a4a5e;
}

body.dark-mode .share-input {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #fff;
}

body.dark-mode .share-input::placeholder {
    color: #666;
}

body.dark-mode .divider {
    background: #3a3a4e;
}

body.dark-mode .share-status-box.waiting {
    background: linear-gradient(135deg, #3a3020 0%, #4a4030 100%);
    border-color: #8a6030;
}

body.dark-mode .share-status-box.active {
    background: linear-gradient(135deg, #1a3a20 0%, #2a4a30 100%);
    border-color: #4a8a50;
}

body.dark-mode .share-status-box.rejected {
    background: linear-gradient(135deg, #3a2020 0%, #4a2a2a 100%);
    border-color: #8a4040;
}

body.dark-mode .status-title {
    color: #aaa;
}

body.dark-mode .status-email {
    color: #fff;
}

body.dark-mode .pending-invite.received {
    background: linear-gradient(135deg, #1a2a3a 0%, #2a3a4a 100%);
    border-color: #3a5a7a;
}

body.dark-mode .invite-from {
    color: #fff;
}

body.dark-mode .invite-count {
    color: #aaa;
}

body.dark-mode .shared-label {
    color: #aaa;
}

body.dark-mode .btn-remove-share {
    background: #3a2020;
    border-color: #5a3a3a;
    color: #ff7070;
}

body.dark-mode .btn-remove-share:hover {
    background: #4a2a2a;
}

body.dark-mode .active-share-actions {
    border-top-color: #3a3a4e;
}

body.dark-mode .pending-invites {
    border-top-color: #3a3a4e;
}

body.dark-mode .btn-danger {
    background: #3a2020;
    color: #ff7070;
}

body.dark-mode .btn-danger:hover {
    background: #4a2a2a;
}

/* Subscription Section Styles */
.subscription-section {
    margin-bottom: 0;
}

.subscription-card {
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 16px;
    padding: 20px;
    border: 2px solid #e0e0e0;
    margin-bottom: 16px;
}

.subscription-card.premium {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-color: #ffd700;
}

.subscription-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.plan-badge {
    padding: 6px 14px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 600;
}

.plan-badge.free {
    background: #e9ecef;
    color: #495057;
}

.plan-badge.premium {
    background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%);
    color: #333;
}

.days-remaining {
    font-size: 12px;
    color: #888;
}

.subscription-card.premium .days-remaining {
    color: #aaa;
}

.subscription-features {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
}

.feature-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    color: #555;
}

.subscription-card.premium .feature-row {
    color: #ccc;
}

.feature-value {
    font-weight: 500;
    color: #333;
}

.subscription-card.premium .feature-value {
    color: #fff;
}

.feature-value.locked {
    color: #999;
}

.upgrade-cta {
    margin-top: 16px;
}

.btn-upgrade {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.btn-upgrade:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

/* Sync Subscription */
.sync-subscription {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    text-align: center;
}

.btn-sync {
    width: 100%;
    padding: 12px;
    background: #f5f5f5;
    color: #666;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-sync:hover {
    background: #e8e8e8;
}

.btn-sync:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.sync-hint {
    font-size: 11px;
    color: #999;
    margin: 8px 0 0 0;
}

.sync-result {
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
}

.sync-result.success {
    background: #e8f5e9;
    color: #2e7d32;
}

.sync-result.error {
    background: #ffebee;
    color: #c62828;
}

.referral-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
    border: 1px solid #ffc107;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
}

.referral-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
}

.referral-icon {
    font-size: 28px;
}

.referral-info {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.referral-info strong {
    font-size: 14px;
    color: #333;
}

.referral-info span {
    font-size: 12px;
    color: #856404;
}

.referral-bonus {
    background: #38a169;
    color: white;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
}

.referral-arrow {
    font-size: 20px;
    color: #856404;
}

/* Legal Section Styles */
.legal-section {
    margin-bottom: 0;
}

.legal-links {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.legal-link {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    background: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 10px;
    cursor: pointer;
    font-size: 14px;
    color: #333;
    transition: all 0.2s;
}

.legal-link:hover {
    background: #e9ecef;
}

.link-arrow {
    font-size: 18px;
    color: #888;
}

.terms-accepted-info {
    font-size: 12px;
    color: #28a745;
    padding: 8px 12px;
    background: rgba(40, 167, 69, 0.1);
    border-radius: 6px;
}

.terms-version {
    color: #888;
    margin-left: 4px;
}

/* Dark mode for new sections */
body.dark-mode .subscription-card {
    background: linear-gradient(135deg, #2a2a3e 0%, #1e1e2e 100%);
    border-color: #3a3a4e;
}

body.dark-mode .subscription-card.premium {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-color: #ffd700;
}

body.dark-mode .plan-badge.free {
    background: #3a3a4e;
    color: #ccc;
}

body.dark-mode .feature-row {
    color: #aaa;
}

body.dark-mode .feature-value {
    color: #fff;
}

body.dark-mode .referral-card {
    background: linear-gradient(135deg, #3a3020 0%, #4a4030 100%);
    border-color: #8a6030;
}

body.dark-mode .referral-info strong {
    color: #fff;
}

body.dark-mode .referral-info span {
    color: #cca;
}

body.dark-mode .referral-arrow {
    color: #cca;
}

body.dark-mode .legal-link {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #ccc;
}

body.dark-mode .legal-link:hover {
    background: #3a3a4e;
}

body.dark-mode .link-arrow {
    color: #888;
}

body.dark-mode .terms-accepted-info {
    background: rgba(40, 167, 69, 0.2);
    color: #68d391;
}

body.dark-mode .terms-version {
    color: #888;
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

body.dark-mode .user-email {
    color: #fff;
}

body.dark-mode .share-email {
    color: #fff;
}

body.dark-mode .shared-user {
    color: #e2e8f0;
}

body.dark-mode .share-status {
    color: #aaa;
}

body.dark-mode .invite-email {
    color: #fff;
}

body.dark-mode .budget-name {
    color: #fff;
}

body.dark-mode .budget-value {
    color: #aaa;
}

body.dark-mode .btn-sync {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #aaa;
}

body.dark-mode .btn-sync:hover {
    background: #3a3a4e;
}

body.dark-mode .sync-hint {
    color: #888;
}

body.dark-mode .sync-result.success {
    background: #1a3a2a;
    color: #68d391;
}

body.dark-mode .sync-result.error {
    background: #3a2020;
    color: #ff7070;
}

body.dark-mode .days-remaining {
    color: #aaa;
}
</style>
