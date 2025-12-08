# 🔥 Configuração do Firebase

## Passo 1: Criar Projeto no Firebase Console

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em **"Adicionar projeto"**
3. Nomeie seu projeto (ex: "budget-system")
4. Desative o Google Analytics se não quiser usar (opcional)
5. Clique em **"Criar projeto"**

## Passo 2: Adicionar Web App

1. No painel do projeto, clique no ícone **Web** (`</>`)
2. Registre seu app com um nome (ex: "Budget System Web")
3. **IMPORTANTE**: Copie o objeto `firebaseConfig` que aparecerá

Exemplo do que você verá:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdefghijklmnop"
};
```

## Passo 3: Atualizar Arquivo de Configuração

Abra o arquivo `src/config/firebase.ts` e substitua as configurações:

```typescript
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",           // Cole sua apiKey
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto-id",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "seu-app-id"
}
```

## Passo 4: Ativar Authentication

1. No Firebase Console, vá em **Authentication** no menu lateral
2. Clique em **"Começar"**
3. Na aba **Sign-in method**, ative:
   - ✅ **Email/Password** (clique em "Ativar" e salve)
   - ✅ **Google** (clique em "Ativar", selecione um email de suporte e salve)

## Passo 5: Configurar Firestore Database

1. No Firebase Console, vá em **Firestore Database**
2. Clique em **"Criar banco de dados"**
3. Selecione **"Iniciar no modo de produção"** (ou teste se preferir)
4. Escolha a localização mais próxima (ex: `southamerica-east1`)
5. Clique em **"Ativar"**

## Passo 6: Configurar Regras de Segurança

Na aba **Regras** do Firestore, substitua pelas regras abaixo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permite que usuários autenticados acessem apenas seus próprios dados
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Subcoleção de budgets
      match /budgets/{budgetId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Clique em **"Publicar"** para salvar as regras.

## Passo 7: Testar a Aplicação

1. Reinicie o servidor de desenvolvimento se estiver rodando:
   ```bash
   npm run dev
   ```

2. Acesse a aplicação no navegador

3. Clique no ícone de **Perfil** (roxo) na barra inferior

4. Crie uma conta ou faça login

5. Seus budgets agora serão salvos no Firebase! 🎉

## ✨ Funcionalidades Implementadas

- ✅ **Autenticação com Email/Senha**
- ✅ **Login com Google**
- ✅ **Sincronização em Tempo Real** - Mudanças aparecem instantaneamente
- ✅ **Migração Automática** - Budgets locais são migrados ao fazer login
- ✅ **Indicador Visual** - Bolinha verde no ícone de perfil quando logado
- ✅ **Fallback Local** - Funciona offline usando localStorage
- ✅ **Multi-dispositivo** - Acesse seus budgets de qualquer lugar

## 🔒 Segurança

Os dados estão protegidos:
- Cada usuário só pode acessar seus próprios budgets
- Autenticação obrigatória para salvar dados
- Regras de segurança do Firestore configuradas

## 📱 Estrutura dos Dados

```
Firestore
└── users/
    └── {userId}/
        └── budgets/
            └── {budgetId}/
                ├── name: "Alimentação"
                ├── totalValue: 1000
                ├── spentValue: 750
                ├── color: "#4CAF50"
                └── createdAt: "2025-12-08T..."
```

## 🆘 Problemas Comuns

**Erro de autenticação?**
- Verifique se as credenciais em `firebase.ts` estão corretas
- Confirme que Email/Password está ativado no Console

**Dados não sincronizam?**
- Verifique as regras de segurança do Firestore
- Abra o Console do navegador (F12) para ver erros

**Login com Google não funciona?**
- Verifique se o domínio está autorizado no Firebase Console
- Em desenvolvimento, `localhost` já está autorizado automaticamente
