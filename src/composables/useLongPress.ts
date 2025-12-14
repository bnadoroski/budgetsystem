import { ref } from 'vue'

export function useLongPress(callback: () => void, duration = 500) {
    const timer = ref<number | null>(null)
    const isLongPress = ref(false)

    const onTouchStart = (e: TouchEvent) => {
        isLongPress.value = false
        timer.value = window.setTimeout(() => {
            isLongPress.value = true
            // Vibração háptica no Android
            if (navigator.vibrate) {
                navigator.vibrate(50)
            }
            callback()
        }, duration)
    }

    const onTouchEnd = () => {
        if (timer.value) {
            clearTimeout(timer.value)
            timer.value = null
        }
    }

    const onTouchMove = () => {
        // Cancela se o usuário arrastar o dedo
        if (timer.value) {
            clearTimeout(timer.value)
            timer.value = null
        }
    }

    return {
        isLongPress,
        onTouchStart,
        onTouchEnd,
        onTouchMove
    }
}
