# Debug de Transações Não Aparecendo

## Problema
As transações não estão aparecendo na modal "Ver Lançamentos", mesmo quando o budget tem 50% de uso e uma transação foi criada.

## Mudanças Implementadas

### 1. AggregatedBudgetBar - Paridade com BudgetBar
✅ Adicionado botão "Ver Lançamentos"
✅ Alterado reset para usar modal de confirmação
✅ Conectado eventos no App.vue

### 2. Logs de Debug Adicionados

#### Em budget.ts - saveTransaction
```typescript
console.log('💾 Salvando transação:', transaction)
console.log('✅ Transação salva com ID:', docRef.id)
```

#### Em budget.ts - loadTransactions
```typescript
console.log('🔍 Carregando transações para budget:', budgetId, 'userId:', authStore.userId)
console.log('📊 Transações encontradas:', snapshot.docs.length)
console.log('✅ Transações carregadas:', result)
```

#### Em TransactionsModal.vue
```typescript
console.log('🔄 TransactionsModal: Carregando transações para budgetId:', props.budgetId)
console.log('📦 TransactionsModal: Transações recebidas:', transactions.value.length)
```

## Como Testar

### 1. Abrir DevTools (F12)
- Abra o Console do navegador
- Limpe o console (Ctrl + L)

### 2. Criar uma Nova Transação
Opção A - Aprovar despesa pendente:
1. Abra "Despesas Pendentes"
2. Aprove uma despesa
3. Observe os logs: `💾 Salvando transação` e `✅ Transação salva com ID`

Opção B - Adicionar manualmente:
1. Edite um budget
2. Vá em "Adicionar Gasto Manual"
3. Preencha os campos e salve
4. Observe os logs

### 3. Ver Lançamentos
1. Clique nos 3 pontos de um budget
2. Clique em "Ver Lançamentos"
3. Observe os logs:
   - `🔄 TransactionsModal: Carregando transações`
   - `🔍 Carregando transações para budget`
   - `📊 Transações encontradas: X`

## Possíveis Causas

### 1. Índice não criado no Firestore
Se aparecer erro no console sobre índice composto:
```
The query requires an index. You can create it here: [URL]
```

**Solução:**
- Clique no link fornecido pelo Firebase
- Aguarde alguns minutos para o índice ser criado
- Tente novamente

### 2. BudgetId diferente
Verifique nos logs:
- O `budgetId` usado ao salvar deve ser o mesmo ao carregar
- Compare os logs: `💾 Salvando transação` vs `🔍 Carregando transações`

### 3. Transações não sendo salvas
Se não aparecer log `✅ Transação salva com ID`:
- Verifique se há erros no console
- Verifique permissões do Firestore
- Verifique se o usuário está autenticado

### 4. Query falhando silenciosamente
Se aparecer `📊 Transações encontradas: 0` mas deveria ter dados:
- Abra Firebase Console
- Vá em Firestore Database
- Navegue até: `users/{seu-userId}/transactions`
- Verifique se há documentos ali
- Compare o `budgetId` dos documentos com o que está sendo buscado

## Verificação no Firebase Console

1. Acesse https://console.firebase.google.com
2. Selecione seu projeto
3. Vá em "Firestore Database"
4. Navegue até: `users/{userId}/transactions`
5. Verifique:
   - Se existem documentos de transações
   - Se o campo `budgetId` está correto
   - Se o campo `createdAt` existe
   - Se todos os campos obrigatórios estão presentes

## Próximos Passos

1. **Executar a aplicação** e testar criação de transação
2. **Observar logs** no console
3. **Reportar resultados**:
   - Logs que aparecem
   - Erros no console
   - Estado no Firestore
   
Com essas informações, podemos identificar exatamente onde está o problema!
