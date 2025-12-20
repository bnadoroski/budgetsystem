import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type User,
    GoogleAuthProvider,
    signInWithCredential
} from 'firebase/auth'
import { auth, db } from '@/config/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'
import { Capacitor } from '@capacitor/core'
import FCM from '@/plugins/FCMPlugin'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const loading = ref(true)
    const error = ref<string | null>(null)

    const isAuthenticated = computed(() => !!user.value)
    const userId = computed(() => user.value?.uid || null)
    const userEmail = computed(() => user.value?.email || null)

    // Monitora mudanças no estado de autenticação
    onAuthStateChanged(auth, async (firebaseUser) => {
        user.value = firebaseUser
        loading.value = false

        // Registra token FCM quando usuário loga
        if (firebaseUser && Capacitor.isNativePlatform()) {
            try {
                const { token } = await FCM.getToken()
                await updateFCMToken(token)
            } catch (err) {
                console.error('Erro ao registrar token FCM:', err)
            }
        }
    })

    // Cria ou atualiza documento de usuário no Firestore
    const ensureUserDocument = async (firebaseUser: User) => {
        if (!firebaseUser) return

        const userDocRef = doc(db, 'users', firebaseUser.uid)
        const userDocSnap = await getDoc(userDocRef)

        // Normalizar email: trim e lowercase
        const normalizedEmail = firebaseUser.email?.trim().toLowerCase()

        if (!userDocSnap.exists()) {
            // Cria documento do usuário se não existir
            await setDoc(userDocRef, {
                email: normalizedEmail,
                displayName: firebaseUser.displayName || '',
                photoURL: firebaseUser.photoURL || '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            })
        } else {
            // Atualiza email se mudou (comparando normalizados)
            const userData = userDocSnap.data()
            const currentEmail = userData.email?.trim().toLowerCase()
            if (currentEmail !== normalizedEmail) {
                await setDoc(userDocRef, {
                    email: normalizedEmail,
                    updatedAt: new Date().toISOString()
                }, { merge: true })
            }
        }
    }

    // Login com email e senha
    const signIn = async (email: string, password: string) => {
        try {
            error.value = null
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            user.value = userCredential.user
            await ensureUserDocument(userCredential.user)
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
            await ensureUserDocument(userCredential.user)
            return { success: true }
        } catch (err: any) {
            error.value = getErrorMessage(err.code)
            return { success: false, error: error.value }
        }
    }

    // Login com Google usando plugin nativo
    const signInWithGoogle = async () => {
        try {
            console.log('🔵 [Auth Store] Iniciando signInWithGoogle...')
            error.value = null

            console.log('🔵 [Auth Store] Plataforma:', Capacitor.getPlatform())
            console.log('🔵 [Auth Store] Chamando GoogleAuth.signIn()...')

            // Usar plugin nativo do Google Auth
            const googleUser = await GoogleAuth.signIn()
            console.log('✅ [Auth Store] GoogleAuth.signIn() concluído:', {
                email: googleUser.email,
                hasIdToken: !!googleUser.authentication?.idToken
            })

            console.log('🔵 [Auth Store] Criando credencial do Firebase...')
            // Criar credencial do Firebase
            const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken)
            console.log('✅ [Auth Store] Credencial criada')

            console.log('🔵 [Auth Store] Fazendo signInWithCredential...')
            // Fazer login no Firebase com a credencial
            const result = await signInWithCredential(auth, credential)
            console.log('✅ [Auth Store] signInWithCredential concluído:', {
                uid: result.user.uid,
                email: result.user.email
            })

            user.value = result.user
            await ensureUserDocument(result.user)
            return { success: true }
        } catch (err: any) {
            console.error('❌ [Auth Store] Erro no Google Sign-In:', {
                name: err.name,
                message: err.message,
                code: err.code,
                stack: err.stack,
                fullError: err
            })
            error.value = getErrorMessage(err.code) || `Erro ao fazer login com Google: ${err.message}`
            return { success: false, error: error.value }
        }
    }

    // Logout
    const signOut = async () => {
        try {
            // Remove token FCM ao deslogar
            if (user.value && Capacitor.isNativePlatform()) {
                await removeFCMToken()
            }

            await firebaseSignOut(auth)
            user.value = null
            error.value = null
            return { success: true }
        } catch (err: any) {
            error.value = 'Erro ao fazer logout'
            return { success: false, error: error.value }
        }
    }

    // Atualiza token FCM no Firestore
    const updateFCMToken = async (token: string) => {
        if (!user.value) return

        try {
            const userDocRef = doc(db, 'users', user.value.uid)
            await setDoc(userDocRef, {
                fcmToken: token,
                fcmTokenUpdatedAt: new Date().toISOString()
            }, { merge: true })
        } catch (err) {
            console.error('Erro ao atualizar token FCM:', err)
        }
    }

    // Remove token FCM do Firestore
    const removeFCMToken = async () => {
        if (!user.value) return

        try {
            const userDocRef = doc(db, 'users', user.value.uid)
            await setDoc(userDocRef, {
                fcmToken: null,
                fcmTokenUpdatedAt: new Date().toISOString()
            }, { merge: true })
        } catch (err) {
            console.error('Erro ao remover token FCM:', err)
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
