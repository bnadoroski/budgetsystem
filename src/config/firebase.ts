import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { Capacitor } from '@capacitor/core'

// Configuração do Firebase
// No Android, usa a API Key do google-services.json
// No Web, usa a API Key do .env.local
const isAndroid = Capacitor.getPlatform() === 'android'

const firebaseConfig = {
    apiKey: isAndroid ? 'AIzaSyB4gpgwVRkzA3FGymgF_TPoVpDHoErgP6Q' : import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: isAndroid ? '1:962288789210:android:240cf38eb1009f012027e3' : import.meta.env.VITE_FIREBASE_APP_ID
}

console.log('🔧 Plataforma:', Capacitor.getPlatform())
console.log('🔥 Firebase Config:', { ...firebaseConfig, apiKey: firebaseConfig.apiKey.substring(0, 10) + '...' })

// Inicializa o Firebase
const app = initializeApp(firebaseConfig)

// Serviços do Firebase
export const auth = getAuth(app)
export const db = getFirestore(app)
