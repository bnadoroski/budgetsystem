# Configurar Login com Google no App Android

## ✅ Alterações no código já foram feitas!

O código foi atualizado com:
- Deep link configurado no `capacitor.config.ts`
- Intent filter adicionado no `AndroidManifest.xml`
- Esquema HTTPS configurado

## 🔧 Configuração necessária no Firebase Console

Para o redirect do Google funcionar, você precisa adicionar o domínio do app no Firebase:

### 1. Acesse o Firebase Console
- Vá em: https://console.firebase.google.com
- Selecione o projeto: **budget-system-34ef8**

### 2. Adicione o domínio autorizado
1. No menu lateral, clique em **Authentication** (Autenticação)
2. Vá na aba **Settings** (Configurações)
3. Role até **Authorized domains** (Domínios autorizados)
4. Clique em **Add domain** (Adicionar domínio)
5. Adicione: `com.budgetsystem.app`
6. Clique em **Add** (Adicionar)

### 3. Configure o SHA-1 do app (Opcional mas recomendado)

Para uma autenticação mais segura, adicione o SHA-1 do seu app:

#### Gerar SHA-1:
```powershell
cd android
.\gradlew signingReport
```

Procure no output por `SHA1:` na seção **debug** e copie o código.

#### Adicionar no Firebase:
1. No Firebase Console, vá em **Project Settings** (⚙️)
2. Role até **Your apps**
3. Clique no app Android
4. Role até **SHA certificate fingerprints**
5. Clique em **Add fingerprint**
6. Cole o SHA-1 que você copiou
7. Salve

### 4. Teste o app

Após fazer essas configurações:
1. Gere o APK no Android Studio: **Build** → **Build APK(s)**
2. Instale no celular
3. Teste o login com Google
4. Agora deve redirecionar corretamente de volta ao app! ✨

## 🎯 Como funciona agora

1. Você clica em "Continuar com Google" no app
2. O navegador abre com a tela de login do Google
3. Você faz o login normalmente
4. Após login, o Firebase redireciona para `https://com.budgetsystem.app/__/auth/handler`
5. O Android reconhece esse link como do app (graças ao intent-filter)
6. O app abre automaticamente e completa o login
7. Você volta logado! 🎉

## ⚠️ Importante

- O domínio `com.budgetsystem.app` DEVE estar nos domínios autorizados do Firebase
- Sem isso, o Firebase vai tentar redirecionar para localhost
- A configuração do SHA-1 não é obrigatória, mas melhora a segurança
