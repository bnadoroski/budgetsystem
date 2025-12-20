import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Budget, BudgetGroup, BudgetHistory, ShareInvite, Merchant, MerchantBudgetMapping, Transaction } from '@/types/budget'
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
    limit,
    serverTimestamp,
    getDoc
} from 'firebase/firestore'
import { useAuthStore } from './auth'
import FCM from '@/plugins/FCMPlugin'
import { Capacitor } from '@capacitor/core'

interface PendingExpense {
    id: string
    amount: number
    bank: string
    description: string
    category: string
    timestamp: number
    approved?: boolean
    merchantName?: string
    installmentNumber?: number
    installmentTotal?: number
}

export const useBudgetStore = defineStore('budget', () => {
    const budgets = ref<Budget[]>([])
    const groups = ref<BudgetGroup[]>([])
    const history = ref<BudgetHistory[]>([])
    const pendingExpenses = ref<PendingExpense[]>([])
    const shareInvites = ref<ShareInvite[]>([])
    const colors = ['#4CAF50', '#9C27B0', '#CDDC39', '#FF9800', '#2196F3', '#E91E63']
    const loading = ref(false)
    const totalBudgetLimit = ref<number>(0)
    const currency = ref<string>('BRL')
    const darkMode = ref<boolean>(false)
    const resetDay = ref<number>(5) // Dia do mês para reset (padrão: dia 5)
    let unsubscribe: Unsubscribe | null = null
    let groupsUnsubscribe: Unsubscribe | null = null
    let sharedUnsubscribe: Unsubscribe | null = null
    let invitesUnsubscribe: Unsubscribe | null = null

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
            // Substitui completamente (não concatena)
            budgets.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Budget))
            // Salva no cache após receber do Firebase
            saveToLocalStorage()
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
            // Carrega do cache PRIMEIRO para exibição instantânea
            loadFromLocalStorage()

            loading.value = true
            const budgetsRef = getBudgetsCollection(userId)
            const snapshot = await getDocs(budgetsRef)

            // Substitui completamente (não concatena) com dados do Firebase
            budgets.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Budget))

            // Carrega configurações do usuário do Firestore
            await loadUserSettings(userId)

            // Migra totalBudgetLimit do localStorage para Firestore se necessário
            const localLimit = localStorage.getItem('totalBudgetLimit')
            if (localLimit && totalBudgetLimit.value === 0) {
                totalBudgetLimit.value = parseFloat(localLimit)
                await saveUserSettings(userId)
            }

            // Salva atualização no cache
            saveToLocalStorage()

            // Inicia listener para atualizações em tempo real
            startBudgetsListener(userId)
        } catch (error) {
            console.error('Erro ao carregar budgets:', error)
            // Já carregou do cache no início
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

        if (authStore.userId) {
            try {
                const budgetsRef = getBudgetsCollection(authStore.userId)

                // Adiciona timeout de 10 segundos
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Firestore timeout')), 10000)
                )

                const docRef = await Promise.race([
                    addDoc(budgetsRef, newBudget),
                    timeoutPromise
                ]) as any

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
    // loadFromLocalStorage()

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

    // Carrega configurações do usuário do Firestore
    const loadUserSettings = async (userId: string) => {
        try {
            const userSettingsRef = doc(db, 'users', userId, 'settings', 'preferences')
            const settingsDoc = await getDocs(query(collection(db, 'users', userId, 'settings')))

            if (!settingsDoc.empty && settingsDoc.docs[0]) {
                const settingsData = settingsDoc.docs[0].data()
                if (settingsData.totalBudgetLimit !== undefined) {
                    totalBudgetLimit.value = settingsData.totalBudgetLimit
                    localStorage.setItem('totalBudgetLimit', settingsData.totalBudgetLimit.toString())
                }
                if (settingsData.currency) {
                    currency.value = settingsData.currency
                    localStorage.setItem('currency', settingsData.currency)
                }
                if (settingsData.darkMode !== undefined) {
                    darkMode.value = settingsData.darkMode
                    localStorage.setItem('darkModeEnabled', settingsData.darkMode.toString())
                }
                if (settingsData.resetDay !== undefined) {
                    resetDay.value = settingsData.resetDay
                }
            }
        } catch (error) {
            console.error('Erro ao carregar configurações do usuário:', error)
        }
    }

    // Salva configurações do usuário no Firestore
    const saveUserSettings = async (userId: string) => {
        try {
            const settingsRef = doc(db, 'users', userId, 'settings', 'preferences')
            await setDoc(settingsRef, {
                totalBudgetLimit: totalBudgetLimit.value,
                currency: currency.value,
                darkMode: darkMode.value,
                resetDay: resetDay.value,
                updatedAt: new Date().toISOString()
            })
        } catch (error) {
            console.error('Erro ao salvar configurações do usuário:', error)
        }
    }

    // Define ou atualiza o limite total de orçamento
    const setTotalBudgetLimit = async (limit: number) => {
        const authStore = useAuthStore()
        totalBudgetLimit.value = limit
        localStorage.setItem('totalBudgetLimit', limit.toString())

        // Salva no Firestore se estiver autenticado
        if (authStore.userId) {
            await saveUserSettings(authStore.userId)
        }
    }

    // === GROUPS MANAGEMENT ===

    const getGroupsCollection = (userId: string) => {
        return collection(db, 'users', userId, 'budgetGroups')
    }

    const loadGroups = async (userId: string) => {
        try {
            // Carrega do cache PRIMEIRO para exibição instantânea
            loadGroupsFromLocalStorage()

            const groupsRef = getGroupsCollection(userId)
            const snapshot = await getDocs(groupsRef)
            groups.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as BudgetGroup))

            // Salva atualização no cache
            saveGroupsToLocalStorage()

            startGroupsListener(userId)
        } catch (error) {
            console.error('Erro ao carregar grupos:', error)
            // Já carregou do cache no início
        }
    }

    const startGroupsListener = (userId: string) => {
        if (groupsUnsubscribe) {
            groupsUnsubscribe()
        }

        const groupsRef = getGroupsCollection(userId)
        groupsUnsubscribe = onSnapshot(groupsRef, (snapshot) => {
            groups.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as BudgetGroup))
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

        if (authStore.userId) {
            try {
                const groupsRef = getGroupsCollection(authStore.userId)
                const docRef = await addDoc(groupsRef, newGroup)
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
            // Normalizar email: remover espaços e converter para lowercase
            const normalizedEmail = targetUserEmail.trim().toLowerCase()

            // Buscar todos os documentos de usuário que tenham email
            const usersCollectionRef = collection(db, 'users')
            const allUsersSnapshot = await getDocs(usersCollectionRef)

            let targetUserId: string | null = null

            // Procura manualmente pelo usuário com o email correto
            for (const userDoc of allUsersSnapshot.docs) {
                const userData = userDoc.data()
                // Normalizar o email do documento também
                const docEmail = userData.email?.trim().toLowerCase()
                // Verifica se o email do documento corresponde ao email buscado
                if (docEmail === normalizedEmail) {
                    targetUserId = userDoc.id
                    break
                }
            }

            // Se não encontrou, tenta buscar diretamente pelo ID se o email for na verdade um ID
            if (!targetUserId) {
                // Tenta buscar na coleção users por query where com email normalizado
                const usersQuery = query(
                    usersCollectionRef,
                    where('email', '==', normalizedEmail)
                )
                const usersSnapshot = await getDocs(usersQuery)

                if (!usersSnapshot.empty && usersSnapshot.docs[0]) {
                    targetUserId = usersSnapshot.docs[0].id
                }
            }

            if (!targetUserId) {
                throw new Error('Usuário não encontrado. Verifique se o email está correto.')
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
                where('month', '==', targetMonth)
            )

            const snapshot = await getDocs(q)
            history.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as BudgetHistory))

            // Ordena localmente por closedAt em ordem decrescente
            history.value.sort((a, b) => {
                const dateA = a.closedAt instanceof Date ? a.closedAt : new Date(a.closedAt)
                const dateB = b.closedAt instanceof Date ? b.closedAt : new Date(b.closedAt)
                return dateB.getTime() - dateA.getTime()
            })

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

    const updatePendingExpense = (expenseId: string, updates: Partial<Omit<PendingExpense, 'id'>>) => {
        const expenseIndex = pendingExpenses.value.findIndex(e => e.id === expenseId)
        if (expenseIndex === -1) return

        const currentExpense = pendingExpenses.value[expenseIndex]
        if (!currentExpense) return

        pendingExpenses.value[expenseIndex] = {
            id: currentExpense.id,
            amount: updates.amount ?? currentExpense.amount,
            bank: updates.bank ?? currentExpense.bank,
            description: updates.description ?? currentExpense.description,
            category: updates.category ?? currentExpense.category,
            timestamp: updates.timestamp ?? currentExpense.timestamp,
            approved: updates.approved ?? currentExpense.approved,
            merchantName: updates.merchantName ?? currentExpense.merchantName,
            installmentNumber: updates.installmentNumber ?? currentExpense.installmentNumber,
            installmentTotal: updates.installmentTotal ?? currentExpense.installmentTotal
        }

        // Save to localStorage
        localStorage.setItem('pendingExpenses', JSON.stringify(pendingExpenses.value))

        console.log('✅ Pending expense updated:', pendingExpenses.value[expenseIndex])
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

    const removePendingExpense = (expenseId: string) => {
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

    // Limpa todos os dados locais (para quando não há autenticação)
    const clearLocalData = () => {
        budgets.value = []
        groups.value = []
        history.value = []
        pendingExpenses.value = []
    }

    // Mock data para testar sistema de convites de compartilhamento
    const addMockShareInvite = async (targetUserEmail: string) => {
        try {
            // Normalizar email
            const normalizedEmail = targetUserEmail.trim().toLowerCase()

            // Criar um convite mock como se alguém tivesse enviado
            const mockInvite = {
                fromUserId: 'mock-sender-id',
                fromUserEmail: 'teste@gmail.com',
                toUserEmail: normalizedEmail,
                budgetIds: ['mock-budget-1', 'mock-budget-2', 'mock-budget-3'],
                totalBudgetLimit: 5000,
                status: 'pending' as const,
                createdAt: serverTimestamp()
            }

            // Adicionar o convite ao Firestore
            const inviteRef = await addDoc(collection(db, 'shareInvites'), mockInvite)

            console.log('✅ Mock de convite criado com sucesso!', inviteRef.id)
            console.log('📧 De:', mockInvite.fromUserEmail)
            console.log('📧 Para:', mockInvite.toUserEmail)
            console.log('📦 Budgets:', mockInvite.budgetIds.length)
        } catch (error) {
            console.error('❌ Erro ao criar mock de convite:', error)
        }
    }

    // === SISTEMA DE CONVITES ===

    // Listener para convites pendentes
    const startInvitesListener = (userEmail: string) => {
        if (invitesUnsubscribe) {
            invitesUnsubscribe()
        }

        const normalizedEmail = userEmail.trim().toLowerCase()
        const invitesQuery = query(
            collection(db, 'shareInvites'),
            where('toUserEmail', '==', normalizedEmail),
            where('status', '==', 'pending')
        )

        invitesUnsubscribe = onSnapshot(invitesQuery, (snapshot) => {
            shareInvites.value = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date(),
                respondedAt: doc.data().respondedAt?.toDate()
            })) as ShareInvite[]
        })
    }

    const stopInvitesListener = () => {
        if (invitesUnsubscribe) {
            invitesUnsubscribe()
            invitesUnsubscribe = null
        }
    }

    // Enviar convite de compartilhamento
    const sendShareInvite = async (targetEmail: string, budgetIds: string[]) => {
        const authStore = useAuthStore()
        if (!authStore.userId || !authStore.userEmail) {
            throw new Error('Usuário não autenticado')
        }

        const normalizedEmail = targetEmail.trim().toLowerCase()

        try {
            // Criar convite no Firestore
            const inviteRef = await addDoc(collection(db, 'shareInvites'), {
                fromUserId: authStore.userId,
                fromUserEmail: authStore.userEmail,
                toUserEmail: normalizedEmail,
                budgetIds,
                totalBudgetLimit: totalBudgetLimit.value,
                status: 'pending',
                createdAt: serverTimestamp()
            })

            console.log('Convite enviado:', inviteRef.id)
            return inviteRef.id
        } catch (error) {
            console.error('Erro ao enviar convite:', error)
            throw error
        }
    }

    // Aceitar convite
    const acceptShareInvite = async (inviteId: string) => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        try {
            const invite = shareInvites.value.find(i => i.id === inviteId)
            if (!invite) throw new Error('Convite não encontrado')

            // O fromUserId já está no convite, não precisa buscar
            const senderId = invite.fromUserId
            if (!senderId) {
                throw new Error('ID do remetente não encontrado no convite')
            }

            // Para cada budget do convite, adicionar o usuário atual ao sharedWith
            for (const budgetId of invite.budgetIds) {
                // Buscar o budget original
                const budgetRef = doc(db, 'users', senderId, 'budgets', budgetId)
                const budgetDoc = await getDocs(query(collection(db, 'users', senderId, 'budgets')))

                const budgetData = budgetDoc.docs.find(d => d.id === budgetId)?.data()
                if (budgetData) {
                    const currentSharedWith = budgetData.sharedWith || []
                    if (!currentSharedWith.includes(authStore.userId)) {
                        await updateDoc(budgetRef, {
                            sharedWith: [...currentSharedWith, authStore.userId]
                        })

                        // Também atualizar no sharedBudgets
                        const sharedBudgetRef = doc(db, 'sharedBudgets', budgetId)
                        await setDoc(sharedBudgetRef, {
                            ...budgetData,
                            id: budgetId,
                            sharedWith: [...currentSharedWith, authStore.userId],
                            ownerId: senderId,
                            ownerEmail: invite.fromUserEmail
                        }, { merge: true })
                    }
                }
            }

            // Atualizar status do convite
            await updateDoc(doc(db, 'shareInvites', inviteId), {
                status: 'accepted',
                respondedAt: serverTimestamp()
            })

            // Envia notificação ao remetente
            if (invite.budgetIds.length > 0) {
                const firstBudget = budgets.value.find(b => b.id === invite.budgetIds[0])
                if (firstBudget) {
                    await sendInviteNotification(senderId, firstBudget.name, true)
                }
            }

            console.log('Convite aceito com sucesso')
        } catch (error) {
            console.error('Erro ao aceitar convite:', error)
            throw error
        }
    }

    // Recusar convite
    const rejectShareInvite = async (inviteId: string) => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        try {
            const invite = shareInvites.value.find(i => i.id === inviteId)
            if (!invite) throw new Error('Convite não encontrado')

            await updateDoc(doc(db, 'shareInvites', inviteId), {
                status: 'rejected',
                respondedAt: serverTimestamp()
            })

            // Envia notificação ao remetente
            if (invite.budgetIds.length > 0) {
                const firstBudget = budgets.value.find(b => b.id === invite.budgetIds[0])
                if (firstBudget && invite.fromUserId) {
                    await sendInviteNotification(invite.fromUserId, firstBudget.name, false)
                }
            }

            console.log('Convite recusado')
        } catch (error) {
            console.error('Erro ao recusar convite:', error)
            throw error
        }
    }

    // Marcar convite como visto
    const markInviteAsViewed = async (inviteId: string) => {
        try {
            await updateDoc(doc(db, 'shareInvites', inviteId), {
                viewedAt: serverTimestamp()
            })
        } catch (error) {
            console.error('Erro ao marcar convite como visto:', error)
        }
    }

    // Mover budget para grupo (drag & drop)
    const moveBudgetToGroup = async (budgetId: string, groupId: string | undefined) => {
        await updateBudget(budgetId, { groupId })
    }

    // Atualizar budgets compartilhados (adicionar/remover budgets de um compartilhamento existente)
    const updateSharedBudgets = async (budgetIds: string[]) => {
        const authStore = useAuthStore()
        if (!authStore.userId || !authStore.userEmail) {
            throw new Error('Usuário não autenticado')
        }

        try {
            // Buscar convite aceito onde eu sou o remetente
            const myAcceptedInvite = shareInvites.value.find(invite =>
                invite.fromUserId === authStore.userId && invite.status === 'accepted'
            )

            if (!myAcceptedInvite) {
                throw new Error('Nenhum compartilhamento ativo encontrado')
            }

            // Atualizar o convite com novos budgetIds
            await updateDoc(doc(db, 'shareInvites', myAcceptedInvite.id), {
                budgetIds
            })

            // Atualizar sharedBudgets collection
            // Remover budgets que não estão mais na lista
            const removedBudgetIds = myAcceptedInvite.budgetIds.filter(id => !budgetIds.includes(id))
            for (const budgetId of removedBudgetIds) {
                await deleteDoc(doc(db, 'sharedBudgets', budgetId))
            }

            // Adicionar novos budgets
            const newBudgetIds = budgetIds.filter(id => !myAcceptedInvite.budgetIds.includes(id))
            for (const budgetId of newBudgetIds) {
                const budget = budgets.value.find(b => b.id === budgetId)
                if (budget) {
                    await setDoc(doc(db, 'sharedBudgets', budgetId), {
                        ...budget,
                        ownerId: authStore.userId,
                        ownerEmail: authStore.userEmail
                    })
                }
            }

            console.log('Compartilhamento atualizado com sucesso')
        } catch (error) {
            console.error('Erro ao atualizar compartilhamento:', error)
            throw error
        }
    }

    // ===== MERCHANT & TRANSACTION SYSTEM =====

    const transactions = ref<Transaction[]>([])
    const merchants = ref<Merchant[]>([])
    const merchantMappings = ref<MerchantBudgetMapping[]>([])

    // Normaliza nome para comparação
    const normalizeName = (name: string): string => {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove acentos
            .replace(/[^\w\s]/g, '') // Remove pontuação
            .trim()
    }

    // Salva ou atualiza merchant
    const saveMerchant = async (name: string): Promise<string> => {
        const authStore = useAuthStore()
        if (!authStore.userId || !name || name === 'Desconhecido') return ''

        const normalized = normalizeName(name)

        try {
            // Verifica se já existe
            const merchantsRef = collection(db, 'merchants')
            const q = query(merchantsRef, where('normalizedName', '==', normalized))
            const snapshot = await getDocs(q)

            if (!snapshot.empty) {
                // Já existe, incrementa contador
                const existingDoc = snapshot.docs[0]
                if (existingDoc && existingDoc.id) {
                    const existingData = existingDoc.data()
                    await updateDoc(doc(db, 'merchants', existingDoc.id), {
                        foundCount: (existingData.foundCount || 0) + 1
                    })
                    return existingDoc.id
                }
                return '' // Retorna vazio se não tem ID
            } else {
                // Cria novo
                const newMerchant = {
                    name,
                    normalizedName: normalized,
                    createdAt: serverTimestamp(),
                    foundCount: 1
                }
                const docRef = await addDoc(collection(db, 'merchants'), newMerchant)
                return docRef.id
            }
        } catch (error) {
            console.error('Erro ao salvar merchant:', error)
            return ''
        }
    }

    // Obtém sugestão de budget baseado no merchant
    const getMerchantSuggestion = async (merchantName: string): Promise<{ budgetId?: string, budgetName?: string, confidence: 'high' | 'medium' | 'none' } | null> => {
        const authStore = useAuthStore()
        if (!authStore.userId || !merchantName || merchantName === 'Desconhecido') {
            return { confidence: 'none' }
        }

        const normalized = normalizeName(merchantName)

        try {
            // 1. Procura mapeamento do próprio usuário
            const userMappingsRef = collection(db, 'merchantBudgetMappings')
            const userQuery = query(
                userMappingsRef,
                where('userId', '==', authStore.userId)
            )
            const userSnapshot = await getDocs(userQuery)

            for (const doc of userSnapshot.docs) {
                const mapping = doc.data() as MerchantBudgetMapping
                if (normalizeName(mapping.merchantName) === normalized) {
                    return {
                        budgetId: mapping.budgetId,
                        budgetName: mapping.budgetName,
                        confidence: 'high'
                    }
                }
            }

            // 2. Se não encontrou do usuário, procura de outros usuários
            const allMappingsRef = collection(db, 'merchantBudgetMappings')
            const allSnapshot = await getDocs(allMappingsRef)

            const budgetCounts: { [budgetName: string]: number } = {}

            for (const doc of allSnapshot.docs) {
                const mapping = doc.data() as MerchantBudgetMapping
                if (normalizeName(mapping.merchantName) === normalized) {
                    budgetCounts[mapping.budgetName] = (budgetCounts[mapping.budgetName] || 0) + mapping.useCount
                }
            }

            if (Object.keys(budgetCounts).length > 0) {
                // Retorna o budget mais usado por outros usuários
                const entries = Object.entries(budgetCounts).sort((a, b) => b[1] - a[1])
                if (entries.length === 0 || !entries[0]) return null
                const mostUsedBudget = entries[0][0]
                return {
                    budgetName: mostUsedBudget,
                    confidence: 'medium'
                }
            }

            return { confidence: 'none' }
        } catch (error) {
            console.error('Erro ao buscar sugestão de merchant:', error)
            return { confidence: 'none' }
        }
    }

    // Salva mapeamento merchant -> budget
    const saveMerchantMapping = async (merchantId: string, merchantName: string, budgetId: string, budgetName: string) => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        try {
            const normalized = normalizeName(merchantName)

            // Verifica se já existe mapeamento do usuário para esse merchant
            const mappingsRef = collection(db, 'merchantBudgetMappings')
            const q = query(
                mappingsRef,
                where('userId', '==', authStore.userId),
                where('merchantId', '==', merchantId)
            )
            const snapshot = await getDocs(q)

            if (!snapshot.empty) {
                // Atualiza existente
                const existingDoc = snapshot.docs[0]
                if (existingDoc && existingDoc.id) {
                    const existingData = existingDoc.data()
                    await updateDoc(doc(db, 'merchantBudgetMappings', existingDoc.id), {
                        budgetId,
                        budgetName,
                        lastUsedAt: serverTimestamp(),
                        useCount: (existingData.useCount || 0) + 1
                    })
                }
            } else {
                // Cria novo
                const newMapping = {
                    merchantId,
                    merchantName,
                    budgetId,
                    budgetName,
                    userId: authStore.userId,
                    createdAt: serverTimestamp(),
                    lastUsedAt: serverTimestamp(),
                    useCount: 1
                }
                await addDoc(collection(db, 'merchantBudgetMappings'), newMapping)
            }
        } catch (error) {
            console.error('Erro ao salvar mapeamento:', error)
        }
    }

    // Salva transação
    const saveTransaction = async (budgetId: string, expense: PendingExpense) => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        const budget = budgets.value.find(b => b.id === budgetId)
        if (!budget) return

        try {
            const transaction: Omit<Transaction, 'id'> = {
                budgetId,
                budgetName: budget.name,
                amount: expense.amount,
                merchantName: expense.merchantName,
                merchantId: expense.merchantName ? await saveMerchant(expense.merchantName) : undefined,
                description: expense.description,
                isInstallment: (expense.installmentTotal || 0) > 0,
                installmentNumber: expense.installmentNumber,
                installmentTotal: expense.installmentTotal,
                createdAt: new Date(expense.timestamp),
                userId: authStore.userId,
                bank: expense.bank
            }

            const transactionsRef = collection(db, 'users', authStore.userId, 'transactions')
            const docRef = await addDoc(transactionsRef, transaction)

            // Se tem merchant, salva mapeamento
            if (transaction.merchantId && transaction.merchantName) {
                await saveMerchantMapping(transaction.merchantId, transaction.merchantName, budgetId, budget.name)
            }

            return docRef.id
        } catch (error) {
            console.error('Erro ao salvar transação:', error)
        }
    }

    // Carrega transações de um budget
    const loadTransactions = async (budgetId: string) => {
        const authStore = useAuthStore()
        if (!authStore.userId) return []

        try {
            const transactionsRef = collection(db, 'users', authStore.userId, 'transactions')
            const q = query(
                transactionsRef,
                where('budgetId', '==', budgetId),
                orderBy('createdAt', 'desc')
            )
            const snapshot = await getDocs(q)

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate() || new Date()
            })) as Transaction[]
        } catch (error) {
            console.error('Erro ao carregar transações:', error)
            return []
        }
    }

    // Atualiza transação
    const updateTransaction = async (transactionId: string, updates: Partial<Transaction>) => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        try {
            const transactionRef = doc(db, 'users', authStore.userId, 'transactions', transactionId)
            await updateDoc(transactionRef, updates)
        } catch (error) {
            console.error('Erro ao atualizar transação:', error)
        }
    }

    // Deleta transação
    const deleteTransaction = async (transactionId: string) => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        try {
            const transactionRef = doc(db, 'users', authStore.userId, 'transactions', transactionId)
            await deleteDoc(transactionRef)
        } catch (error) {
            console.error('Erro ao deletar transação:', error)
        }
    }

    // Transfere transação para outro budget
    const transferTransaction = async (transactionId: string, newBudgetId: string) => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        const newBudget = budgets.value.find(b => b.id === newBudgetId)
        if (!newBudget) return

        try {
            await updateTransaction(transactionId, {
                budgetId: newBudgetId,
                budgetName: newBudget.name
            })
        } catch (error) {
            console.error('Erro ao transferir transação:', error)
        }
    }

    // Atualiza approvePendingExpense para salvar transação
    const approvePendingExpenseWithTransaction = async (expenseId: string, budgetId: string) => {
        const expense = pendingExpenses.value.find(e => e.id === expenseId)
        if (!expense) return

        await addExpense(budgetId, expense.amount)
        await saveTransaction(budgetId, expense)

        expense.approved = true

        setTimeout(() => {
            pendingExpenses.value = pendingExpenses.value.filter(e => e.id !== expenseId)
            savePendingExpensesToFirestore()
        }, 1000)
    }

    // Salva pending expenses no Firestore
    const savePendingExpensesToFirestore = async () => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        try {
            const pendingRef = doc(db, 'users', authStore.userId, 'data', 'pendingExpenses')
            await setDoc(pendingRef, {
                expenses: pendingExpenses.value,
                updatedAt: serverTimestamp()
            })

            // Atualiza badge ao salvar
            updateBadgeCount()
        } catch (error) {
            console.error('Erro ao salvar pending expenses no Firestore:', error)
        }
    }

    // Carrega pending expenses do Firestore
    const loadPendingExpensesFromFirestore = async () => {
        const authStore = useAuthStore()
        if (!authStore.userId) return

        try {
            const pendingRef = doc(db, 'users', authStore.userId, 'data', 'pendingExpenses')
            const snapshot = await getDocs(query(collection(db, 'users', authStore.userId, 'data')))

            const pendingDoc = snapshot.docs.find(d => d.id === 'pendingExpenses')
            if (pendingDoc) {
                const data = pendingDoc.data()
                if (data.expenses) {
                    pendingExpenses.value = data.expenses
                    localStorage.setItem('pendingExpenses', JSON.stringify(data.expenses))
                }
            }
        } catch (error) {
            console.error('Erro ao carregar pending expenses do Firestore:', error)
        }
    }

    // ===== NOTIFICAÇÕES =====

    // Envia notificação quando convite é aceito/rejeitado
    const sendInviteNotification = async (recipientUserId: string, budgetName: string, accepted: boolean) => {
        if (!Capacitor.isNativePlatform()) return

        try {
            // Busca token FCM do usuário destinatário
            const recipientDocRef = doc(db, 'users', recipientUserId)
            const recipientDoc = await getDoc(recipientDocRef)

            if (!recipientDoc.exists() || !recipientDoc.data().fcmToken) {
                console.log('Destinatário sem token FCM')
                return
            }

            const authStore = useAuthStore()

            // Envia notificação via Cloud Function ou local
            await FCM.showLocalNotification({
                title: accepted ? 'Convite Aceito!' : 'Convite Recusado',
                body: accepted
                    ? `${authStore.userEmail} aceitou compartilhar o budget "${budgetName}"`
                    : `${authStore.userEmail} recusou compartilhar o budget "${budgetName}"`,
                data: {
                    type: 'invite_response',
                    budgetName,
                    accepted: accepted.toString()
                }
            })
        } catch (error) {
            console.error('Erro ao enviar notificação de convite:', error)
        }
    }

    // Envia notificação quando há despesas pendentes há mais de 1 dia
    const sendPendingExpensesNotification = async () => {
        if (!Capacitor.isNativePlatform()) return

        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
        const oldPendingExpenses = pendingExpenses.value.filter(e => e.timestamp < oneDayAgo)

        if (oldPendingExpenses.length === 0) return

        try {
            const totalAmount = oldPendingExpenses.reduce((sum, e) => sum + e.amount, 0)

            await FCM.showLocalNotification({
                title: 'Despesas Pendentes',
                body: `Você tem ${oldPendingExpenses.length} despesa(s) pendente(s) totalizando R$ ${totalAmount.toFixed(2)}`,
                data: {
                    type: 'pending_expenses',
                    count: oldPendingExpenses.length.toString(),
                    total: totalAmount.toString()
                }
            })
        } catch (error) {
            console.error('Erro ao enviar notificação de despesas pendentes:', error)
        }
    }

    // Envia notificação quando usuário não abre o app há 15+ dias
    const sendInactivityNotification = async () => {
        if (!Capacitor.isNativePlatform()) return

        const authStore = useAuthStore()
        if (!authStore.userId) return

        try {
            const userDocRef = doc(db, 'users', authStore.userId)
            const userDoc = await getDoc(userDocRef)

            if (!userDoc.exists()) return

            const lastActive = userDoc.data().lastActiveAt
            if (!lastActive) return

            const fifteenDaysAgo = Date.now() - (15 * 24 * 60 * 60 * 1000)
            if (new Date(lastActive).getTime() < fifteenDaysAgo) {
                await FCM.showLocalNotification({
                    title: 'Sentimos sua falta!',
                    body: 'Você não acessa o app há mais de 15 dias. Seus budgets podem estar desatualizados!',
                    data: {
                        type: 'inactivity',
                        days: '15'
                    }
                })
            }
        } catch (error) {
            console.error('Erro ao enviar notificação de inatividade:', error)
        }
    }

    // Atualiza contador de badge baseado em despesas pendentes
    const updateBadgeCount = async () => {
        if (!Capacitor.isNativePlatform()) return

        try {
            const count = pendingExpenses.value.length
            if (count > 0) {
                await FCM.setBadge({ count })
            } else {
                await FCM.clearBadge()
            }
        } catch (error) {
            console.error('Erro ao atualizar badge:', error)
        }
    }

    // ===== FIM NOTIFICAÇÕES =====

    return {
        budgets,
        groups,
        history,
        pendingExpenses,
        shareInvites,
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
        loadUserSettings,
        saveUserSettings,
        clearLocalData,
        // Groups
        loadGroups,
        addGroup,
        updateGroup,
        deleteGroup,
        toggleGroupExpansion,
        stopGroupsListener,
        moveBudgetToGroup,
        // Sharing
        startSharedBudgetsListener,
        shareBudgetWithUser,
        unshareBudget,
        // Share Invites
        startInvitesListener,
        stopInvitesListener,
        sendShareInvite,
        acceptShareInvite,
        rejectShareInvite,
        markInviteAsViewed,
        updateSharedBudgets,
        // Monthly History
        loadHistory,
        setResetDay,
        resetMonthlyBudgets,
        checkAndResetBudgets,
        // Pending Expenses
        addPendingExpense,
        updatePendingExpense,
        approvePendingExpense,
        approvePendingExpenseWithTransaction,
        rejectPendingExpense,
        removePendingExpense,
        savePendingExpensesToFirestore,
        loadPendingExpensesFromFirestore,
        // Merchants & Transactions
        saveMerchant,
        getMerchantSuggestion,
        saveMerchantMapping,
        saveTransaction,
        loadTransactions,
        updateTransaction,
        deleteTransaction,
        transferTransaction,
        // Notifications
        sendInviteNotification,
        sendPendingExpensesNotification,
        sendInactivityNotification,
        updateBadgeCount,
        // Mock data
        addMockShareInvite
    }
})
