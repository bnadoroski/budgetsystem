import { reactive, computed } from 'vue'

// Tipos dos modais disponíveis
export type ModalName =
    | 'add'
    | 'auth'
    | 'settings'
    | 'groups'
    | 'share'
    | 'history'
    | 'analysis'
    | 'pendingExpenses'
    | 'debug'
    | 'permission'
    | 'emptyPending'
    | 'profile'
    | 'shareInvite'
    | 'inviteResponse'
    | 'confirmReset'
    | 'confirmDelete'
    | 'transactions'
    | 'terms'
    | 'premium'
    | 'referral'
    | 'support'
    | 'logs'

// Estado inicial de todos os modais
const createModalState = () => ({
    add: false,
    auth: false,
    settings: false,
    groups: false,
    share: false,
    history: false,
    analysis: false,
    pendingExpenses: false,
    debug: false,
    permission: false,
    emptyPending: false,
    profile: false,
    shareInvite: false,
    inviteResponse: false,
    confirmReset: false,
    confirmDelete: false,
    transactions: false,
    terms: false,
    premium: false,
    referral: false,
    support: false,
    logs: false
})

// Estado compartilhado (singleton)
const modals = reactive(createModalState())

// Ordem de prioridade para fechar modais (back button)
// Modais no início da lista têm prioridade mais alta
const MODAL_PRIORITY: ModalName[] = [
    'terms',           // Não pode fechar sem aceitar
    'logs',            // Logs viewer
    'premium',
    'referral',
    'support',
    'add',
    'auth',
    'settings',
    'groups',
    'share',
    'history',
    'pendingExpenses',
    'profile',
    'shareInvite',
    'inviteResponse',
    'confirmReset',
    'confirmDelete',
    'transactions',
    'permission',
    'emptyPending',
    'debug'
]

// Modais que não podem ser fechadas pelo back button
const UNCLOSABLE_MODALS: ModalName[] = ['terms']

export function useModals() {
    /**
     * Abre uma modal específica
     */
    const open = (name: ModalName) => {
        modals[name] = true
    }

    /**
     * Fecha uma modal específica
     */
    const close = (name: ModalName) => {
        modals[name] = false
    }

    /**
     * Alterna o estado de uma modal
     */
    const toggle = (name: ModalName) => {
        modals[name] = !modals[name]
    }

    /**
     * Fecha todas as modais
     */
    const closeAll = () => {
        (Object.keys(modals) as ModalName[]).forEach(key => {
            if (!UNCLOSABLE_MODALS.includes(key)) {
                modals[key] = false
            }
        })
    }

    /**
     * Verifica se alguma modal está aberta
     */
    const hasAnyOpen = computed(() => {
        return (Object.keys(modals) as ModalName[]).some(key => modals[key])
    })

    /**
     * Retorna a modal com maior prioridade que está aberta
     * Útil para o handler do back button
     */
    const getTopModal = (): ModalName | null => {
        for (const modalName of MODAL_PRIORITY) {
            if (modals[modalName]) {
                return modalName
            }
        }
        return null
    }

    /**
     * Tenta fechar a modal de maior prioridade
     * Retorna true se fechou alguma modal, false se nenhuma estava aberta
     * Não fecha modais marcadas como unclosable
     */
    const closeTopModal = (): boolean => {
        const topModal = getTopModal()

        if (!topModal) {
            return false
        }

        // Não fecha modais que não podem ser fechadas
        if (UNCLOSABLE_MODALS.includes(topModal)) {
            return true // Retorna true para indicar que existe modal, mas não foi fechada
        }

        modals[topModal] = false
        return true
    }

    /**
     * Verifica se uma modal específica pode ser fechada
     */
    const canClose = (name: ModalName): boolean => {
        return !UNCLOSABLE_MODALS.includes(name)
    }

    /**
     * Verifica se uma modal específica está aberta
     */
    const isOpen = (name: ModalName): boolean => {
        return modals[name]
    }

    return {
        modals,
        open,
        close,
        toggle,
        closeAll,
        hasAnyOpen,
        getTopModal,
        closeTopModal,
        canClose,
        isOpen
    }
}
