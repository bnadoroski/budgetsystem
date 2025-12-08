# Vitest - Testes Unitários

## Configuração

Este projeto usa [Vitest](https://vitest.dev/) com **Happy-DOM** para testes unitários de componentes Vue 3 e stores Pinia.

### Comandos disponíveis:

```bash
# Rodar testes em modo watch (recarrega ao salvar)
npm test

# Rodar testes uma vez
npm run test:run

# Abrir interface visual dos testes
npm run test:ui

# Gerar relatório de cobertura
npm run coverage
```

## Estrutura de testes:

- `src/stores/__tests__/` - Testes das stores Pinia
- `src/components/__tests__/` - Testes dos componentes Vue
- `vitest.setup.ts` - Configuração global dos testes
- `vite.config.ts` - Configuração do Vitest

## Testes implementados:

### Budget Store (`budget.spec.ts`) - 20 testes ✅
**Funcionalidades Básicas:**
- ✅ Inicialização com arrays vazios (budgets, groups, history)
- ✅ Dia de reset padrão como 5
- ✅ Cálculo de porcentagem correto
- ✅ Limite de porcentagem em 100% quando excede
- ✅ Tratamento de valor total zero
- ✅ Configuração de moeda
- ✅ Toggle dark mode
- ✅ Definir limite de orçamento
- ✅ Validação de dia de reset (1-28)
- ✅ Filtrar budgets por grupo

**Histórico e Reset Mensal:**
- ✅ Definir dia de reset dentro do intervalo válido
- ✅ Inicialização com histórico vazio
- ✅ Função loadHistory existe e é callable
- ✅ Função resetMonthlyBudgets existe e é callable
- ✅ Função checkAndResetBudgets existe e é callable
- ✅ Carregamento do dia de reset do localStorage

### BudgetBar Component (`BudgetBar.spec.ts`) - 7 testes ✅
- ✅ Renderizar nome do budget
- ✅ Exibir porcentagem por padrão
- ✅ Toggle entre porcentagem e valores ao clicar
- ✅ Aplicar gradiente de cor correto
- ✅ Largura da barra baseada na porcentagem
- ✅ Lidar com valor gasto zero
- ✅ Limitar em 100% quando excedido

### BudgetGroup Component (`BudgetGroup.spec.ts`) - 5 testes ✅
- ✅ Renderizar nome do grupo
- ✅ Mostrar contagem de budgets no grupo
- ✅ Calcular total corretamente
- ✅ Toggle expansão ao clicar no header
- ✅ Exibir cor do grupo

### HistoryModal Component (`HistoryModal.spec.ts`) - 12 testes ✅
**Renderização e Interação:**
- ✅ Renderizar quando show é true
- ✅ Não renderizar quando show é false
- ✅ Emitir evento close ao clicar no botão fechar
- ✅ Exibir nome do mês no header

**Exibição de Dados:**
- ✅ Mostrar estado vazio quando não há histórico
- ✅ Calcular porcentagem corretamente
- ✅ Formatar moeda corretamente
- ✅ Limitar porcentagem em 100%

**Cálculos Financeiros:**
- ✅ Calcular total orçado do histórico
- ✅ Calcular total gasto do histórico
- ✅ Calcular diferença (economizado/excedido)
- ✅ Escurecer cores para gradientes

## Mocks configurados:

- **Firebase Auth**: Mock completo do sistema de autenticação
- **Firestore**: Mock das funções de banco de dados
- **localStorage**: Mock para testes isolados
- **window.matchMedia**: Mock para responsividade

## Resultado atual:

```
✓ src/stores/__tests__/budget.spec.ts (20 tests)
✓ src/components/__tests__/BudgetGroup.spec.ts (5 tests)
✓ src/components/__tests__/BudgetBar.spec.ts (7 tests)
✓ src/components/__tests__/HistoryModal.spec.ts (12 tests)

Test Files  4 passed (4)
     Tests  44 passed (44)
  Duration  1.25s
```

## Executando os testes:

```bash
npm test
```

A interface visual pode ser acessada com:

```bash
npm run test:ui
```

## Cobertura de código:

Para gerar relatório de cobertura:

```bash
npm run coverage
```

O relatório será gerado em `coverage/index.html`

