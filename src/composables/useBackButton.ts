import { ref, onMounted, onUnmounted } from 'vue'
import { App as CapacitorApp } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'

interface UseBackButtonOptions {
    /**
     * Callback para tentar fechar a modal de maior prioridade
     * Deve retornar true se existe uma modal aberta (fechou ou não pode fechar)
     * Deve retornar false se não há modais abertas
     */
    onCloseTopModal: () => boolean

    /**
     * Callback chamado quando não há modais abertas
     * Por padrão, minimiza o app
     */
    onNoModals?: () => void
}

/**
 * Composable para gerenciar o botão voltar do Android
 * 
 * Uso:
 * ```ts
 * const { modals, closeTopModal } = useModals()
 * 
 * useBackButton({
 *   onCloseTopModal: closeTopModal,
 *   onNoModals: () => CapacitorApp.minimizeApp()
 * })
 * ```
 */
export function useBackButton(options: UseBackButtonOptions) {
    const { onCloseTopModal, onNoModals } = options

    let listener: PluginListenerHandle | null = null

    const handleBackButton = () => {
        // Tenta fechar a modal de maior prioridade
        const hadModal = onCloseTopModal()

        if (!hadModal) {
            // Nenhuma modal aberta - executa ação padrão
            if (onNoModals) {
                onNoModals()
            } else {
                // Comportamento padrão: minimiza o app
                CapacitorApp.minimizeApp()
            }
        }
    }

    onMounted(async () => {
        listener = await CapacitorApp.addListener('backButton', handleBackButton)
    })

    onUnmounted(() => {
        if (listener) {
            listener.remove()
        }
    })

    return {
        handleBackButton
    }
}
