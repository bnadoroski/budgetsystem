# Resumo das Implementações - Budget System

## ✅ Concluído

### 1. Modal de Login Persistente
- **Arquivo**: `src/components/AuthModal.vue`
- **Mudança**: Adicionada prop `persist` que impede fechar o modal quando `true`
- **App.vue**: Modal é aberta automaticamente quando deslogado e não pode ser fechada

### 2. Modal de Convite Única
- **Arquivo**: `src/types/budget.ts`
- **Mudança**: Adicionado campo `viewedAt` em `ShareInvite`
- **Store**: Função `markInviteAsViewed()` criada
- **App.vue**: Modal aparece apenas para convites não vistos
- **ProfileModal**: Convites pendentes podem ser revistos pelo perfil

### 3. App Sempre Awake
- **Arquivo**: `android/app/src/main/java/com/budgetsystem/app/NotificationListenerService.java`
- **Mudanças**:
  - Foreground service implementado
  - Wake lock parcial adquirido
  - Notificação persistente mostrando status
  - Reconexão automática se desconectar
- **AndroidManifest.xml**: Permissões adicionadas (WAKE_LOCK, FOREGROUND_SERVICE, REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)

### 4. Estrutura de Dados para Comércios
- **Arquivo**: `src/types/budget.ts`
- **Novos tipos**:
  - `Merchant`: Comerciantes/estabelecimentos detectados
  - `MerchantBudgetMapping`: Mapeamento comércio -> budget
  - `Transaction`: Transações completas com parcelas
  - Adicionado `hiddenBy` em `Budget` para usuários que ocultaram budgets compartilhados

## 🚧 Pendente de Implementação

### 5. Análise de Nome de Comércio
**Arquivos a modificar:**
- `NotificationListenerService.java` - Extrair nome do comércio do texto
- `src/stores/budget.ts` - Funções para salvar merchants e sugestões
- `src/components/PendingExpensesModal.vue` - Exibir sugestões de budget baseadas em merchants

**Lógica**:
1. Extrair nome do estabelecimento da notificação
2. Normalizar nome (lowercase, remover acentos)
3. Buscar em `MerchantBudgetMapping` do usuário
4. Se não encontrar, buscar de outros usuários
5. Sugerir budget baseado no histórico

### 6. Sistema de Convites Aprimorado
**Funcionalidades**:
- Enviar email de convite (usando Firebase Functions ou similar)
- Notificações in-app quando convite é aceito/rejeitado
- Feedback visual de novos budgets compartilhados
- Badge de "novo" em budgets recém-compartilhados

### 7. Funcionalidades de Budgets Compartilhados
**Regras**:
- Não-criador pode ocultar budget (usar `hiddenBy`)
- Mostrar valores separados: "R$ 100,00 / R$ 20,00" (usuário/compartilhador)
- Consolidar budgets com mesmo nome (usar maior valor, cor do criador)
- Resetar apenas a parte do usuário

### 8. Persistir Despesas Pendentes
**Mudança**: 
- Salvar `pendingExpenses` no Firestore
- Atualmente só está em localStorage
- Criar coleção `users/{userId}/pendingExpenses`

### 9. Sistema de Registro de Lançamentos
**Componente novo**: `TransactionsModal.vue`
- Listar todas as transações de um budget
- CRUD: editar, excluir, transferir para outro budget
- Mostrar parcelas (ex: "3/12")
- Filtros e busca

**Store**: Adicionar funções para gerenciar `Transaction`

### 10. Modal de Confirmação para Reset
**Componente novo**: `ConfirmResetModal.vue`
- Confirmar antes de resetar budget
- Mostrar quanto será perdido
- Opção de salvar no histórico

### 11. Sistema de Parcelas
**Funcionalidades**:
- Campo na modal de despesa pendente para marcar como parcelado
- Input de número de parcelas
- Detectar parcelas automático na notificação (regex para "1/12", "parcela 1 de 12", etc)
- Ao resetar budget, incrementar contador de parcela
- Exibir "Parcela X/Y" nas transações

**Arquivos**:
- `PendingExpensesModal.vue` - Adicionar campos
- `NotificationListenerService.java` - Detectar parcelas
- `TransactionsModal.vue` - Exibir parcelas
- `budget.ts` store - Lógica de incremento

### 12. Notificações e Badges
**Funcionalidades**:
- Descomentar em `SettingsModal.vue` opção de notificações
- Notificar se não abrir app em 15+ dias
- Notificar se tem pendentes com +1 dia
- Badge do Android (usar NotificationManager)

**Arquivos**:
- `SettingsModal.vue` - Habilitar notificações
- Criar serviço para notificações push (Firebase Cloud Messaging)
- `NotificationPlugin.ts` - Funções para badges

### 13. Remover Opção de Moeda
**Arquivos a modificar**:
- `SettingsModal.vue` - Comentar seleção de moeda
- `src/stores/budget.ts` - Comentar lógica de currency
- Todos componentes - Remover opção de escolher moeda
- Hardcode para "R$" e "BRL"

## 📁 Arquivos Novos Necessários

1. `src/components/TransactionsModal.vue` - Modal de lançamentos
2. `src/components/ConfirmResetModal.vue` - Confirmação de reset
3. `src/utils/merchantExtractor.ts` - Extrair nome de comércio de texto
4. `src/utils/textNormalizer.ts` - Normalizar texto (remover acentos, etc)

## 🔧 Modificações Grandes Necessárias

### budget.ts Store
Adicionar funções:
- `saveMerchant(name: string)`
- `getMerchantSuggestion(merchantName: string)`
- `saveMerchantMapping(merchantId: string, budgetId: string)`
- `saveTransaction(transaction: Transaction)`
- `updateTransaction(id: string, updates: Partial<Transaction>)`
- `deleteTransaction(id: string)`
- `transferTransaction(id: string, newBudgetId: string)`
- `getTransactions(budgetId: string)`
- `savePendingExpenses()` - Para Firestore
- `loadPendingExpenses()` - Do Firestore

### NotificationListenerService.java
- Adicionar extração de nome de comércio
- Detectar parcelas no texto
- Enviar dados extras: `merchantName`, `installmentNumber`, `installmentTotal`

### PendingExpensesModal.vue
- Checkbox "Parcelado"
- Input número de parcelas
- Mostrar sugestão de budget baseada em merchant

## 🎯 Prioridade de Implementação

**Alta Prioridade**:
1. Sistema de parcelas (muito solicitado)
2. Persistir despesas pendentes no Firestore
3. Análise de nome de comércio
4. Modal de confirmação para reset

**Média Prioridade**:
5. Sistema de lançamentos
6. Funcionalidades avançadas de budgets compartilhados
7. Notificações e badges

**Baixa Prioridade**:
8. Remover opção de moeda (simples mas pouco impacto)
9. Sistema de convites aprimorado (email, etc)
