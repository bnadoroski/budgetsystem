# Notificações Push com Firebase Cloud Messaging (FCM)

Este documento explica como o sistema de notificações push funciona no Budget System usando Firebase Cloud Messaging.

## Arquitetura

### 1. Componentes Android

#### FCMPlugin.java
Plugin Capacitor que expõe funcionalidades FCM para o código TypeScript:
- `getToken()`: Obtém o token FCM do dispositivo
- `setBadge(count)`: Define o contador de badge no ícone do app
- `clearBadge()`: Limpa o badge
- `showLocalNotification()`: Exibe notificação local

#### FCMService.java
Serviço Android que recebe mensagens FCM:
- `onMessageReceived()`: Processa notificações recebidas
- `onNewToken()`: Atualiza token quando renovado
- `handleDataPayload()`: Processa tipos de notificação:
  - `invite_response`: Convite aceito/recusado
  - `pending_expenses`: Despesas pendentes
  - `inactivity`: Usuário inativo há 15+ dias

### 2. Componentes Frontend

#### FCMPlugin.ts
Interface TypeScript para o plugin Android:
```typescript
interface FCMPlugin {
  getToken(): Promise<{ token: string }>
  setBadge(options: { count: number }): Promise<void>
  clearBadge(): Promise<void>
  showLocalNotification(options: {
    title: string
    body: string
    data?: Record<string, any>
  }): Promise<void>
}
```

#### Stores

**auth.ts**
- Registra token FCM no Firestore quando usuário loga
- Remove token quando usuário desloga
- Armazena em: `users/{userId}/fcmToken`

**budget.ts**
- `sendInviteNotification()`: Notifica quando convite é respondido
- `sendPendingExpensesNotification()`: Notifica despesas antigas (>1 dia)
- `sendInactivityNotification()`: Notifica inatividade (15+ dias)
- `updateBadgeCount()`: Atualiza badge com quantidade de despesas pendentes

### 3. Sistema de Toast

#### ToastNotification.vue
Componente de feedback visual para ações do usuário:
- Tipos: `success`, `error`, `warning`, `info`
- Animações suaves de entrada/saída
- Auto-dismiss após 3 segundos (configurável)

#### useToast.ts
Composable para exibir toasts globalmente:
```typescript
const { success, error, warning, info } = useToast()
success('Budget criado com sucesso!')
error('Erro ao salvar budget')
```

## Fluxo de Notificações

### 1. Registro de Token

```
Usuário loga
  ↓
onAuthStateChanged (auth.ts)
  ↓
FCM.getToken()
  ↓
Salva em Firestore: users/{userId}/fcmToken
```

### 2. Convite Aceito/Rejeitado

```
Usuário B responde convite
  ↓
acceptShareInvite() ou rejectShareInvite()
  ↓
sendInviteNotification(userId, budgetName, accepted)
  ↓
Busca token FCM do Usuário A no Firestore
  ↓
FCM.showLocalNotification()
  ↓
Notificação exibida para Usuário A
```

### 3. Despesas Pendentes

```
Cron job / App aberto
  ↓
sendPendingExpensesNotification()
  ↓
Filtra despesas com >24h
  ↓
FCM.showLocalNotification()
  ↓
Notificação: "Você tem X despesas pendentes"
```

### 4. Inatividade

```
Cron job diário
  ↓
sendInactivityNotification()
  ↓
Verifica users/{userId}/lastActiveAt
  ↓
Se >15 dias: FCM.showLocalNotification()
  ↓
Notificação: "Sentimos sua falta!"
```

### 5. Badge do App

```
addPendingExpense() ou approvePendingExpense()
  ↓
savePendingExpensesToFirestore()
  ↓
updateBadgeCount()
  ↓
FCM.setBadge({ count: pendingExpenses.length })
  ↓
Badge atualizado no ícone do app
```

## Configuração

### AndroidManifest.xml
```xml
<service
    android:name=".FCMService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

### Firestore Security Rules
```javascript
match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if request.auth != null && request.auth.uid == userId;
  
  // Permitir outros usuários lerem token FCM para notificações
  allow read: if request.auth != null && 
              resource.data.fcmToken != null;
}
```

## Tipos de Notificação

### invite_response
Enviada quando um convite é aceito ou recusado.

**Data:**
```json
{
  "type": "invite_response",
  "budgetName": "Alimentação",
  "accepted": "true"
}
```

**Título:** "Convite Aceito!" ou "Convite Recusado"  
**Body:** "{email} aceitou/recusou compartilhar o budget {name}"

### pending_expenses
Enviada quando há despesas pendentes há mais de 1 dia.

**Data:**
```json
{
  "type": "pending_expenses",
  "count": "3",
  "total": "150.50"
}
```

**Título:** "Despesas Pendentes"  
**Body:** "Você tem 3 despesa(s) pendente(s) totalizando R$ 150.50"

### inactivity
Enviada quando usuário não abre o app há 15+ dias.

**Data:**
```json
{
  "type": "inactivity",
  "days": "15"
}
```

**Título:** "Sentimos sua falta!"  
**Body:** "Você não acessa o app há mais de 15 dias. Seus budgets podem estar desatualizados!"

## UX - Feedback Visual

### Toasts
Feedback instantâneo para ações do usuário:

- ✓ **Success**: Verde - "Budget criado com sucesso!"
- ✕ **Error**: Vermelho - "Erro ao salvar budget"
- ⚠ **Warning**: Laranja - "Budget próximo do limite"
- ℹ **Info**: Azul - "Convite recusado"

### Animações CSS

**Globais (base.css):**
- `fadeIn`, `fadeOut`: Opacidade
- `slideUp`, `slideDown`: Deslizar vertical
- `scaleIn`: Crescer do centro
- `bounce`: Pular
- `pulse`: Pulsar
- `shake`: Tremer

**Classes utilitárias:**
```css
.animate-fade-in
.animate-slide-up
.animate-scale-in
.animate-bounce
.animate-pulse
.animate-shake
```

**Skeleton loading:**
```html
<div class="skeleton" style="width: 200px; height: 20px;"></div>
```

### Transitions Vue

```vue
<Transition name="fade">
  <div v-if="show">Conteúdo</div>
</Transition>

<Transition name="slide">
  <Modal v-if="showModal" />
</Transition>
```

## Próximos Passos

### 1. Cloud Functions (Recomendado)
Para enviar notificações push reais via Firebase:

```javascript
// functions/index.js
exports.sendInviteNotification = functions.firestore
  .document('shareInvites/{inviteId}')
  .onUpdate(async (change, context) => {
    const after = change.after.data()
    if (after.status === 'accepted' || after.status === 'rejected') {
      const userDoc = await admin.firestore()
        .collection('users')
        .doc(after.fromUserId)
        .get()
      
      if (userDoc.exists && userDoc.data().fcmToken) {
        await admin.messaging().send({
          token: userDoc.data().fcmToken,
          notification: {
            title: after.status === 'accepted' ? 'Convite Aceito!' : 'Convite Recusado',
            body: `${after.toUserEmail} ${after.status === 'accepted' ? 'aceitou' : 'recusou'} seu convite`
          },
          data: {
            type: 'invite_response',
            inviteId: context.params.inviteId
          }
        })
      }
    }
  })
```

### 2. Scheduled Functions
Para notificações periódicas:

```javascript
exports.checkPendingExpenses = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .get()
    
    for (const userDoc of usersSnapshot.docs) {
      const pendingDoc = await admin.firestore()
        .collection('users')
        .doc(userDoc.id)
        .collection('data')
        .doc('pendingExpenses')
        .get()
      
      if (pendingDoc.exists) {
        const expenses = pendingDoc.data().expenses || []
        const oldExpenses = expenses.filter(e => 
          Date.now() - e.timestamp > 24 * 60 * 60 * 1000
        )
        
        if (oldExpenses.length > 0 && userDoc.data().fcmToken) {
          await admin.messaging().send({
            token: userDoc.data().fcmToken,
            notification: {
              title: 'Despesas Pendentes',
              body: `Você tem ${oldExpenses.length} despesa(s) pendente(s)`
            }
          })
        }
      }
    }
  })
```

### 3. Background Sync
Sincronizar dados em background quando notificação é recebida.

### 4. Action Buttons
Adicionar botões nas notificações para ações rápidas:
```java
NotificationCompat.Action approveAction = new NotificationCompat.Action.Builder(
    R.drawable.ic_check,
    "Aprovar",
    approvePendingIntent
).build();
```

## Troubleshooting

### Token não registrado
- Verificar se `google-services.json` está configurado
- Verificar permissões no AndroidManifest
- Conferir se Firebase está inicializado

### Notificações não aparecem
- Verificar se app tem permissão de notificações
- Conferir canal de notificação criado (Android 8.0+)
- Ver logs do FCMService

### Badge não atualiza
- Alguns launchers não suportam badges
- Verificar se `ShortcutBadger` está funcionando
- Testar em diferentes devices/launchers

## Referências

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)
- [Android Notifications](https://developer.android.com/develop/ui/views/notifications)
- [Vue Transitions](https://vuejs.org/guide/built-ins/transition.html)
