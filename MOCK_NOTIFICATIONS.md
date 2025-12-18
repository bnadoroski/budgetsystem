# 🧪 Sistema de Notificações Mock de Banco

## Como Testar Notificações

### 1. Compilar e instalar o app
```powershell
npm run build
npx cap sync
cd android
.\gradlew assembleDebug
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

### 2. Executar o script de mock
```powershell
.\mock-notifications.ps1
```

### 3. Opções do Script

#### Opção 1: Notificações do C6 Bank (como na imagem)
Gera as mesmas notificações que você mostrou:
- Compra de R$ 194,65 no BAZAR DA CASA
- Compra de R$ 276,00 no Pinhit

#### Opção 2: Notificações variadas de bancos
Gera 4 notificações de diferentes bancos:
- C6 Bank
- Nubank
- Banco Inter
- Itaú

#### Opção 3: Notificação customizada
Permite criar sua própria notificação informando:
- Nome do banco
- Título
- Texto
- Valor

#### Opção 4: Notificações aleatórias
Gera múltiplas notificações aleatórias (você escolhe quantas)

### 4. Ver os logs do app

Para acompanhar o que está acontecendo:

```powershell
# Ver logs do NotificationPlugin
adb logcat | Select-String "BudgetNotif"

# Ver logs gerais do app
adb logcat | Select-String "budgetsystem"

# Limpar logs e ver em tempo real
adb logcat -c
adb logcat
```

### 5. Testar manualmente via ADB

Você também pode enviar notificações manualmente:

```powershell
# Exemplo básico
adb shell am broadcast -a com.budgetsystem.MOCK_NOTIFICATION --es bank "C6 Bank" --es title "Compra aprovada" --es text "Compra de R$ 50,00 aprovada" --es amount "50.00"

# Exemplo completo (como as imagens)
adb shell am broadcast -a com.budgetsystem.MOCK_NOTIFICATION --es bank "C6 Bank" --es title "Compra no crédito aprovada" --es text "Sua compra no cartão final 9428 no valor de R$ 194,65, dia 17/12/2025 às 16:45, em BAZAR DA CASA Curitiba BRA, foi aprovada." --es amount "194.65"
```

## Arquivos Criados

- **mock-notifications.ps1** - Script interativo para gerar notificações
- **MockNotificationReceiver.java** - Receiver Android que processa os broadcasts
- **AndroidManifest.xml** - Atualizado com registro do receiver

## Como Funciona

1. O script PowerShell usa `adb` para enviar um broadcast
2. O `MockNotificationReceiver` intercepta o broadcast
3. O receiver extrai os dados (banco, título, texto, valor)
4. Os dados são enviados para o `NotificationPlugin`
5. O plugin adiciona a transação como "pending expense"
6. Aparece no app para aprovação/rejeição

## Solução do Erro de Compartilhamento

Também corrigi o erro ao aceitar convites:
- ❌ Antes: Tentava buscar userId por email (query no Firestore)
- ✅ Agora: Usa o `fromUserId` que já vem no convite
- ✅ Adicionado: Função `updateSharedBudgets()` para gerenciar budgets compartilhados

## Próximos Passos

1. Compile e instale o APK atualizado
2. Execute `.\mock-notifications.ps1`
3. Escolha uma opção (recomendo opção 1 ou 2 primeiro)
4. Acompanhe os logs com `adb logcat | Select-String "BudgetNotif"`
5. Verifique no app se as transações aparecem em "Pending Expenses"
