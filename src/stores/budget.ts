import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Budget, BudgetGroup, BudgetHistory } from '@/types/budget'
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
    type Unsubscribe,
    setDoc,
    orderBy,
    limit
} from 'firebase/firestore'
import { useAuthStore } from './auth'

interface PendingExpense {
    id: string
    amount: number
    bank: string
    description: string
    category: string
    timestamp: number
    approved?: boolean
}

export const useBudgetStore = defineStore('budget', () => {
    const budgets = ref<Budget[]>([])
    const groups = ref<BudgetGroup[]>([])
    const history = ref<BudgetHistory[]>([])
    const pendingExpenses = ref<PendingExpense[]>([])
    const colors = ['#4CAF50', '#9C27B0', '#CDDC39', '#FF9800', '#2196F3', '#E91E63']
    const loading = ref(false)
    const totalBudgetLimit = ref<number>(0)
    const currency = ref<string>('BRL')
    const darkMode = ref<boolean>(false)
    const resetDay = ref<number>(5) // Dia do mês para reset (padrão: dia 5)
    let unsubscribe: Unsubscribe | null = null
    let groupsUnsubscribe: Unsubscribe | null = null
    let sharedUnsubscribe: Unsubscribe | null = null

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
    const addBudget = async (name: string, totalValue: number, color?: string, groupId?: string) => {
        const authStore = useAuthStore()

        console.log('💰 addBudget chamado:', { name, totalValue, color, groupId })
        console.log('👤 Auth status:', {
            isAuthenticated: authStore.isAuthenticated,
            userId: authStore.userId,
            user: authStore.user
        })

        const newBudget: any = {
            name,
            totalValue,
            spentValue: 0,
            color: color || colors[budgets.value.length % colors.length] || '#4CAF50',
            createdAt: new Date().toISOString(),
            ownerId: authStore.userId || 'local',
            sharedWith: []
        }

        // Só adiciona groupId se tiver valor (Firestore não aceita undefined)
        if (groupId) {
            newBudget.groupId = groupId
        }

        console.log('📦 Budget a ser criado:', newBudget)

        if (authStore.userId) {
            try {
                console.log('🔥 Tentando salvar no Firestore...')
                const budgetsRef = getBudgetsCollection(authStore.userId)

                // Adiciona timeout de 10 segundos
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Firestore timeout')), 10000)
                )

                const docRef = await Promise.race([
                    addDoc(budgetsRef, newBudget),
                    timeoutPromise
                ]) as any

                console.log('✅ Budget salvo no Firestore com ID:', docRef.id)
                // O listener atualizará automaticamente a lista
            } catch (error) {
                console.error('❌ Erro ao adicionar budget no Firestore:', error)
                console.error('📝 Detalhes do erro:', JSON.stringify(error, null, 2))
                // Fallback para localStorage
                budgets.value.push({ id: Date.now().toString(), ...newBudget })
                saveToLocalStorage()
            }
        } else {
            console.log('⚠️ Sem autenticação, salvando localmente')
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
        if (budget.totalValue === 0) return 0
        const calc = Math.round((budget.spentValue / budget.totalValue) * 100)
        return Math.min(calc, 100) // Cap at 100%
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

    // === GROUPS MANAGEMENT ===

    const getGroupsCollection = (userId: string) => {
        return collection(db, 'users', userId, 'budgetGroups')
    }

    const loadGroups = async (userId: string) => {
        try {
            const groupsRef = getGroupsCollection(userId)
            const snapshot = await getDocs(groupsRef)
            groups.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as BudgetGroup))
            startGroupsListener(userId)
        } catch (error) {
            console.error('Erro ao carregar grupos:', error)
            loadGroupsFromLocalStorage()
        }
    }

    const startGroupsListener = (userId: string) => {
        if (groupsUnsubscribe) {
            groupsUnsubscribe()
        }

        console.log('🎧 Iniciando listener de grupos para userId:', userId)
        const groupsRef = getGroupsCollection(userId)
        groupsUnsubscribe = onSnapshot(groupsRef, (snapshot) => {
            console.log('📢 Listener de grupos disparado! Total:', snapshot.docs.length)
            groups.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as BudgetGroup))
            console.log('📦 Grupos atualizados:', groups.value)
            saveGroupsToLocalStorage()
        })
    }

    const stopGroupsListener = () => {
        if (groupsUnsubscribe) {
            groupsUnsubscribe()
            groupsUnsubscribe = null
        }
    }

    const addGroup = async (name: string, color: string) => {
        const authStore = useAuthStore()
        const newGroup = {
            name,
            color,
            isExpanded: true
        }

        console.log('🔹 addGroup chamado:', { name, color, userId: authStore.userId })

        if (authStore.userId) {
            try {
                console.log('🔹 Tentando adicionar grupo ao Firebase...')
                const groupsRef = getGroupsCollection(authStore.userId)
                const docRef = await addDoc(groupsRef, newGroup)
                console.log('✅ Grupo adicionado ao Firebase com ID:', docRef.id)
            } catch (error) {
                console.error('❌ Erro ao adicionar grupo:', error)
            }
        } else {
            console.log('🔹 Adicionando grupo localmente (sem autenticação)')
            groups.value.push({ id: Date.now().toString(), ...newGroup })
            saveGroupsToLocalStorage()
        }
    }

    const updateGroup = async (id: string, updates: Partial<BudgetGroup>) => {
        const authStore = useAuthStore()

        if (authStore.userId) {
            try {
                const groupRef = doc(db, 'users', authStore.userId, 'budgetGroups', id)
                await updateDoc(groupRef, updates)
            } catch (error) {
                console.error('Erro ao atualizar grupo:', error)
            }
        } else {
            const group = groups.value.find(g => g.id === id)
            if (group) {
                Object.assign(group, updates)
                saveGroupsToLocalStorage()
            }
        }
    }

    const deleteGroup = async (id: string) => {
        const authStore = useAuthStore()

        if (authStore.userId) {
            try {
                const groupRef = doc(db, 'users', authStore.userId, 'budgetGroups', id)
                await deleteDoc(groupRef)
            } catch (error) {
                console.error('Erro ao deletar grupo:', error)
            }
        } else {
            groups.value = groups.value.filter(g => g.id !== id)
            saveGroupsToLocalStorage()
        }
    }

    const toggleGroupExpansion = (id: string) => {
        const group = groups.value.find(g => g.id === id)
        if (group) {
            updateGroup(id, { isExpanded: !group.isExpanded })
        }
    }

    const loadGroupsFromLocalStorage = () => {
        const stored = localStorage.getItem('budgetGroups')
        if (stored) {
            groups.value = JSON.parse(stored)
        }
    }

    const saveGroupsToLocalStorage = () => {
        localStorage.setItem('budgetGroups', JSON.stringify(groups.value))
    }

    // === SHARED BUDGETS ===

    const startSharedBudgetsListener = async (userId: string) => {
        if (sharedUnsubscribe) {
            sharedUnsubscribe()
        }

        // Query para buscar budgets compartilhados com o usuário
        const sharedQuery = query(
            collection(db, 'sharedBudgets'),
            where('sharedWith', 'array-contains', userId)
        )

        sharedUnsubscribe = onSnapshot(sharedQuery, async (snapshot) => {
            for (const docSnapshot of snapshot.docs) {
                const sharedBudget = { id: docSnapshot.id, ...docSnapshot.data() } as Budget
                // Adiciona ou atualiza budget compartilhado na lista
                const existingIndex = budgets.value.findIndex(b => b.id === sharedBudget.id)
                if (existingIndex >= 0) {
                    budgets.value[existingIndex] = sharedBudget
                } else {
                    budgets.value.push(sharedBudget)
                }
            }
        })
    }

    const shareBudgetWithUser = async (budgetId: string, targetUserEmail: string) => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        try {
            // Buscar usuário pelo email
            const usersQuery = query(
                collection(db, 'users'),
                where('email', '==', targetUserEmail)
            )
            const usersSnapshot = await getDocs(usersQuery)

            if (usersSnapshot.empty) {
                throw new Error('Usuário não encontrado')
            }

            const targetUserId = usersSnapshot.docs[0]?.id
            if (!targetUserId) {
                throw new Error('Erro ao obter ID do usuário')
            }

            const budget = budgets.value.find(b => b.id === budgetId)

            if (!budget) return

            // Criar documento compartilhado
            const sharedBudgetRef = doc(db, 'sharedBudgets', budgetId)
            await setDoc(sharedBudgetRef, {
                ...budget,
                sharedWith: [...(budget.sharedWith || []), targetUserId]
            }, { merge: true })

            // Atualizar budget original
            await updateBudget(budgetId, {
                sharedWith: [...(budget.sharedWith || []), targetUserId]
            })

        } catch (error) {
            console.error('Erro ao compartilhar budget:', error)
            throw error
        }
    }

    const unshareBudget = async (budgetId: string, targetUserId: string) => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        try {
            const budget = budgets.value.find(b => b.id === budgetId)
            if (!budget) return

            const newSharedWith = (budget.sharedWith || []).filter(id => id !== targetUserId)

            const sharedBudgetRef = doc(db, 'sharedBudgets', budgetId)
            await updateDoc(sharedBudgetRef, { sharedWith: newSharedWith })
            await updateBudget(budgetId, { sharedWith: newSharedWith })
        } catch (error) {
            console.error('Erro ao remover compartilhamento:', error)
        }
    }

    // Inicializa grupos do localStorage
    loadGroupsFromLocalStorage()

    // ===== HISTÓRICO E RESET MENSAL =====

    // Obtém o mês atual no formato YYYY-MM
    const getCurrentMonth = () => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }

    // Verifica se deve fazer reset baseado no dia configurado
    const checkAndResetBudgets = async () => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        const now = new Date()
        const currentDay = now.getDate()
        const currentMonth = getCurrentMonth()

        // Verifica se hoje é o dia de reset
        if (currentDay === resetDay.value) {
            // Verifica se já resetou este mês
            const needsReset = budgets.value.some(b => b.currentMonth !== currentMonth)

            if (needsReset) {
                await resetMonthlyBudgets()
            }
        }
    }

    // Reseta todos os budgets e salva no histórico
    const resetMonthlyBudgets = async () => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        try {
            const currentMonth = getCurrentMonth()
            const now = new Date()

            // Para cada budget, salva no histórico e reseta
            for (const budget of budgets.value) {
                // Salvar no histórico
                await saveToHistory(budget)

                // Resetar spentValue
                await updateBudget(budget.id, {
                    spentValue: 0,
                    currentMonth
                })
            }

            console.log('Budgets resetados com sucesso!')
        } catch (error) {
            console.error('Erro ao resetar budgets:', error)
        }
    }

    // Salva um budget no histórico
    const saveToHistory = async (budget: Budget) => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        try {
            const historyRef = collection(db, 'users', authStore.userId, 'budgetHistory')

            const historyEntry: Omit<BudgetHistory, 'id'> = {
                budgetId: budget.id,
                budgetName: budget.name,
                totalValue: budget.totalValue,
                spentValue: budget.spentValue,
                color: budget.color,
                groupId: budget.groupId,
                month: budget.currentMonth || getCurrentMonth(),
                closedAt: new Date()
            }

            await addDoc(historyRef, historyEntry)
        } catch (error) {
            console.error('Erro ao salvar histórico:', error)
        }
    }

    // Carrega histórico do mês anterior
    const loadHistory = async (monthOffset: number = 1) => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        try {
            const now = new Date()
            const targetDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1)
            const targetMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`

            const historyRef = collection(db, 'users', authStore.userId, 'budgetHistory')
            const q = query(
                historyRef,
                where('month', '==', targetMonth),
                orderBy('closedAt', 'desc')
            )

            const snapshot = await getDocs(q)
            history.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as BudgetHistory))

            return history.value
        } catch (error) {
            console.error('Erro ao carregar histórico:', error)
            return []
        }
    }

    // Define o dia de reset mensal
    const setResetDay = (day: number) => {
        if (day >= 1 && day <= 28) {
            resetDay.value = day
            localStorage.setItem('resetDay', String(day))
        }
    }

    // Carrega dia de reset do localStorage
    const loadResetDay = () => {
        const stored = localStorage.getItem('resetDay')
        if (stored) {
            resetDay.value = parseInt(stored)
        }
    }

    // Inicializa
    loadResetDay()

    // Verifica reset ao carregar
    const initializeMonthlyCheck = () => {
        checkAndResetBudgets()
        // Verifica a cada hora
        setInterval(checkAndResetBudgets, 60 * 60 * 1000)
    }

    initializeMonthlyCheck()

    // ===== PENDING EXPENSES FROM NOTIFICATIONS =====

    const addPendingExpense = (expense: Omit<PendingExpense, 'id'>) => {
        const newExpense: PendingExpense = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...expense
        }
        pendingExpenses.value.unshift(newExpense)

        // Save to localStorage as backup
        localStorage.setItem('pendingExpenses', JSON.stringify(pendingExpenses.value))

        console.log('✅ Pending expense added:', newExpense)
    }

    const approvePendingExpense = async (expenseId: string, budgetId: string) => {
        const expense = pendingExpenses.value.find(e => e.id === expenseId)
        if (!expense) return

        await addExpense(budgetId, expense.amount)

        expense.approved = true

        // Remove from pending after a short delay
        setTimeout(() => {
            pendingExpenses.value = pendingExpenses.value.filter(e => e.id !== expenseId)
            localStorage.setItem('pendingExpenses', JSON.stringify(pendingExpenses.value))
        }, 1000)
    }

    const rejectPendingExpense = (expenseId: string) => {
        pendingExpenses.value = pendingExpenses.value.filter(e => e.id !== expenseId)
        localStorage.setItem('pendingExpenses', JSON.stringify(pendingExpenses.value))
    }

    // Load pending expenses from localStorage
    const loadPendingExpenses = () => {
        try {
            const stored = localStorage.getItem('pendingExpenses')
            if (stored) {
                pendingExpenses.value = JSON.parse(stored)
            }
        } catch (error) {
            console.error('Error loading pending expenses from localStorage:', error)
            // Clear corrupted data
            localStorage.removeItem('pendingExpenses')
            pendingExpenses.value = []
        }
    }

    loadPendingExpenses()

    return {
        budgets,
        groups,
        history,
        pendingExpenses,
        loading,
        totalBudgetLimit,
        currency,
        darkMode,
        resetDay,
        loadBudgets,
        startBudgetsListener,
        stopBudgetsListener,
        addBudget,
        updateBudget,
        addExpense,
        deleteBudget,
        percentage,
        migrateBudgetsToFirestore,
        setTotalBudgetLimit,
        // Groups
        loadGroups,
        addGroup,
        updateGroup,
        deleteGroup,
        toggleGroupExpansion,
        stopGroupsListener,
        // Sharing
        startSharedBudgetsListener,
        shareBudgetWithUser,
        unshareBudget,
        // Monthly History
        loadHistory,
        setResetDay,
        resetMonthlyBudgets,
        checkAndResetBudgets,
        // Pending Expenses
        addPendingExpense,
        approvePendingExpense,
        rejectPendingExpense
    }
})
