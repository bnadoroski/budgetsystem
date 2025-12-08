# Budget System

Sistema de controle de orçamento pessoal desenvolvido com Vue 3 e integração Android para rastreamento automático de gastos via notificações bancárias.

## 🎯 Funcionalidades

### Aplicação Web (Vue 3)
- **Interface Intuitiva**: Lista de budgets com barras de progresso coloridas
- **Visualização Dupla**: Alterne entre porcentagem e valores reais clicando no budget
- **Gerenciamento de Budgets**: Crie, edite e acompanhe múltiplos orçamentos
- **Persistência Local**: Dados salvos no localStorage do navegador
- **Design Responsivo**: Interface otimizada para mobile e desktop

### Plugin Android (Kotlin)
- **Listener de Notificações**: Monitora notificações de apps bancários automaticamente
- **Detecção Inteligente**: Identifica transações de 12+ bancos brasileiros
- **Extração de Valores**: Parser regex avançado para detectar valores monetários
- **Integração Automática**: Envia gastos para o app Vue via API REST

## 🏗️ Estrutura do Projeto

```
budgetsystem/
├── src/
│   ├── components/
│   │   ├── BudgetBar.vue          # Barra de progresso individual
│   │   └── AddBudgetModal.vue     # Modal para criar novo budget
│   ├── stores/
│   │   └── budget.ts              # Gerenciamento de estado (Pinia)
│   ├── types/
│   │   └── budget.ts              # Definições TypeScript
│   └── App.vue                    # Componente principal
│
└── android-plugin/
    └── app/src/main/java/com/budgetsystem/
        ├── NotificationListener.kt      # Serviço de escuta
        ├── BankNotificationParser.kt    # Parser de notificações
        └── MainActivity.kt              # Activity principal
```

## 🚀 Como Usar

### Aplicação Web

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Iniciar servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   
   Acesse: http://localhost:5173

3. **Build para produção:**
   ```bash
   npm run build
   ```

### Plugin Android

1. Abra a pasta `android-plugin` no Android Studio
2. Sincronize o Gradle
3. Execute em dispositivo Android (API 18+)
4. Conceda permissão de acesso a notificações:
   - Configurações > Notificações > Acesso a notificações
   - Ative "Budget System"

## 💡 Como Funciona

### Interface Web

1. **Criar Budget**: Clique no botão "+" e preencha nome e valor total
2. **Visualizar Progresso**: Veja barras coloridas com percentual gasto
3. **Alternar Visualização**: Clique na barra para ver valores em R$ ao invés de %
4. **Adicionar Gastos**: (Via plugin Android ou manualmente no futuro)

### Plugin Android

O plugin monitora automaticamente notificações de:
- Nubank, Banco do Brasil, Bradesco, Itaú, Caixa
- Santander, Inter, C6 Bank, PicPay, entre outros

Quando detecta uma compra/pagamento:
1. Extrai o valor da notificação
2. Identifica o banco
3. Envia para o app Vue via HTTP
4. Budget correspondente é atualizado automaticamente

## 🛠️ Tecnologias

- **Frontend**: Vue 3, TypeScript, Pinia, Vite
- **Mobile**: Kotlin, Android SDK
- **APIs**: NotificationListenerService, LocalStorage

## 📱 Bancos Suportados

✅ Nubank • Banco do Brasil • Bradesco • Itaú • Caixa • Santander  
✅ Inter • C6 Bank • PicPay • Original • Neon • Will Bank

## 🔜 Próximas Funcionalidades

- [ ] Backend Node.js para sincronização entre dispositivos
- [ ] Categorização automática de gastos
- [ ] Relatórios e gráficos de despesas
- [ ] Notificações quando ultrapassar budget
- [ ] Exportar dados para CSV/Excel
- [ ] Dark mode

## 📄 Licença

Projeto desenvolvido para fins educacionais e de controle financeiro pessoal.
