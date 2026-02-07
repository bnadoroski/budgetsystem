<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSubscriptionStore } from '@/stores/subscription'
import { useAuthStore } from '@/stores/auth'
import { TERMS_VERSION } from '@/types/budget'

const props = defineProps<{
    show: boolean
    readOnly?: boolean // Quando true, mostra apenas para visualização (já aceitou)
}>()

const emit = defineEmits<{
    close: []
    accepted: []
    rejected: [] // Emitido quando usuário recusa os termos
}>()

const subscriptionStore = useSubscriptionStore()
const authStore = useAuthStore()
const accepted = ref(false)
const isSubmitting = ref(false)

const canAccept = computed(() => accepted.value && !isSubmitting.value)

// Verifica se está em modo somente leitura (já aceitou os termos)
// Usa readOnly prop OU verifica se termsAccepted é true OU se termsAcceptedAt existe
const isReadOnly = computed(() => {
    if (props.readOnly) return true
    if (subscriptionStore.termsAccepted) return true
    // Verifica também o termsAcceptedAt como fallback
    if (subscriptionStore.termsAcceptedAt) return true
    return false
})

const handleAccept = async () => {
    if (!canAccept.value) return

    isSubmitting.value = true
    try {
        const result = await subscriptionStore.acceptTerms()
        if (result?.success) {
            emit('accepted')
            emit('close')
        }
    } finally {
        isSubmitting.value = false
    }
}

const handleReject = async () => {
    // Se recusar os termos, desloga o usuário
    console.log('❌ Usuário recusou os termos - deslogando...')
    await authStore.signOut()
    emit('rejected')
    emit('close')
}

const handleClose = () => {
    emit('close')
}
</script>

<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="show" class="modal-overlay" @click.self="isReadOnly ? handleClose() : null">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>📜 Termos de Uso</h2>
                        <!-- Botão de fechar apenas quando em modo leitura -->
                        <button v-if="isReadOnly" class="close-button" @click="handleClose">×</button>
                        <span v-else class="version">Versão {{ TERMS_VERSION }}</span>
                    </div>

                    <div class="modal-body">
                        <div class="terms-container">
                            <h3>Termos de Uso e Política de Privacidade</h3>
                            <p class="updated-date">Última atualização: Fevereiro de 2026</p>

                            <section>
                                <h4>1. Aceitação dos Termos</h4>
                                <p>
                                    Ao utilizar o aplicativo Budget System ("App"), você concorda com estes Termos de
                                    Uso.
                                    Se você não concordar com qualquer parte destes termos, não utilize o App.
                                </p>
                            </section>

                            <section>
                                <h4>2. Descrição do Serviço</h4>
                                <p>
                                    O Budget System é um aplicativo de controle financeiro pessoal que permite:
                                </p>
                                <ul>
                                    <li>Criar e gerenciar orçamentos pessoais</li>
                                    <li>Registrar despesas e receitas</li>
                                    <li>Acompanhar gastos por categoria</li>
                                    <li>Compartilhar orçamentos com parceiros (recurso Premium)</li>
                                    <li>Capturar automaticamente notificações de gastos (recurso Premium)</li>
                                </ul>
                            </section>

                            <section>
                                <h4>3. Planos e Assinatura</h4>
                                <p><strong>Plano Gratuito:</strong></p>
                                <ul>
                                    <li>Até 10 orçamentos</li>
                                    <li>Histórico de gastos</li>
                                    <li>Grupos de orçamentos</li>
                                </ul>
                                <p><strong>Plano Premium:</strong></p>
                                <ul>
                                    <li><strong>Mensal:</strong> R$ 19,90/mês</li>
                                    <li><strong>Anual:</strong> R$ 159,00/ano (economia de 33%)</li>
                                </ul>
                                <p><strong>Recursos Premium:</strong></p>
                                <ul>
                                    <li>Orçamentos ilimitados</li>
                                    <li>Compartilhamento com parceiros</li>
                                    <li>Captura automática de notificações</li>
                                    <li>Calendário financeiro e análise de gastos</li>
                                    <li>Todos os recursos do plano gratuito</li>
                                </ul>
                            </section>

                            <section>
                                <h4>4. Pagamentos e Cobrança</h4>
                                <p>
                                    Os pagamentos são processados de forma segura através do <strong>Stripe</strong>,
                                    uma plataforma de pagamentos líder mundial. Ao assinar o Premium:
                                </p>
                                <ul>
                                    <li>A cobrança é recorrente (mensal ou anual, conforme escolhido)</li>
                                    <li>Você pode cancelar a qualquer momento pelo Portal do Cliente</li>
                                    <li>Ao cancelar, o acesso Premium continua até o fim do período pago</li>
                                    <li>Não realizamos reembolsos de períodos parciais</li>
                                    <li>O Stripe armazena seus dados de pagamento de forma segura</li>
                                    <li>Não temos acesso aos dados completos do seu cartão</li>
                                </ul>
                            </section>

                            <section>
                                <h4>5. Programa de Indicações</h4>
                                <p>
                                    Ao indicar amigos, você pode ganhar meses gratuitos de Premium:
                                </p>
                                <ul>
                                    <li>Cada indicação validada gera 1 mês grátis de Premium</li>
                                    <li>A indicação é validada quando seu amigo usa o app ativamente por 1 mês
                                        <strong>OU</strong> assina o Premium
                                    </li>
                                    <li>Cada indicação gera apenas <strong>um único bônus</strong> (não renova)</li>
                                    <li>Indicações não validadas após 30 dias expiram automaticamente</li>
                                </ul>
                            </section>

                            <section>
                                <h4>6. Privacidade e Dados</h4>
                                <p>
                                    Respeitamos sua privacidade. Coletamos apenas os dados necessários para o
                                    funcionamento do App:
                                </p>
                                <ul>
                                    <li><strong>Dados de conta:</strong> E-mail e nome para identificação</li>
                                    <li><strong>Dados financeiros:</strong> Orçamentos e transações que você registra
                                    </li>
                                    <li><strong>Dados técnicos:</strong> Tokens de notificação para envio de alertas
                                    </li>
                                    <li><strong>Dados de pagamento:</strong> Processados pelo Stripe (não temos acesso
                                        aos dados do cartão)</li>
                                </ul>
                                <p>
                                    Seus dados financeiros são armazenados de forma segura no Firebase e
                                    <strong>nunca são compartilhados com terceiros</strong> para fins comerciais.
                                </p>
                            </section>

                            <section>
                                <h4>7. Captura de Notificações</h4>
                                <p>
                                    O recurso de captura automática de notificações (Premium):
                                </p>
                                <ul>
                                    <li>Requer permissão explícita do usuário</li>
                                    <li>Lê apenas notificações de apps bancários configurados</li>
                                    <li>Não armazena ou transmite o conteúdo completo das notificações</li>
                                    <li>Extrai apenas valores e informações de transações</li>
                                    <li>Pode ser desativado a qualquer momento nas configurações</li>
                                </ul>
                            </section>

                            <section>
                                <h4>8. Responsabilidades do Usuário</h4>
                                <ul>
                                    <li>Manter a segurança da sua conta</li>
                                    <li>Fornecer informações verdadeiras</li>
                                    <li>Não utilizar o App para fins ilegais</li>
                                    <li>Não tentar burlar ou manipular o sistema</li>
                                </ul>
                            </section>

                            <section>
                                <h4>9. Limitação de Responsabilidade</h4>
                                <p>
                                    O Budget System é uma ferramenta de auxílio ao controle financeiro pessoal.
                                    Não somos responsáveis por decisões financeiras tomadas com base nas
                                    informações do App. Os dados inseridos são de responsabilidade do usuário.
                                </p>
                            </section>

                            <section>
                                <h4>10. Alterações nos Termos</h4>
                                <p>
                                    Podemos atualizar estes termos periodicamente. Alterações significativas
                                    serão notificadas através do App, e você será solicitado a aceitar os
                                    novos termos para continuar utilizando o serviço.
                                </p>
                            </section>

                            <section>
                                <h4>11. Contato</h4>
                                <p>
                                    Em caso de dúvidas sobre estes termos ou sobre o App, entre em contato:
                                </p>
                                <ul>
                                    <li>E-mail: suporte@budgetsystem.app</li>
                                </ul>
                            </section>
                        </div>

                        <!-- Seção de aceitação - apenas quando não é somente leitura -->
                        <div v-if="!isReadOnly" class="acceptance-section">
                            <label class="checkbox-container">
                                <input type="checkbox" v-model="accepted" />
                                <span class="checkmark"></span>
                                <span class="label-text">
                                    Li e aceito os <strong>Termos de Uso</strong> e a
                                    <strong>Política de Privacidade</strong> do Budget System
                                </span>
                            </label>
                        </div>
                    </div>

                    <!-- Footer com botões - apenas quando não é somente leitura -->
                    <div v-if="!isReadOnly" class="modal-footer">
                        <button class="reject-button" @click="handleReject" :disabled="isSubmitting">
                            Não aceito
                        </button>
                        <button class="accept-button" :disabled="!canAccept" @click="handleAccept">
                            {{ isSubmitting ? 'Processando...' : '✓ Aceitar e Continuar' }}
                        </button>
                    </div>

                    <!-- Footer simples para modo leitura -->
                    <div v-else class="modal-footer read-only-footer">
                        <button class="close-read-button" @click="handleClose">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
    padding: 20px;
}

.modal-content {
    background: white;
    border-radius: 16px;
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.modal-header h2 {
    margin: 0;
    font-size: 24px;
    color: #333;
    flex: 1;
}

.version {
    font-size: 12px;
    color: #888;
    background: #f0f0f0;
    padding: 4px 8px;
    border-radius: 4px;
    flex-shrink: 0;
}

.close-button {
    background: none;
    border: none;
    font-size: 28px;
    color: #666;
    cursor: pointer;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    flex-shrink: 0;
}

.close-button:hover {
    background: #f0f0f0;
    color: #333;
}

.modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 0;
}

.terms-container {
    padding: 20px;
    font-size: 14px;
    line-height: 1.6;
    color: #444;
}

.terms-container h3 {
    margin: 0 0 8px 0;
    color: #333;
    font-size: 18px;
}

.updated-date {
    color: #888;
    font-size: 12px;
    margin-bottom: 20px;
}

.terms-container section {
    margin-bottom: 20px;
}

.terms-container h4 {
    margin: 0 0 8px 0;
    color: #555;
    font-size: 15px;
}

.terms-container p {
    margin: 0 0 12px 0;
}

.terms-container ul {
    margin: 8px 0;
    padding-left: 24px;
}

.terms-container li {
    margin-bottom: 6px;
}

.acceptance-section {
    padding: 20px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-top: 1px solid #e0e0e0;
}

.checkbox-container {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
    user-select: none;
}

.checkbox-container input {
    display: none;
}

.checkmark {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border: 2px solid #667eea;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.checkbox-container input:checked+.checkmark {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.checkbox-container input:checked+.checkmark::after {
    content: '✓';
    color: white;
    font-size: 14px;
    font-weight: bold;
}

.label-text {
    font-size: 14px;
    color: #333;
    line-height: 1.4;
}

.label-text strong {
    color: #667eea;
}

.modal-footer {
    padding: 16px 20px;
    border-top: 1px solid #e0e0e0;
    flex-shrink: 0;
    display: flex;
    gap: 12px;
}

.reject-button {
    flex: 1;
    padding: 16px;
    background: #f5f5f5;
    color: #666;
    border: 1px solid #ddd;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
}

.reject-button:hover:not(:disabled) {
    background: #eee;
    color: #333;
}

.reject-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.accept-button {
    flex: 2;
    padding: 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.accept-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

.accept-button:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
}

/* Read-only mode footer */
.read-only-footer {
    justify-content: center;
}

.close-read-button {
    padding: 14px 48px;
    background: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.close-read-button:hover {
    background: #e8e8e8;
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
    transform: scale(0.9) translateY(20px);
}

/* Dark Mode */
body.dark-mode .modal-content {
    background: #1e1e2e;
}

body.dark-mode .modal-header {
    border-bottom-color: #3a3a4e;
}

body.dark-mode .modal-header h2 {
    color: #fff;
}

body.dark-mode .version {
    background: #2a2a3e;
    color: #aaa;
}

body.dark-mode .close-button {
    color: #aaa;
}

body.dark-mode .close-button:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
}

body.dark-mode .terms-container {
    color: #ccc;
}

body.dark-mode .terms-container h3 {
    color: #fff;
}

body.dark-mode .terms-container h4 {
    color: #ddd;
}

body.dark-mode .updated-date {
    color: #aaa;
}

body.dark-mode .acceptance-section {
    background: linear-gradient(to bottom, #2a2a3e 0%, #1e1e2e 100%);
    border-top-color: #3a3a4e;
}

body.dark-mode .label-text {
    color: #fff;
}

body.dark-mode .modal-footer {
    border-top-color: #3a3a4e;
}

body.dark-mode .reject-button {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #aaa;
}

body.dark-mode .close-read-button {
    background: #2a2a3e;
    border-color: #3a3a4e;
    color: #fff;
}

body.dark-mode .close-read-button:hover {
    background: #3a3a4e;
}
</style>
