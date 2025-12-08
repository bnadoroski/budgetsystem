import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type User,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth'
import { auth } from '@/config/firebase'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const loading = ref(true)
    const error = ref<string | null>(null)

    const isAuthenticated = computed(() => !!user.value)
    const userId = computed(() => user.value?.uid || null)
    const userEmail = computed(() => user.value?.email || null)

    // Monitora mudanças no estado de autenticação
    onAuthStateChanged(auth, (firebaseUser) => {
        user.value = firebaseUser
        loading.value = false
    })

    // Login com email e senha
    const signIn = async (email: string, password: string) => {
        try {
            error.value = null
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            user.value = userCredential.user
            return { success: true }
        } catch (err: any) {
            error.value = getErrorMessage(err.code)
            return { success: false, error: error.value }
        }
    }

    // Registro com email e senha
    const signUp = async (email: string, password: string) => {
        try {
            error.value = null
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            user.value = userCredential.user
            return { success: true }
        } catch (err: any) {
            error.value = getErrorMessage(err.code)
            return { success: false, error: error.value }
        }
    }

    // Login com Google
    const signInWithGoogle = async () => {
        try {
            error.value = null
            const provider = new GoogleAuthProvider()
            const userCredential = await signInWithPopup(auth, provider)
            user.value = userCredential.user
            return { success: true }
        } catch (err: any) {
            error.value = getErrorMessage(err.code)
            return { success: false, error: error.value }
        }
    }

    // Logout
    const signOut = async () => {
        try {
            await firebaseSignOut(auth)
            user.value = null
            error.value = null
            return { success: true }
        } catch (err: any) {
            error.value = 'Erro ao fazer logout'
            return { success: false, error: error.value }
        }
    }

    // Mensagens de erro em português
    const getErrorMessage = (code: string): string => {
        const errorMessages: Record<string, string> = {
            'auth/email-already-in-use': 'Este email já está em uso',
            'auth/invalid-email': 'Email inválido',
            'auth/operation-not-allowed': 'Operação não permitida',
            'auth/weak-password': 'Senha muito fraca (mínimo 6 caracteres)',
            'auth/user-disabled': 'Usuário desabilitado',
            'auth/user-not-found': 'Usuário não encontrado',
            'auth/wrong-password': 'Senha incorreta',
            'auth/invalid-credential': 'Credenciais inválidas',
            'auth/popup-closed-by-user': 'Login cancelado',
        }
        return errorMessages[code] || 'Erro ao autenticar. Tente novamente.'
    }

    return {
        user,
        loading,
        error,
        isAuthenticated,
        userId,
        userEmail,
        signIn,
        signUp,
        signInWithGoogle,
        signOut
    }
})
