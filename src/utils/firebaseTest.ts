import { auth, db } from '@/config/firebase'
import { collection, addDoc, getDocs, doc, getDoc } from 'firebase/firestore'

export async function testFirebaseConnection() {
    const results = {
        auth: false,
        authDetails: '',
        firestore: false,
        firestoreDetails: '',
        read: false,
        write: false,
        error: null as any
    }

    try {
        // 1. Testar Auth
        console.log('🔐 Testando Firebase Auth...')
        const user = auth.currentUser
        if (user) {
            results.auth = true
            results.authDetails = `User: ${user.email}, UID: ${user.uid}`
            console.log('✅ Auth OK:', results.authDetails)
        } else {
            results.authDetails = 'Nenhum usuário autenticado'
            console.log('❌ Auth FAIL:', results.authDetails)
            return results
        }

        // 2. Testar Leitura do Firestore
        console.log('📖 Testando leitura do Firestore...')
        try {
            const usersRef = collection(db, 'users')
            const snapshot = await getDocs(usersRef)
            results.firestore = true
            results.read = true
            results.firestoreDetails = `Conexão OK. Total de users: ${snapshot.size}`
            console.log('✅ Firestore READ OK:', results.firestoreDetails)
        } catch (error: any) {
            results.firestoreDetails = `Erro na leitura: ${error.code || error.message}`
            console.error('❌ Firestore READ FAIL:', error)
            results.error = error
        }

        // 3. Testar Escrita no Firestore (com timeout de 10s)
        console.log('✍️ Testando escrita no Firestore...')
        try {
            const testRef = collection(db, 'users', user.uid, 'budgets')

            // Timeout de 10 segundos
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('TIMEOUT: Firestore write demorou mais de 10s')), 10000)
            )

            const writePromise = addDoc(testRef, {
                name: 'TEST - DELETE ME',
                totalValue: 0,
                spentValue: 0,
                color: '#ff0000',
                createdAt: new Date().toISOString(),
                ownerId: user.uid,
                sharedWith: []
            })

            const testDoc = await Promise.race([writePromise, timeoutPromise]) as any
            results.write = true
            console.log('✅ Firestore WRITE OK, doc ID:', testDoc.id)
        } catch (error: any) {
            console.error('❌ Firestore WRITE FAIL:', error)
            console.error('❌ Error code:', error.code)
            console.error('❌ Error message:', error.message)
            results.error = error
        }

        return results

    } catch (error: any) {
        console.error('❌ Erro geral no teste:', error)
        results.error = error
        return results
    }
}

export function formatTestResults(results: any): string {
    let output = '🧪 RESULTADOS DO TESTE FIREBASE:\n\n'

    output += `🔐 Auth: ${results.auth ? '✅ OK' : '❌ FAIL'}\n`
    output += `   ${results.authDetails}\n\n`

    output += `🔥 Firestore: ${results.firestore ? '✅ OK' : '❌ FAIL'}\n`
    output += `   ${results.firestoreDetails}\n\n`

    output += `📖 Read: ${results.read ? '✅ OK' : '❌ FAIL'}\n`
    output += `✍️ Write: ${results.write ? '✅ OK' : '❌ FAIL'}\n\n`

    if (results.error) {
        output += `❌ ERRO:\n`
        output += `   Code: ${results.error.code || 'N/A'}\n`
        output += `   Message: ${results.error.message || 'N/A'}\n`
    }

    return output
}
