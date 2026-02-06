# Sistema de Logs - Budget System

## Visão Geral

O sistema de logs foi implementado para facilitar o diagnóstico de crashes e erros que ocorrem no app, especialmente quando "não tem nada aparente acontecendo com o celular e aparece que o app parou de funcionar".

## Componentes

### 1. LoggerService (`/src/services/LoggerService.ts`)

Serviço singleton que gerencia todos os logs do aplicativo.

**Características:**
- 5 níveis de log: `debug`, `info`, `warn`, `error`, `fatal`
- Armazenamento local (últimos 500 logs em memória)
- Envio automático para Firebase (logs warn, error, fatal)
- Captura automática de erros globais não tratados
- Rastreamento de sessão e informações do dispositivo
- Suporte a contexto e dados adicionais em cada log

**Uso:**
```typescript
import { logger } from '@/services/LoggerService'
// ou
import { useLogger } from '@/services/LoggerService'

// Nos componentes Vue
const logger = useLogger()

// Logging básico
logger.debug('Mensagem de debug', 'context.function')
logger.info('Informação importante', 'context.function', { data: 'extra' })
logger.warn('Aviso', 'context.function')
logger.error('Erro', 'context.function', { details: {} }, errorObject)
logger.fatal('Erro crítico', 'context.function', {}, errorObject)
```

### 2. LogViewerModal (`/src/components/LogViewerModal.vue`)

Modal para visualização dos logs no próprio app.

**Características:**
- Filtro por nível de log
- Busca textual
- Estatísticas (total de logs por nível)
- Exportação de logs (download JSON)
- Copiar logs para área de transferência
- Limpar logs locais
- Cores indicativas por nível de severidade

### 3. Integração no App

O sistema de logs está integrado em:
- **main.ts**: Inicialização do logger no startup
- **App.vue**: 
  - Captura de erros Vue (`onErrorCaptured`)
  - Log de login/logout de usuários
  - Log de operações críticas (reset, delete de budgets)
  - Log de pull-to-refresh
  - Log de inicialização do FCM
- **budget.ts** (store):
  - Log de adição de budgets
  - Log de atualização de budgets
  - Log de exclusão de budgets
  - Log de adição de despesas

## Como Acessar os Logs

1. Abra o app
2. Vá em **Perfil** (ícone de usuário no cabeçalho)
3. Clique em **Suporte**
4. Na seção "Diagnóstico", clique em **Ver Logs do App**

## Estrutura de um Log

```typescript
interface LogEntry {
  id?: string              // ID do documento no Firebase
  level: LogLevel          // debug, info, warn, error, fatal
  message: string          // Mensagem principal
  context?: string         // Contexto (ex: 'budgetStore.addBudget')
  data?: Record<string, any>  // Dados extras
  error?: {                // Informações do erro (se houver)
    name: string
    message: string
    stack?: string
  }
  userId?: string          // ID do usuário
  userEmail?: string       // Email do usuário
  deviceInfo?: {           // Informações do dispositivo
    platform: string
    userAgent: string
    language: string
    screenSize: string
    appVersion: string
  }
  timestamp: Date          // Data/hora do log
  sessionId: string        // ID da sessão atual
}
```

## Logs Remotos (Firebase)

Logs de nível `warn`, `error` e `fatal` são automaticamente enviados para a coleção `logs` no Firebase Firestore.

**Coleção:** `logs`
**Ordenação:** Por `timestamp` decrescente

### Consultando Logs no Firebase Console

1. Acesse o Firebase Console
2. Vá em Firestore Database
3. Navegue até a coleção `logs`
4. Filtre por:
   - `userId` para logs de um usuário específico
   - `level` para ver apenas erros
   - `sessionId` para rastrear uma sessão

## Erros Capturados Automaticamente

O sistema captura automaticamente:
- Erros JavaScript não tratados (`window.onerror`)
- Promise rejections não tratadas (`unhandledrejection`)
- Erros em componentes Vue (`onErrorCaptured`)
- Transições do app entre background/foreground

## Boas Práticas

1. **Use contexto significativo**: `'budgetStore.addBudget'` é melhor que `'addBudget'`
2. **Inclua dados relevantes**: Adicione IDs, valores, estados que ajudem no debug
3. **Use o nível correto**:
   - `debug`: Detalhes para desenvolvimento
   - `info`: Eventos normais (login, ações do usuário)
   - `warn`: Algo inesperado mas recuperável
   - `error`: Erro que afeta funcionalidade
   - `fatal`: Crash ou erro crítico
4. **Não logue dados sensíveis**: Evite logar senhas, tokens, dados pessoais completos

## Exemplo de Investigação de Crash

1. Usuário reporta "app parou de funcionar"
2. Peça para o usuário acessar **Suporte > Ver Logs**
3. Peça para exportar os logs (botão 💾)
4. Usuário envia o arquivo JSON
5. Analise os logs procurando por:
   - Logs `fatal` ou `error` próximos ao horário do crash
   - Sequência de ações antes do erro
   - Informações do dispositivo e versão do app
