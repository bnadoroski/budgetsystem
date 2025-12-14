# Configurar Google OAuth com Deep Link para Android

## Problema
O Google OAuth está redirecionando para `localhost` em vez de voltar para o aplicativo Android.

## Solução

### 1. Firebase Console - Adicionar URIs Autorizados

Acesse o [Firebase Console](https://console.firebase.google.com):

1. Selecione seu projeto
2. Vá em **Authentication** → **Sign-in method**
3. Clique em **Google** 
4. Em **Authorized domains**, adicione:
   - `budgetsystem.app`
   
### 2. Google Cloud Console - Configurar OAuth Client

Acesse o [Google Cloud Console](https://console.cloud.google.com):

1. Vá em **APIs & Services** → **Credentials**
2. Encontre seu **OAuth 2.0 Client ID** para Android
3. Adicione os seguintes **Authorized redirect URIs**:
   ```
   https://budgetsystem.app/__/auth/handler
   ```

### 3. AndroidManifest.xml - Já Configurado ✅

O arquivo já tem os intent filters corretos em `android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" />
    <data android:host="budgetsystem.app" />
</intent-filter>
```

### 4. capacitor.config.ts - Já Atualizado ✅

O arquivo foi atualizado com:

```typescript
server: {
  androidScheme: 'https',
  cleartext: true,
  hostname: 'budgetsystem.app'
}
```

### 5. Testar

Após fazer as configurações no Firebase Console e Google Cloud Console:

1. Gere a APK: `npm run build ; npx cap sync`
2. Instale no celular
3. Faça login com Google
4. O app deve voltar automaticamente após a autenticação

## Alternativa: Deep Link Customizado

Se ainda não funcionar, você pode usar um esquema customizado:

1. Mude `androidScheme` para `budgetsystem` no `capacitor.config.ts`
2. No Firebase Console, adicione `budgetsystem://` aos authorized domains
3. No Google Cloud Console, adicione `budgetsystem://__/auth/handler`

## Verificar SHA-1 Certificate

O Google OAuth também requer o SHA-1 certificate fingerprint. Veja o arquivo `GOOGLE_LOGIN_CONFIG.md` para mais detalhes sobre como configurar.
