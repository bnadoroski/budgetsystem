# 🔐 Como Remover Credenciais Expostas do Git

## ⚠️ Sua API Key foi exposta! Siga estes passos:

### 1️⃣ Regenerar API Key no Firebase (IMPORTANTE!)

Como a key já está no histórico do Git, você precisa criar uma nova:

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto "budget-system"
3. Vá em **⚙️ Configurações do projeto** (ícone de engrenagem)
4. Role até "Seus aplicativos" e clique no app Web
5. Clique em "Gerenciar chaves de API"
6. **Restrinja** a key atual (adicione restrições de domínio)
7. Ou crie uma nova Web App e use a nova key

### 2️⃣ Atualizar .env.local com Nova Key

Abra o arquivo `.env.local` e atualize com a nova API Key:

```env
VITE_FIREBASE_API_KEY=sua-nova-key-aqui
```

### 3️⃣ Limpar Histórico do Git (Opcional mas Recomendado)

**Opção A - Commit de correção (mais simples):**
```bash
git add .
git commit -m "security: move Firebase config to environment variables"
git push
```

**Opção B - Remover do histórico (avançado):**
```bash
# Instalar BFG Repo Cleaner
# https://rtyley.github.io/bfg-repo-cleaner/

# Remover credenciais do histórico
bfg --replace-text passwords.txt

# Ou use git filter-branch (mais complexo)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch src/config/firebase.ts" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (CUIDADO!)
git push origin --force --all
```

### 4️⃣ O Que Foi Configurado

✅ **`.env.local`** criado com suas credenciais (não será enviado ao Git)  
✅ **`.env.example`** criado como template (pode ser compartilhado)  
✅ **`.gitignore`** atualizado para ignorar `.env` e `.env.local`  
✅ **`firebase.ts`** agora usa variáveis de ambiente

### 5️⃣ Como Funciona Agora

```typescript
// Antes (INSEGURO ❌)
apiKey: "AIzaSyBUZNYmO6knPlqCoqL91k1RHWQlQm2TXpQ"

// Agora (SEGURO ✅)
apiKey: import.meta.env.VITE_FIREBASE_API_KEY
```

As credenciais ficam em `.env.local` que **nunca** será commitado!

### 6️⃣ Para Outros Desenvolvedores

Quando alguém clonar o projeto:

1. Copie `.env.example` para `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Preencha com as credenciais do Firebase

3. Execute `npm run dev`

### 7️⃣ Reiniciar Servidor

Após criar o `.env.local`, reinicie o servidor:

```bash
# Pare o servidor (Ctrl+C)
npm run dev
```

## 🔒 Segurança Adicional no Firebase

No Firebase Console, configure restrições:

1. **API Key Restrictions** (Configurações do Projeto):
   - Application restrictions: HTTP referrers
   - Adicione: `localhost:*`, `seu-dominio.com/*`

2. **Firestore Rules** (já configurado):
   ```javascript
   allow read, write: if request.auth != null && request.auth.uid == userId;
   ```

3. **Authentication** (domínios autorizados):
   - Só autorize domínios confiáveis
   - `localhost` já está autorizado por padrão

## ✅ Checklist Final

- [ ] Nova API Key gerada (ou key atual restrita)
- [ ] `.env.local` criado com novas credenciais
- [ ] `.gitignore` atualizado (já feito ✅)
- [ ] `firebase.ts` usando variáveis de ambiente (já feito ✅)
- [ ] Servidor reiniciado
- [ ] Commit realizado
- [ ] GitHub notificado que o problema foi resolvido

## 💡 Dica Importante

**A API Key do Firebase não é tão sensível quanto parece!** Ela é feita para ser pública no frontend. O importante é:

1. ✅ Ter regras de segurança corretas no Firestore
2. ✅ Restringir domínios no Firebase Console
3. ✅ Nunca expor Service Account Keys (backend)

Mas ainda assim, é boa prática usar variáveis de ambiente! 🎯
