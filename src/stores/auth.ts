import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    type User,
    GoogleAuthProvider,
    signInWithCredential,
    sendEmailVerification,
    sendPasswordResetEmail,
    fetchSignInMethodsForEmail,
    linkWithCredential,
    EmailAuthProvider
} from 'firebase/auth'
import { auth, db } from '@/config/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'
import { Capacitor } from '@capacitor/core'
import { FCMTokenPlugin } from '@/plugins/FCMTokenPlugin'

export const useAuthStore = defineStore('auth', () => {
    const user = ref<User | null>(null)
    const loading = ref(true)
    const error = ref<string | null>(null)
    const pendingVerificationEmail = ref<string | null>(null)
    const isOffline = ref(!navigator.onLine)

    const isAuthenticated = computed(() => !!user.value)
    const userId = computed(() => user.value?.uid || null)
    const userEmail = computed(() => user.value?.email || null)
    const isEmailVerified = computed(() => user.value?.emailVerified ?? false)

    // Verifica se há dados em cache de um usuário autenticado anteriormente
    const hasCachedUser = computed(() => {
        const cached = localStorage.getItem('cachedUserId')
        return !!cached
    })

    // Listener para mudanças de conectividade
    if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
            isOffline.value = false
            console.log('📶 Conexão restaurada')
        })
        window.addEventListener('offline', () => {
            isOffline.value = true
            console.log('📵 Sem conexão')
        })
    }

    // Monitora mudanças no estado de autenticação
    onAuthStateChanged(auth, async (firebaseUser) => {
        user.value = firebaseUser
        loading.value = false

        // Salva userId em cache para modo offline
        if (firebaseUser) {
            localStorage.setItem('cachedUserId', firebaseUser.uid)
            localStorage.setItem('cachedUserEmail', firebaseUser.email || '')
        }

        // Registra token FCM quando usuário loga (via onAuthStateChanged)
        // Nota: também é chamado nos métodos de login específicos para garantir
        if (firebaseUser && Capacitor.isNativePlatform()) {
            await registerFCMToken(firebaseUser.uid)
        }
    })

    // Função auxiliar para registrar o token FCM
    const registerFCMToken = async (uid: string) => {
        try {
            console.log('📱 Obtendo FCM token para usuário:', uid)
            await new Promise(resolve => setTimeout(resolve, 500))
            const result = await FCMTokenPlugin.saveTokenToFirestore({ userId: uid })

            if (result.token) {
                console.log('✅ FCM token obtido:', result.token.substring(0, 20) + '...')

                // Salva no Firestore via JavaScript (tem autenticação)
                const userDocRef = doc(db, 'users', uid)
                await setDoc(userDocRef, {
                    fcmToken: result.token,
                    fcmTokenUpdatedAt: new Date().toISOString()
                }, { merge: true })
                console.log('✅ FCM token salvo no Firestore!')
            } else {
                console.error('❌ FCM token retornado é vazio!')
            }
        } catch (err) {
            console.error('❌ Erro ao registrar token FCM:', err)
        }
    }

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
                updatedAt: new Date().toISOString(),
                lastActiveAt: new Date().toISOString()
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

    // Atualiza o timestamp de última atividade do usuário
    const updateLastActive = async () => {
        if (!user.value) return

        try {
            const userDocRef = doc(db, 'users', user.value.uid)
            await setDoc(userDocRef, {
                lastActiveAt: new Date().toISOString()
            }, { merge: true })
            console.log('✅ lastActiveAt atualizado')
        } catch (err) {
            console.error('❌ Erro ao atualizar lastActiveAt:', err)
        }
    }

    // Login com email e senha
    const signIn = async (email: string, password: string) => {
        try {
            error.value = null
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            user.value = userCredential.user
            await ensureUserDocument(userCredential.user)

            // Registra token FCM para notificações push
            if (Capacitor.isNativePlatform()) {
                await registerFCMToken(userCredential.user.uid)
            }

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

            // Verifica se já existe conta com esse email (pode ser Google)
            const methods = await fetchSignInMethodsForEmail(auth, email)

            if (methods.length > 0 && !methods.includes('password')) {
                // Conta existe mas é só com Google - informar usuário
                error.value = 'Este email já está cadastrado com Google. Faça login com Google e depois vincule a senha nas configurações.'
                return { success: false, error: error.value, existingProvider: 'google' }
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            user.value = userCredential.user

            // Enviar email de verificação
            await sendEmailVerification(userCredential.user, {
                url: window.location.origin,
                handleCodeInApp: false
            })
            pendingVerificationEmail.value = email

            await ensureUserDocument(userCredential.user)

            // Enviar email de boas-vindas via Cloud Function
            try {
                const functionUrl = 'https://us-central1-budget-system-34ef8.cloudfunctions.net/sendWelcomeEmail'
                await fetch(functionUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email,
                        userName: email.split('@')[0]
                    })
                })
            } catch (welcomeErr) {
                console.warn('Failed to send welcome email:', welcomeErr)
            }

            return { success: true, needsVerification: true }
        } catch (err: any) {
            error.value = getErrorMessage(err.code)
            return { success: false, error: error.value }
        }
    }

    // Reenviar email de verificação
    const resendVerificationEmail = async () => {
        try {
            error.value = null
            if (!user.value) {
                error.value = 'Nenhum usuário logado'
                return { success: false, error: error.value }
            }

            await sendEmailVerification(user.value, {
                url: window.location.origin,
                handleCodeInApp: false
            })
            return { success: true }
        } catch (err: any) {
            error.value = getErrorMessage(err.code)
            return { success: false, error: error.value }
        }
    }

    // Verificar se email foi verificado (recarrega usuário)
    const checkEmailVerification = async () => {
        try {
            if (!user.value) return { verified: false }
            await user.value.reload()
            user.value = auth.currentUser
            return { verified: user.value?.emailVerified ?? false }
        } catch (err) {
            console.error('Erro ao verificar email:', err)
            return { verified: false }
        }
    }

    // Esqueci minha senha
    const resetPassword = async (email: string) => {
        try {
            error.value = null
            await sendPasswordResetEmail(auth, email, {
                url: window.location.origin,
                handleCodeInApp: false
            })
            return { success: true }
        } catch (err: any) {
            error.value = getErrorMessage(err.code)
            return { success: false, error: error.value }
        }
    }

    // Vincular conta de email/senha a conta Google existente
    const linkEmailPassword = async (email: string, password: string) => {
        try {
            error.value = null
            if (!user.value) {
                error.value = 'Nenhum usuário logado'
                return { success: false, error: error.value }
            }

            const credential = EmailAuthProvider.credential(email, password)
            await linkWithCredential(user.value, credential)
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

            // Registra token FCM para notificações push
            if (Capacitor.isNativePlatform()) {
                await registerFCMToken(result.user.uid)
            }

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
            'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos.',
            'auth/credential-already-in-use': 'Esta credencial já está vinculada a outra conta',
            'auth/provider-already-linked': 'Este provedor já está vinculado à sua conta',
            'auth/requires-recent-login': 'Por segurança, faça login novamente',
        }
        return errorMessages[code] || 'Erro ao autenticar. Tente novamente.'
    }

    return {
        user,
        loading,
        error,
        pendingVerificationEmail,
        isAuthenticated,
        userId,
        userEmail,
        isEmailVerified,
        isOffline,
        hasCachedUser,
        getCachedUserId: () => localStorage.getItem('cachedUserId'),
        getCachedUserEmail: () => localStorage.getItem('cachedUserEmail'),
        clearCachedUser: () => {
            localStorage.removeItem('cachedUserId')
            localStorage.removeItem('cachedUserEmail')
        },
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        resetPassword,
        resendVerificationEmail,
        checkEmailVerification,
        linkEmailPassword,
        updateLastActive
    }
})
