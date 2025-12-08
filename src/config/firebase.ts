import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBUZNYmO6knPlqCoqL91k1RHWQlQm2TXpQ",
    authDomain: "budget-system-34ef8.firebaseapp.com",
    projectId: "budget-system-34ef8",
    storageBucket: "budget-system-34ef8.firebasestorage.app",
    messagingSenderId: "962288789210",
    appId: "1:962288789210:web:9405c53af8949dbc2027e3",
    measurementId: "G-37610ZHTD1"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig)

// Serviços do Firebase
export const auth = getAuth(app)
export const db = getFirestore(app)
