import { ref, watch } from 'vue'

export function useCurrencyInput(initialValue: number = 0) {
    const displayValue = ref('')
    const numericValue = ref(initialValue)

    // Formata um valor numérico para exibição (ex: 1234 -> "12,34")
    const formatDisplay = (value: number): string => {
        const cents = Math.round(value * 100)
        const formatted = cents.toString().padStart(3, '0')
        const reais = formatted.slice(0, -2) || '0'
        const centavos = formatted.slice(-2)
        return `${reais},${centavos}`
    }

    // Converte string de exibição para número (ex: "12,34" -> 12.34)
    const parseDisplay = (display: string): number => {
        const digitsOnly = display.replace(/\D/g, '')
        if (!digitsOnly) return 0
        return parseInt(digitsOnly) / 100
    }

    // Processa input do usuário (digita da direita pra esquerda)
    const handleInput = (event: Event) => {
        const input = event.target as HTMLInputElement
        const newChar = input.value.slice(-1)

        // Se usuário digitou um número
        if (/\d/.test(newChar)) {
            const currentDigits = displayValue.value.replace(/\D/g, '')
            const newDigits = currentDigits + newChar
            const newValue = parseInt(newDigits) / 100

            numericValue.value = newValue
            displayValue.value = formatDisplay(newValue)
        }
        // Se usuário apagou (backspace)
        else if (input.value.length < displayValue.value.length) {
            const currentDigits = displayValue.value.replace(/\D/g, '')
            const newDigits = currentDigits.slice(0, -1) || '0'
            const newValue = parseInt(newDigits) / 100

            numericValue.value = newValue
            displayValue.value = formatDisplay(newValue)
        }
        // Senão, mantém o valor atual
        else {
            input.value = displayValue.value
        }
    }

    // Incrementa o valor
    const increment = (amount: number) => {
        numericValue.value += amount
        displayValue.value = formatDisplay(numericValue.value)
    }

    // Define valor programaticamente
    const setValue = (value: number) => {
        numericValue.value = value
        displayValue.value = formatDisplay(value)
    }

    // Reseta para zero
    const reset = () => {
        numericValue.value = 0
        displayValue.value = formatDisplay(0)
    }

    // Inicializa display value
    displayValue.value = formatDisplay(initialValue)

    return {
        displayValue,
        numericValue,
        handleInput,
        increment,
        setValue,
        reset
    }
}
