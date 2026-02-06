/**
 * Script para criar dados mock de transações para teste
 * Uso: Importe e chame createMockTransactions(userId) no console
 */

import { collection, addDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/config/firebase'

interface MockTransaction {
    budgetId: string
    budgetName: string
    amount: number
    description: string
    merchantName?: string
    isInstallment: boolean
    installmentNumber?: number
    installmentTotal?: number
    createdAt: Date
    userId: string
    bank?: string
    isIncome?: boolean
}

// Lista de transações mock para janeiro 2026
const januaryTransactions: Omit<MockTransaction, 'budgetId' | 'userId' | 'createdAt'>[] = [
    // Alimentação
    { budgetName: 'Alimentação', amount: 45.90, description: 'iFood - Jantar', merchantName: 'iFood', isInstallment: false, bank: 'Nubank' },
    { budgetName: 'Alimentação', amount: 32.50, description: 'Supermercado Extra', merchantName: 'Extra', isInstallment: false, bank: 'Nubank' },
    { budgetName: 'Alimentação', amount: 89.00, description: 'Restaurante Família', merchantName: 'Restaurante Família', isInstallment: false, bank: 'C6 Bank' },
    { budgetName: 'Alimentação', amount: 156.80, description: 'Mercado - Compras semana', merchantName: 'Carrefour', isInstallment: false, bank: 'Nubank' },
    { budgetName: 'Alimentação', amount: 28.00, description: 'Padaria Pão Quente', merchantName: 'Padaria Pão Quente', isInstallment: false, bank: 'Nubank' },
    { budgetName: 'Alimentação', amount: 52.00, description: 'iFood - Almoço', merchantName: 'iFood', isInstallment: false, bank: 'Nubank' },
    { budgetName: 'Alimentação', amount: 220.00, description: 'Supermercado mensal', merchantName: 'Atacadão', isInstallment: false, bank: 'C6 Bank' },

    // Transporte
    { budgetName: 'Transporte', amount: 150.00, description: 'Uber - Janeiro', merchantName: 'Uber', isInstallment: false, bank: 'Nubank' },
    { budgetName: 'Transporte', amount: 180.00, description: 'Gasolina', merchantName: 'Posto Shell', isInstallment: false, bank: 'C6 Bank' },
    { budgetName: 'Transporte', amount: 45.00, description: '99 - Corrida', merchantName: '99', isInstallment: false, bank: 'Nubank' },
    { budgetName: 'Transporte', amount: 200.00, description: 'Gasolina 2', merchantName: 'Posto Ipiranga', isInstallment: false, bank: 'Nubank' },

    // Lazer
    { budgetName: 'Lazer', amount: 65.00, description: 'Cinema Cinemark', merchantName: 'Cinemark', isInstallment: false, bank: 'Nubank' },
    { budgetName: 'Lazer', amount: 120.00, description: 'Spotify Anual', merchantName: 'Spotify', isInstallment: true, installmentNumber: 1, installmentTotal: 12, bank: 'Nubank' },
    { budgetName: 'Lazer', amount: 55.90, description: 'Netflix', merchantName: 'Netflix', isInstallment: false, bank: 'Nubank' },
    { budgetName: 'Lazer', amount: 89.00, description: 'Show de música', merchantName: 'Eventim', isInstallment: false, bank: 'C6 Bank' },

    // Saúde
    { budgetName: 'Saúde', amount: 250.00, description: 'Consulta médica', merchantName: 'Dr. Silva', isInstallment: false, bank: 'Nubank' },
    { budgetName: 'Saúde', amount: 89.00, description: 'Farmácia', merchantName: 'Drogasil', isInstallment: false, bank: 'Nubank' },
    { budgetName: 'Saúde', amount: 150.00, description: 'Academia mensalidade', merchantName: 'Smart Fit', isInstallment: false, bank: 'C6 Bank' },

    // Compras
    { budgetName: 'Compras', amount: 299.00, description: 'Tênis Nike', merchantName: 'Nike', isInstallment: true, installmentNumber: 1, installmentTotal: 3, bank: 'Nubank' },
    { budgetName: 'Compras', amount: 89.90, description: 'Livro Amazon', merchantName: 'Amazon', isInstallment: false, bank: 'Nubank' },
    { budgetName: 'Compras', amount: 450.00, description: 'Roupas Renner', merchantName: 'Renner', isInstallment: true, installmentNumber: 1, installmentTotal: 5, bank: 'C6 Bank' },

    // Contas fixas
    { budgetName: 'Contas', amount: 120.00, description: 'Conta de luz', merchantName: 'CPFL', isInstallment: false, bank: 'C6 Bank' },
    { budgetName: 'Contas', amount: 85.00, description: 'Internet', merchantName: 'Vivo', isInstallment: false, bank: 'Nubank' },
    { budgetName: 'Contas', amount: 65.00, description: 'Celular', merchantName: 'Tim', isInstallment: false, bank: 'Nubank' },

    // Receitas (valores negativos para indicar entrada)
    { budgetName: 'Salário', amount: 150.00, description: 'Pix recebido - Freelance', merchantName: 'Cliente', isInstallment: false, bank: 'Nubank', isIncome: true },
    { budgetName: 'Salário', amount: 50.00, description: 'Estorno compra', merchantName: 'Amazon', isInstallment: false, bank: 'Nubank', isIncome: true },
]

// Gera datas aleatórias em janeiro 2026
function randomJanuaryDate(): Date {
    const day = Math.floor(Math.random() * 31) + 1 // 1-31
    const hour = Math.floor(Math.random() * 14) + 8 // 8-22h
    const minute = Math.floor(Math.random() * 60)
    return new Date(2026, 0, day, hour, minute, 0) // Janeiro = mês 0
}

export async function createMockTransactions(userId: string): Promise<void> {
    console.log('🔧 Criando transações mock para janeiro 2026...')

    try {
        // Primeiro, busca os budgets do usuário para pegar os IDs corretos
        const budgetsRef = collection(db, 'users', userId, 'budgets')
        const budgetsSnapshot = await getDocs(budgetsRef)

        const budgetMap = new Map<string, string>()
        budgetsSnapshot.forEach(doc => {
            const data = doc.data()
            budgetMap.set(data.name.toLowerCase(), doc.id)
        })

        console.log('📦 Budgets encontrados:', Array.from(budgetMap.keys()))

        // Se não tiver alguns budgets, criar
        const requiredBudgets = ['alimentação', 'transporte', 'lazer', 'saúde', 'compras', 'contas', 'salário']
        for (const budgetName of requiredBudgets) {
            if (!budgetMap.has(budgetName)) {
                console.log(`➕ Criando budget: ${budgetName}`)
                const colors = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#8BC34A']
                const color = colors[Math.floor(Math.random() * colors.length)]

                const docRef = await addDoc(budgetsRef, {
                    name: budgetName.charAt(0).toUpperCase() + budgetName.slice(1),
                    totalValue: 1000,
                    spentValue: 0,
                    color: color,
                    currentMonth: '2026-02'
                })
                budgetMap.set(budgetName, docRef.id)
            }
        }

        // Agora cria as transações
        const transactionsRef = collection(db, 'users', userId, 'transactions')
        let created = 0

        for (const tx of januaryTransactions) {
            const budgetId = budgetMap.get(tx.budgetName.toLowerCase())
            if (!budgetId) {
                console.warn(`⚠️ Budget não encontrado: ${tx.budgetName}`)
                continue
            }

            const transaction: MockTransaction = {
                ...tx,
                budgetId,
                userId,
                createdAt: randomJanuaryDate()
            }

            await addDoc(transactionsRef, {
                ...transaction,
                createdAt: transaction.createdAt.toISOString()
            })
            created++
        }

        console.log(`✅ ${created} transações mock criadas para janeiro 2026!`)
    } catch (error) {
        console.error('❌ Erro ao criar transações mock:', error)
        throw error
    }
}

// Função para limpar transações de janeiro (se precisar resetar)
export async function clearJanuaryTransactions(userId: string): Promise<void> {
    console.log('🗑️ Limpando transações de janeiro 2026...')

    try {
        const transactionsRef = collection(db, 'users', userId, 'transactions')
        const q = query(transactionsRef)
        const snapshot = await getDocs(q)

        let deleted = 0
        for (const doc of snapshot.docs) {
            const data = doc.data()
            const createdAt = new Date(data.createdAt)
            if (createdAt.getMonth() === 0 && createdAt.getFullYear() === 2026) {
                // Aqui você pode implementar delete se precisar
                deleted++
            }
        }

        console.log(`📊 ${deleted} transações de janeiro encontradas`)
    } catch (error) {
        console.error('❌ Erro ao limpar transações:', error)
    }
}
