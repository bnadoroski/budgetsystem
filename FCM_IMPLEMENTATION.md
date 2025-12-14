# Firebase Cloud Messaging (FCM) para Notificações

## Visão Geral

O Firebase Cloud Messaging permite que o app receba notificações mesmo quando não está ativo. Isso é útil para:
- Receber alertas de despesas
- Sincronizar dados em background
- Notificações push de compartilhamento de budgets

## Arquitetura Atual vs FCM

### Atual (NotificationListener)
```
Banco → Notificação Android → NotificationListener → API Local → Vue App
```
**Limitações:**
- Funciona apenas quando app está aberto ou em background
- Precisa estar na mesma rede WiFi
- Permissão sensível (Play Protect bloqueia)

### Com FCM
```
Banco → Notificação Android → NotificationListener → Firebase Function → FCM → Vue App
```
**Vantagens:**
- Funciona de qualquer lugar (não precisa mesma WiFi)
- Mais confiável
- Menos problemas com Play Protect

## Implementação

### 1. Instalar Dependências

```bash
npm install @capacitor/push-notifications
npx cap sync
```

### 2. Adicionar Plugin no Capacitor

Edite `capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.budgetsystem.app',
  appName: 'Budget System',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    hostname: 'budgetsystem.app'
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
```

### 3. Criar Plugin Vue para FCM

Crie `src/plugins/FCMPlugin.ts`:

```typescript
import { PushNotifications } from '@capacitor/push-notifications';
import { useBudgetStore } from '@/stores/budget';

export async function initFCM() {
  // Request permission
  let permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== 'granted') {
    throw new Error('User denied permissions!');
  }

  // Register with Apple / Google to receive push via APNS/FCM
  await PushNotifications.register();

  // On success, we should be able to receive notifications
  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration success, token: ' + token.value);
    // Send token to your server
    sendTokenToServer(token.value);
  });

  // Some issue with your setup and push will not work
  PushNotifications.addListener('registrationError', (error) => {
    console.error('Error on registration: ' + JSON.stringify(error));
  });

  // Show us the notification payload if the app is open on our device
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received: ' + JSON.stringify(notification));
    
    // Parse notification data and add expense
    const budgetStore = useBudgetStore();
    if (notification.data.type === 'expense') {
      budgetStore.addExpenseToBudget(
        notification.data.budgetId,
        parseFloat(notification.data.amount),
        notification.data.description
      );
    }
  });

  // Method called when tapping on a notification
  PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
    console.log('Push action performed: ' + JSON.stringify(notification));
  });
}

async function sendTokenToServer(token: string) {
  const userId = localStorage.getItem('userId');
  if (!userId) return;

  try {
    // Save token to Firestore
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('@/config/firebase');
    
    await setDoc(doc(db, 'users', userId, 'devices', 'current'), {
      fcmToken: token,
      updatedAt: new Date()
    });
    
    console.log('✅ FCM token saved to Firestore');
  } catch (error) {
    console.error('❌ Error saving FCM token:', error);
  }
}
```

### 4. Inicializar FCM no App.vue

No `App.vue`, no `onMounted`:

```typescript
import { initFCM } from '@/plugins/FCMPlugin'

onMounted(async () => {
  await authStore.checkRedirectResult()

  if (authStore.user) {
    await budgetStore.loadBudgets(authStore.user.uid)
    await budgetStore.loadGroups(authStore.user.uid)
    await budgetStore.startSharedBudgetsListener(authStore.user.uid)
    
    // Initialize FCM
    try {
      await initFCM()
      console.log('✅ FCM initialized')
    } catch (error) {
      console.error('❌ FCM initialization failed:', error)
    }
  }
})
```

### 5. Criar Firebase Cloud Function

No Firebase Console, crie uma Cloud Function que recebe notificações e envia via FCM:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const sendExpenseNotification = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { userId, amount, bank, description, category } = req.body;

  // Get user's FCM token
  const deviceDoc = await admin.firestore()
    .collection('users')
    .doc(userId)
    .collection('devices')
    .doc('current')
    .get();

  const fcmToken = deviceDoc.data()?.fcmToken;

  if (!fcmToken) {
    res.status(404).send('FCM token not found');
    return;
  }

  // Send notification
  const message = {
    token: fcmToken,
    notification: {
      title: `Nova despesa: R$ ${amount}`,
      body: `${bank} - ${description}`
    },
    data: {
      type: 'expense',
      amount: amount.toString(),
      bank,
      description,
      category
    }
  };

  try {
    await admin.messaging().send(message);
    res.status(200).send('Notification sent successfully');
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).send('Error sending notification');
  }
});
```

### 6. Atualizar NotificationListener.kt

Mude o endpoint para chamar a Cloud Function em vez do servidor local:

```kotlin
private fun sendToServer(result: BankNotificationParser.ParseResult) {
    CoroutineScope(Dispatchers.IO).launch {
        try {
            val url = URL("https://us-central1-YOUR-PROJECT.cloudfunctions.net/sendExpenseNotification")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.requestMethod = "POST"
            connection.setRequestProperty("Content-Type", "application/json")
            connection.doOutput = true
            
            val jsonData = JSONObject().apply {
                put("userId", getUserId()) // Get from shared preferences
                put("amount", result.amount)
                put("bank", result.bank)
                put("description", result.description)
                put("category", result.category)
            }
            
            connection.outputStream.use { os ->
                os.write(jsonData.toString().toByteArray())
            }
            
            val responseCode = connection.responseCode
            Log.d(TAG, "Response code: $responseCode")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error sending to server", e)
        }
    }
}
```

## Firebase Console - Configurações

1. Vá em **Project settings** → **Cloud Messaging**
2. Copie o **Server key** (para usar nas Cloud Functions)
3. Baixe o `google-services.json` e coloque em `android/app/`

## Adicionar google-services.json

1. No Firebase Console, baixe `google-services.json`
2. Coloque em `android/app/google-services.json`
3. O Capacitor já está configurado para usar automaticamente

## Testar FCM

1. Compile e instale o app
2. Faça login
3. O app vai pedir permissão para notificações
4. Conceda a permissão
5. O FCM token será salvo no Firestore
6. Simule uma notificação bancária
7. A Cloud Function enviará via FCM
8. O app receberá e adicionará a despesa

## Vantagens do FCM

✅ Funciona de qualquer lugar (não precisa WiFi)  
✅ Mais confiável que servidor local  
✅ Suporta notificações mesmo com app fechado  
✅ Integrado com Firebase  
✅ Menos problemas com Play Protect  

## Custos

- FCM é **gratuito** (sem limites)
- Cloud Functions: **125K invocações/mês grátis**
- Para app pessoal, estará dentro do plano gratuito

## Observação

Esta é uma alternativa mais robusta ao sistema atual. O sistema atual (NotificationListener → API local) continua funcionando para desenvolvimento e testes locais.
