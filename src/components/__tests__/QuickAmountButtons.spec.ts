import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'

// Simula o comportamento do v-money3
const simulateVMoney3Input = (value: string): string => {
    // v-money3 com masked:false espera receber valores como string no formato "1234.56"
    // e retorna automaticamente formatado como "R$ 1.234,56"
    const numeric = parseFloat(value) || 0
    return `R$ ${numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const addAmount = (currentValue: string, amount: number): string => {
    // Remove toda formatação
    let currentStr = String(currentValue).replace('R$ ', '').replace(/\./g, '').replace(',', '.')
    const current = parseFloat(currentStr) || 0

    const newValue = current + amount
    // Retorna no formato americano (ponto decimal) que o v-money3 espera
    return String(newValue.toFixed(2))
}

describe('QuickAmountButtons - Teste de Soma', () => {
    it('deve somar corretamente: 20 + 500 + 100 + 1000 = 1620', () => {
        // Simula usuário digitando R$ 20,00
        let budgetValue = '20.00'
        let displayed = simulateVMoney3Input(budgetValue)
        console.log('Inicial (digitado 20):', { budgetValue, displayed })
        expect(displayed).toBe('R$ 20,00')

        // Clica no botão +500
        budgetValue = addAmount(displayed, 500)
        displayed = simulateVMoney3Input(budgetValue)
        console.log('Após +500:', { budgetValue, displayed })
        expect(displayed).toBe('R$ 520,00')

        // Clica no botão +100
        budgetValue = addAmount(displayed, 100)
        displayed = simulateVMoney3Input(budgetValue)
        console.log('Após +100:', { budgetValue, displayed })
        expect(displayed).toBe('R$ 620,00')

        // Clica no botão +1000
        budgetValue = addAmount(displayed, 1000)
        displayed = simulateVMoney3Input(budgetValue)
        console.log('Após +1000:', { budgetValue, displayed })
        expect(displayed).toBe('R$ 1.620,00')
    })

    it('deve funcionar começando do zero', () => {
        let budgetValue = '0.00'
        let displayed = simulateVMoney3Input(budgetValue)

        budgetValue = addAmount(displayed, 1000)
        displayed = simulateVMoney3Input(budgetValue)
        expect(displayed).toBe('R$ 1.000,00')

        budgetValue = addAmount(displayed, 500)
        displayed = simulateVMoney3Input(budgetValue)
        expect(displayed).toBe('R$ 1.500,00')
    })

    it('deve lidar com valores decimais corretamente', () => {
        let budgetValue = '123.45'
        let displayed = simulateVMoney3Input(budgetValue)
        expect(displayed).toBe('R$ 123,45')

        budgetValue = addAmount(displayed, 100)
        displayed = simulateVMoney3Input(budgetValue)
        expect(displayed).toBe('R$ 223,45')
    })
})
