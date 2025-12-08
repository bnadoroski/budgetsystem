import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Budget } from '@/types/budget'
import { db } from '@/config/firebase'
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    query,
    where,
    onSnapshot,
    type Unsubscribe
} from 'firebase/firestore'
import { useAuthStore } from './auth'

export const useBudgetStore = defineStore('budget', () => {
    const budgets = ref<Budget[]>([])
    const colors = ['#4CAF50', '#9C27B0', '#CDDC39', '#FF9800', '#2196F3', '#E91E63']
    const loading = ref(false)
    const totalBudgetLimit = ref<number>(0)
    const currency = ref<string>('BRL')
    const darkMode = ref<boolean>(false)
    let unsubscribe: Unsubscribe | null = null

    // Referência da coleção de budgets
    const getBudgetsCollection = (userId: string) => {
        return collection(db, 'users', userId, 'budgets')
    }

    // Inicia listener em tempo real dos budgets do usuário
    const startBudgetsListener = (userId: string) => {
        if (unsubscribe) {
            unsubscribe()
        }

        const budgetsRef = getBudgetsCollection(userId)

        unsubscribe = onSnapshot(budgetsRef, (snapshot) => {
            budgets.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Budget))
        }, (error) => {
            console.error('Erro ao carregar budgets:', error)
            // Fallback para localStorage em caso de erro
            loadFromLocalStorage()
        })
    }

    // Para o listener quando o usuário faz logout
    const stopBudgetsListener = () => {
        if (unsubscribe) {
            unsubscribe()
            unsubscribe = null
        }
        budgets.value = []
    }

    // Carrega budgets do Firestore
    const loadBudgets = async (userId: string) => {
        try {
            loading.value = true
            const budgetsRef = getBudgetsCollection(userId)
            const snapshot = await getDocs(budgetsRef)

            budgets.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Budget))

            // Inicia listener para atualizações em tempo real
            startBudgetsListener(userId)
        } catch (error) {
            console.error('Erro ao carregar budgets:', error)
            loadFromLocalStorage()
        } finally {
            loading.value = false
        }
    }

    // Fallback: carrega do localStorage
    const loadFromLocalStorage = () => {
        const stored = localStorage.getItem('budgets')
        if (stored) {
            budgets.value = JSON.parse(stored)
        }
    }

    // Salva no localStorage como backup
    const saveToLocalStorage = () => {
        localStorage.setItem('budgets', JSON.stringify(budgets.value))
    }

    // Adiciona novo budget
    const addBudget = async (name: string, totalValue: number, color?: string) => {
        const authStore = useAuthStore()

        const newBudget = {
            name,
            totalValue,
            spentValue: 0,
            color: color || colors[budgets.value.length % colors.length] || '#4CAF50',
            createdAt: new Date().toISOString()
        }

        if (authStore.userId) {
            try {
                const budgetsRef = getBudgetsCollection(authStore.userId)
                await addDoc(budgetsRef, newBudget)
                // O listener atualizará automaticamente a lista
            } catch (error) {
                console.error('Erro ao adicionar budget:', error)
                // Fallback para localStorage
                budgets.value.push({ id: Date.now().toString(), ...newBudget })
                saveToLocalStorage()
            }
        } else {
            // Sem autenticação, salva localmente
            budgets.value.push({ id: Date.now().toString(), ...newBudget })
            saveToLocalStorage()
        }
    }

    // Atualiza budget existente
    const updateBudget = async (id: string, updates: Partial<Budget>) => {
        const authStore = useAuthStore()

        if (authStore.userId) {
            try {
                const budgetRef = doc(db, 'users', authStore.userId, 'budgets', id)
                await updateDoc(budgetRef, updates)
                // O listener atualizará automaticamente
            } catch (error) {
                console.error('Erro ao atualizar budget:', error)
                // Fallback local
                const index = budgets.value.findIndex(b => b.id === id)
                if (index !== -1) {
                    budgets.value[index] = { ...budgets.value[index], ...updates } as Budget
                    saveToLocalStorage()
                }
            }
        } else {
            const index = budgets.value.findIndex(b => b.id === id)
            if (index !== -1) {
                budgets.value[index] = { ...budgets.value[index], ...updates } as Budget
                saveToLocalStorage()
            }
        }
    }

    // Adiciona despesa a um budget
    const addExpense = async (id: string, amount: number) => {
        const budget = budgets.value.find(b => b.id === id)
        if (budget) {
            await updateBudget(id, { spentValue: budget.spentValue + amount })
        }
    }

    // Deleta budget
    const deleteBudget = async (id: string) => {
        const authStore = useAuthStore()

        if (authStore.userId) {
            try {
                const budgetRef = doc(db, 'users', authStore.userId, 'budgets', id)
                await deleteDoc(budgetRef)
                // O listener atualizará automaticamente
            } catch (error) {
                console.error('Erro ao deletar budget:', error)
                budgets.value = budgets.value.filter(b => b.id !== id)
                saveToLocalStorage()
            }
        } else {
            budgets.value = budgets.value.filter(b => b.id !== id)
            saveToLocalStorage()
        }
    }

    // Calcula porcentagem
    const percentage = (budget: Budget) => {
        return Math.round((budget.spentValue / budget.totalValue) * 100)
    }

    // Migra budgets do localStorage para o Firestore
    const migrateBudgetsToFirestore = async (userId: string) => {
        const stored = localStorage.getItem('budgets')
        if (stored) {
            const localBudgets: Budget[] = JSON.parse(stored)

            for (const budget of localBudgets) {
                try {
                    const budgetsRef = getBudgetsCollection(userId)
                    const { id, ...budgetData } = budget
                    await addDoc(budgetsRef, {
                        ...budgetData,
                        createdAt: new Date().toISOString()
                    })
                } catch (error) {
                    console.error('Erro ao migrar budget:', error)
                }
            }

            // Limpa localStorage após migração
            localStorage.removeItem('budgets')
        }
    }

    // Inicializa (tenta carregar do localStorage primeiro)
    loadFromLocalStorage()

    // Carrega limite total do localStorage
    const savedLimit = localStorage.getItem('totalBudgetLimit')
    if (savedLimit) {
        totalBudgetLimit.value = parseFloat(savedLimit)
    }

    // Carrega currency e darkMode do localStorage
    const savedCurrency = localStorage.getItem('currency')
    if (savedCurrency) {
        currency.value = savedCurrency
    }

    const savedDarkMode = localStorage.getItem('darkModeEnabled')
    if (savedDarkMode) {
        darkMode.value = savedDarkMode === 'true'
    }

    // Define ou atualiza o limite total de orçamento
    const setTotalBudgetLimit = (limit: number) => {
        totalBudgetLimit.value = limit
        localStorage.setItem('totalBudgetLimit', limit.toString())
    }

    return {
        budgets,
        loading,
        totalBudgetLimit,
        currency,
        darkMode,
        loadBudgets,
        startBudgetsListener,
        stopBudgetsListener,
        addBudget,
        updateBudget,
        addExpense,
        deleteBudget,
        percentage,
        migrateBudgetsToFirestore,
        setTotalBudgetLimit
    }
})
