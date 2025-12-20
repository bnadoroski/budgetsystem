# Melhorias de UX - Animações e Feedback Visual

Este documento descreve todas as melhorias de experiência do usuário implementadas no Budget System.

## 1. Sistema de Toast Notifications

### Componente: ToastNotification.vue

Toast são notificações temporárias que aparecem na parte inferior da tela para dar feedback instantâneo sobre ações do usuário.

#### Tipos de Toast

| Tipo | Cor | Ícone | Uso |
|------|-----|-------|-----|
| **success** | Verde (#4CAF50) | ✓ | Ações concluídas com sucesso |
| **error** | Vermelho (#F44336) | ✕ | Erros e falhas |
| **warning** | Laranja (#FF9800) | ⚠ | Avisos e alertas |
| **info** | Azul (#2196F3) | ℹ | Informações gerais |

#### Características

- **Duração:** 3 segundos (configurável)
- **Posição:** Bottom center
- **Animação:** Slide up (entrada) / Slide down (saída)
- **Auto-dismiss:** Sim
- **Responsivo:** Sim (max-width: 90vw)

#### Exemplo de Uso

```vue
<script setup>
import { useToast } from '@/composables/useToast'

const { success, error, warning, info } = useToast()

// Em qualquer lugar do código
success('Budget criado com sucesso!')
error('Erro ao salvar budget')
warning('Budget próximo do limite')
info('Convite enviado')
</script>
```

### Composable: useToast.ts

Gerencia a fila global de toasts.

```typescript
interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration: number
}

// API
const { toasts, showToast, removeToast, success, error, warning, info } = useToast()

// Uso
success('Mensagem', 3000) // duração opcional
```

## 2. Animações CSS Globais

### Arquivo: src/assets/base.css

#### Animações Disponíveis

##### fadeIn / fadeOut
Transição suave de opacidade.
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

##### slideUp / slideDown
Deslizar vertical com fade.
```css
@keyframes slideUp {
  from { 
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
```

##### scaleIn
Crescer do centro com fade.
```css
@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

##### bounce
Efeito de pulo.
```css
@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
```

##### pulse
Efeito de pulsar (crescer/diminuir).
```css
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

##### shake
Efeito de tremer (feedback de erro).
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}
```

#### Classes Utilitárias

Aplicar animações facilmente:

```html
<div class="animate-fade-in">Aparecer suavemente</div>
<div class="animate-slide-up">Deslizar de baixo</div>
<div class="animate-scale-in">Crescer do centro</div>
<div class="animate-bounce">Pular</div>
<div class="animate-pulse">Pulsar</div>
<div class="animate-shake">Tremer (erro)</div>
```

#### Skeleton Loading

Efeito de carregamento shimmer:

```html
<div class="skeleton" style="width: 200px; height: 20px;"></div>
<div class="skeleton" style="width: 100%; height: 40px; margin-top: 8px;"></div>
```

Animação automática de carregamento com gradiente deslizante.

## 3. Transitions Vue

### Transitions Globais

Definidas em `base.css`:

```vue
<!-- Fade -->
<Transition name="fade">
  <div v-if="show">Conteúdo</div>
</Transition>

<!-- Slide -->
<Transition name="slide">
  <Modal v-if="showModal" />
</Transition>

<!-- Scale -->
<Transition name="scale">
  <Component v-if="show" />
</Transition>
```

### Exemplo de Uso

```vue
<template>
  <Transition name="fade">
    <div v-if="visible" class="message">
      Mensagem aparecendo suavemente
    </div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue'
const visible = ref(false)

// visible = true → fade in
// visible = false → fade out
</script>
```

## 4. Feedback em Ações do Usuário

### Ações com Toast

| Ação | Toast | Tipo |
|------|-------|------|
| Criar budget | "Budget '{nome}' criado com sucesso!" | success |
| Editar budget | "Budget '{nome}' atualizado!" | success |
| Excluir budget | "Budget '{nome}' excluído!" | success |
| Adicionar despesa | "Despesa de R$ X adicionada" | success |
| Aprovar despesa pendente | "Despesa pendente adicionada!" | success |
| Aceitar convite | "Convite aceito! Budget compartilhado com você." | success |
| Recusar convite | "Convite recusado." | info |
| Erro genérico | "Erro ao {ação}. Tente novamente." | error |

### Animações em Componentes

#### BudgetBar
- Barra de progresso animada com transition
- Hover scale (1.02)
- Active scale (0.98)

#### Modals
- Entrada: scale-in
- Saída: scale-out
- Backdrop: fade

#### Buttons
- Hover: brightness(1.1)
- Active: scale(0.95)
- Transition: 200ms

## 5. Smooth Scroll

Scroll suave em toda a aplicação:
```css
html {
  scroll-behavior: smooth;
}
```

## 6. Focus Visible

Acessibilidade - outline apenas quando navegando por teclado:
```css
:focus-visible {
  outline: 2px solid #2196F3;
  outline-offset: 2px;
}
```

## 7. Loading States

### Skeleton Loading

Para listas e cards enquanto carregam:

```html
<!-- Budget skeleton -->
<div class="budget-skeleton">
  <div class="skeleton" style="width: 60%; height: 24px;"></div>
  <div class="skeleton" style="width: 100%; height: 8px; margin-top: 12px;"></div>
  <div class="skeleton" style="width: 40%; height: 16px; margin-top: 8px;"></div>
</div>
```

### Spinner

Para ações em andamento:

```html
<div class="spinner"></div>

<style>
.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid #2196F3;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
```

## 8. Micro-interações

### Hover Effects

```css
.button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.card:hover {
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}
```

### Click Feedback

```css
.button:active {
  transform: scale(0.95);
}
```

### Ripple Effect

Para botões importantes:

```html
<button class="ripple-button" @click="handleClick">
  Clique aqui
</button>

<style>
.ripple-button {
  position: relative;
  overflow: hidden;
}

.ripple-button::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255,255,255,0.5);
  transform: translate(-50%, -50%);
  transition: width 0.5s, height 0.5s;
}

.ripple-button:active::after {
  width: 200px;
  height: 200px;
}
</style>
```

## 9. Boas Práticas

### Performance

1. **Use `will-change` com cuidado:**
```css
.animated-element {
  will-change: transform, opacity;
}

/* Remove depois da animação */
.animated-element.done {
  will-change: auto;
}
```

2. **Prefira transforms e opacity:**
```css
/* ✓ Bom - GPU accelerated */
.element {
  transform: translateX(100px);
  opacity: 0.5;
}

/* ✗ Evite - Causa reflow */
.element {
  left: 100px;
  display: none;
}
```

3. **Use transition ao invés de animation quando possível:**
```css
/* Para hover/interações */
.button {
  transition: transform 0.2s;
}

.button:hover {
  transform: scale(1.1);
}
```

### Acessibilidade

1. **Respeite `prefers-reduced-motion`:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

2. **Forneça alternativas para animações:**
```vue
<template>
  <Transition :name="prefersReducedMotion ? 'fade' : 'slide'">
    <div v-if="show">Conteúdo</div>
  </Transition>
</template>

<script setup>
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
</script>
```

### Timing

Durações recomendadas:

| Tipo | Duração | Uso |
|------|---------|-----|
| Micro | 100-200ms | Hover, focus |
| Pequeno | 200-300ms | Dropdown, tooltip |
| Médio | 300-500ms | Modal, sidebar |
| Grande | 500-800ms | Page transition |

Easing functions:

```css
/* Entrada */
cubic-bezier(0.4, 0, 0.2, 1)

/* Saída */
cubic-bezier(0, 0, 0.2, 1)

/* Padrão (entrada/saída) */
cubic-bezier(0.4, 0, 0.2, 1)

/* Bounce */
cubic-bezier(0.68, -0.55, 0.265, 1.55)
```

## 10. Checklist de UX

- [x] Toast notifications para feedback
- [x] Animações CSS globais (fade, slide, scale, bounce, pulse, shake)
- [x] Skeleton loading para estados de carregamento
- [x] Smooth scroll
- [x] Focus visible para acessibilidade
- [x] Hover effects em botões e cards
- [x] Click feedback (scale down)
- [x] Transitions Vue (fade, slide, scale)
- [x] Toast em ações principais (criar, editar, deletar, convites)
- [x] Animações suaves em modais
- [ ] Ripple effect em botões principais (opcional)
- [ ] Page transitions (router) (opcional)
- [ ] Loading spinner global (opcional)
- [ ] Progress indicators para uploads (futuro)

## Exemplos Práticos

### Criar Budget com Feedback Completo

```vue
<script setup>
const handleCreateBudget = async () => {
  const { success, error } = useToast()
  
  try {
    await budgetStore.addBudget(name, value, color)
    success(`Budget "${name}" criado com sucesso!`)
    // Modal fecha com animação scale-out
    showModal.value = false
  } catch (err) {
    error('Erro ao criar budget. Tente novamente.')
    // Shake animation no botão
    buttonRef.value.classList.add('animate-shake')
    setTimeout(() => {
      buttonRef.value.classList.remove('animate-shake')
    }, 400)
  }
}
</script>
```

### Lista com Skeleton Loading

```vue
<template>
  <div v-if="loading">
    <div v-for="i in 3" :key="i" class="budget-skeleton">
      <div class="skeleton" style="width: 60%; height: 24px;"></div>
      <div class="skeleton" style="width: 100%; height: 8px; margin-top: 12px;"></div>
    </div>
  </div>
  
  <TransitionGroup v-else name="slide" tag="div">
    <BudgetBar v-for="budget in budgets" :key="budget.id" :budget="budget" />
  </TransitionGroup>
</template>
```

### Modal com Animação

```vue
<template>
  <Transition name="fade">
    <div v-if="show" class="modal-backdrop" @click.self="$emit('close')">
      <Transition name="scale">
        <div v-if="show" class="modal-content">
          <slot />
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 24px;
  max-width: 500px;
  width: 90%;
}
</style>
```

## Referências

- [Vue Transitions](https://vuejs.org/guide/built-ins/transition.html)
- [CSS Animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Animations)
- [Material Design Motion](https://m2.material.io/design/motion)
- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
