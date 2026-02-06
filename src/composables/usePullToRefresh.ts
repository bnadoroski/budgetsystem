import { ref } from 'vue'

interface UsePullToRefreshOptions {
    /**
     * Callback executado quando o pull atinge o threshold e é solto
     */
    onRefresh: () => Promise<void>

    /**
     * Distância mínima para ativar o refresh (em pixels)
     * @default 80
     */
    threshold?: number

    /**
     * Distância máxima que o indicador pode ser puxado
     * @default 120
     */
    maxPull?: number

    /**
     * Fator de resistência (quanto menor, mais fácil puxar)
     * @default 0.5
     */
    resistance?: number

    /**
     * Tempo em ms para esconder o indicador após refresh
     * @default 500
     */
    hideDelay?: number
}

/**
 * Composable para implementar pull-to-refresh
 * 
 * Uso:
 * ```vue
 * <template>
 *   <div 
 *     @touchstart="handlers.onTouchStart"
 *     @touchmove="handlers.onTouchMove"
 *     @touchend="handlers.onTouchEnd"
 *   >
 *     <div class="pull-indicator" :style="{ transform: `translateY(${pullDistance - 60}px)` }">
 *       <span v-if="isRefreshing">⏳</span>
 *       <span v-else>⬇️</span>
 *     </div>
 *   </div>
 * </template>
 * 
 * <script setup>
 * const { isPulling, pullDistance, isRefreshing, handlers } = usePullToRefresh({
 *   onRefresh: async () => {
 *     await store.loadData()
 *   }
 * })
 * </script>
 * ```
 */
export function usePullToRefresh(options: UsePullToRefreshOptions) {
    const {
        onRefresh,
        threshold = 80,
        maxPull = 120,
        resistance = 0.5,
        hideDelay = 500
    } = options

    const isPulling = ref(false)
    const pullDistance = ref(0)
    const isRefreshing = ref(false)

    let startY = 0
    let scrollContainer: Element | null = null

    /**
     * Verifica se o scroll está no topo
     */
    const isAtTop = (): boolean => {
        if (!scrollContainer) {
            scrollContainer = document.querySelector('.app-container')
        }
        return scrollContainer ? scrollContainer.scrollTop === 0 : true
    }

    const onTouchStart = (event: TouchEvent) => {
        if (isAtTop() && event.touches[0]) {
            startY = event.touches[0].clientY
            isPulling.value = true
        }
    }

    const onTouchMove = (event: TouchEvent) => {
        if (!isPulling.value || isRefreshing.value || !event.touches[0]) {
            return
        }

        const currentY = event.touches[0].clientY
        const diff = currentY - startY

        if (diff > 0) {
            // Aplica resistência ao puxar
            pullDistance.value = Math.min(diff * resistance, maxPull)

            // Previne scroll quando está puxando
            if (pullDistance.value > 10) {
                event.preventDefault()
            }
        }
    }

    const onTouchEnd = async () => {
        if (!isPulling.value) {
            return
        }

        // Verifica se atingiu o threshold para refresh
        if (pullDistance.value >= threshold && !isRefreshing.value) {
            isRefreshing.value = true

            try {
                await onRefresh()
            } finally {
                // Aguarda um pouco antes de esconder o indicador
                setTimeout(() => {
                    isRefreshing.value = false
                    pullDistance.value = 0
                    isPulling.value = false
                }, hideDelay)
            }
        } else {
            // Não atingiu threshold - reseta imediatamente
            pullDistance.value = 0
            isPulling.value = false
        }
    }

    /**
     * Reseta o estado manualmente (útil para cancelar)
     */
    const reset = () => {
        isPulling.value = false
        pullDistance.value = 0
        isRefreshing.value = false
        startY = 0
    }

    /**
     * Verifica se está pronto para refresh (atingiu threshold)
     */
    const isReadyToRefresh = () => pullDistance.value >= threshold

    return {
        // Estado reativo
        isPulling,
        pullDistance,
        isRefreshing,

        // Handlers para eventos touch
        handlers: {
            onTouchStart,
            onTouchMove,
            onTouchEnd
        },

        // Utilitários
        reset,
        isReadyToRefresh,
        threshold
    }
}
