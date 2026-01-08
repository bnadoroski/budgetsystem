import { initializeApp } from 'firebase/app'
import { getAuth, indexedDBLocalPersistence, browserLocalPersistence, setPersistence } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { Capacitor } from '@capacitor/core'

// Configuração do Firebase usando variáveis de ambiente
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Inicializa o Firebase
const app = initializeApp(firebaseConfig)

// Serviços do Firebase
export const auth = getAuth(app)

// Configurar persistência de autenticação
// indexedDBLocalPersistence é mais confiável para apps mobile/PWA
const initAuthPersistence = async () => {
    try {
        // No mobile, usa indexedDB que é mais persistente
        if (Capacitor.isNativePlatform()) {
            await setPersistence(auth, indexedDBLocalPersistence)
        } else {
            // No web, usa localStorage que é mais comum
            await setPersistence(auth, browserLocalPersistence)
        }
        console.log('✅ Firebase Auth persistence configurada')
    } catch (error) {
        console.error('⚠️ Erro ao configurar persistência de auth:', error)
        // Fallback para browserLocalPersistence
        try {
            await setPersistence(auth, browserLocalPersistence)
        } catch (e) {
            console.error('❌ Falha total na persistência:', e)
        }
    }
}

// Inicializa persistência
initAuthPersistence()

// Configurar auth para funcionar com Capacitor
if (Capacitor.isNativePlatform()) {
    // Permitir popup em iframe para mobile
    auth.settings.appVerificationDisabledForTesting = false
}

export const db = getFirestore(app)

// Habilitar persistência offline do Firestore
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        // Múltiplas tabs abertas - persistência só funciona em uma
        console.warn('Firestore persistence failed: multiple tabs open')
    } else if (err.code === 'unimplemented') {
        // Browser não suporta
        console.warn('Firestore persistence not supported in this browser')
    }
})
