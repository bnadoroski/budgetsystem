# Android Notification Listener Plugin

Este plugin Android monitora notificações bancárias e extrai automaticamente valores de transações.

## Estrutura do Projeto

```
android-plugin/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/com/budgetsystem/
│   │       │   ├── NotificationListener.kt
│   │       │   ├── BankNotificationParser.kt
│   │       │   └── MainActivity.kt
│   │       └── AndroidManifest.xml
│   └── build.gradle
└── build.gradle
```

## Funcionalidades

- **NotificationListenerService**: Monitora todas as notificações do sistema
- **Detecção de Bancos**: Identifica notificações de aplicativos bancários
- **Extração de Valores**: Usa regex para extrair valores monetários
- **API REST**: Envia dados para o aplicativo Vue 3

## Configuração

### 1. Permissões Necessárias

O app precisa de permissão para acessar notificações. O usuário deve:
1. Ir em Configurações > Notificações > Acesso a notificações
2. Ativar o "Budget System"

### 2. Bancos Suportados

- Nubank
- Banco do Brasil
- Bradesco
- Itaú
- Caixa
- Santander
- Inter
- C6 Bank
- PicPay

### 3. Padrões de Detecção

O parser detecta padrões como:
- "Compra aprovada no valor de R$ 150,00"
- "Você gastou R$ 75,50"
- "Pagamento de R$ 1.200,00 realizado"
- "Débito: R$ 45,90"

## Instalação

1. Abra o projeto no Android Studio
2. Sincronize o Gradle
3. Execute em um dispositivo Android (API 18+)
4. Conceda permissão de acesso a notificações

## Integração com Vue 3

O plugin se comunica com o app Vue através de:
- **Local**: WebSocket (ws://localhost:3000)
- **Remoto**: HTTP REST API

Dados enviados:
```json
{
  "type": "expense",
  "amount": 150.00,
  "bank": "Nubank",
  "description": "Compra aprovada",
  "timestamp": "2025-12-08T10:30:00Z"
}
```

## Desenvolvimento

Para testar o parser sem notificações reais:
```kotlin
val parser = BankNotificationParser()
val result = parser.parseNotification(
    "com.nu.production",
    "Compra aprovada no valor de R$ 150,00"
)
```

## Build

```bash
./gradlew assembleDebug
```

O APK gerado estará em: `app/build/outputs/apk/debug/`
