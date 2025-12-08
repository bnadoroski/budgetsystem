# Funcionalidades de Grupos e Compartilhamento

## 📁 Grupos de Budgets

### O que são Grupos?
Grupos permitem organizar seus budgets em categorias, facilitando a visualização e controle. Por exemplo:
- **Contas Fixas**: Luz, Internet, Condomínio, Netflix
- **Lazer**: Cinema, Restaurantes, Viagens
- **Alimentação**: Supermercado, Delivery
- **Transporte**: Combustível, Uber, Manutenção

### Como usar:

1. **Criar Grupo**:
   - Clique no ícone de grade (4 quadrados) na barra inferior
   - Digite o nome do grupo (ex: "Contas Fixas")
   - Escolha uma cor para identificação visual
   - Clique em "Criar"

2. **Adicionar Budget a um Grupo**:
   - Ao criar um novo budget, selecione o grupo no dropdown "Grupo (opcional)"
   - Budgets sem grupo aparecem normalmente na lista principal

3. **Visualizar Grupos**:
   - Grupos aparecem como cards expansíveis
   - Clique no grupo para expandir/recolher e ver os budgets dentro dele
   - O total do grupo é exibido automaticamente

4. **Gerenciar Grupos**:
   - Editar nome ou cor do grupo
   - Excluir grupo (budgets não são deletados, apenas o agrupamento)
   - Ver quantidade de budgets em cada grupo

## 👥 Compartilhamento de Budgets

### O que é Compartilhamento?
Permite que você compartilhe seus budgets com outra pessoa (cônjuge, parceiro(a), familiar) para que ambos possam:
- Visualizar os mesmos budgets em tempo real
- Receber atualizações quando gastos são registrados em qualquer dispositivo
- Acompanhar juntos o controle financeiro familiar

### Como usar:

1. **Compartilhar Budget**:
   - Clique no ícone de compartilhar (3 círculos conectados) na barra inferior
   - Digite o email da pessoa com quem deseja compartilhar
   - Selecione os budgets que deseja compartilhar (clique para marcar/desmarcar)
   - Clique em "Compartilhar"

2. **Requisitos**:
   - A pessoa precisa ter uma conta no sistema (estar cadastrada)
   - Use o mesmo email que ela utilizou no cadastro
   - Ambos precisam estar autenticados

3. **Sincronização em Tempo Real**:
   - Quando um gasto é registrado no telefone de uma pessoa, o app da outra atualiza automaticamente
   - Funciona com notificações bancárias capturadas no Android
   - Não importa de qual dispositivo veio a notificação

4. **Remover Compartilhamento**:
   - Na seção "Budgets já compartilhados", clique em "Remover"
   - O budget deixa de ser visível para a outra pessoa

## 🔄 Fluxo de Uso - Exemplo Casal

### Cenário:
Bruna e seu marido querem controlar juntos os gastos da casa.

### Configuração:

1. **Bruna**:
   - Cria grupos: "Contas Fixas", "Supermercado", "Lazer"
   - Adiciona budgets:
     - Luz (R$ 200) → Contas Fixas
     - Internet (R$ 100) → Contas Fixas
     - Netflix (R$ 50) → Contas Fixas
     - Mercado (R$ 1000) → Supermercado
     - Restaurantes (R$ 400) → Lazer
   
2. **Compartilhamento**:
   - Bruna compartilha todos os budgets com o email do marido
   - Marido vê os mesmos budgets no app dele

3. **Uso diário**:
   - Marido recebe notificação de débito no cartão (R$ 150 - Supermercado)
   - Plugin Android captura a notificação
   - Budget "Mercado" é atualizado: R$ 150 / R$ 1000
   - **Ambos os apps atualizam em tempo real via Firebase**
   - Bruna vê a atualização mesmo sem receber a notificação

## 🔧 Estrutura Técnica

### Firebase Collections:

```
users/
  {userId}/
    budgets/
      {budgetId}
        - name: string
        - totalValue: number
        - spentValue: number
        - color: string
        - groupId?: string
        - ownerId: string
        - sharedWith: string[] // Array de userIds
    
    budgetGroups/
      {groupId}
        - name: string
        - color: string
        - isExpanded: boolean

sharedBudgets/ (coleção global)
  {budgetId}
    - (cópia do budget)
    - sharedWith: string[]
```

### Listeners:
- `startBudgetsListener()` - Monitora budgets próprios
- `startSharedBudgetsListener()` - Monitora budgets compartilhados
- `startGroupsListener()` - Monitora grupos

### Componentes:
- `BudgetGroup.vue` - Card de grupo expansível
- `GroupsModal.vue` - Gerenciamento de grupos
- `ShareBudgetModal.vue` - Interface de compartilhamento
- `AddBudgetModal.vue` - Atualizado com seleção de grupo

## 💡 Dicas:

1. **Organize por Frequência**: Agrupe contas que você paga mensalmente juntas
2. **Use Cores Consistentes**: Mantenha grupos relacionados com cores similares
3. **Compartilhe Seletivamente**: Não precisa compartilhar todos os budgets
4. **Verifique Email**: Certifique-se de usar o email exato do cadastro
5. **Mantenha Sincronizado**: Ambos os usuários devem manter o app aberto para receber atualizações em tempo real

## 🔐 Segurança:

- Apenas usuários autenticados podem compartilhar
- Compartilhamento é explícito (precisa do email)
- Cada usuário mantém controle sobre seus próprios budgets
- Remover compartilhamento é reversível
- Dados sincronizados via Firebase Firestore com regras de segurança
