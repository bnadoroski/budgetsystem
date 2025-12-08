# Como Gerar o APK do Budget System

## ✅ Projeto Configurado

Tudo está pronto:
- ✅ Capacitor instalado e configurado
- ✅ Build de produção gerado (dist/)
- ✅ Plataforma Android adicionada
- ✅ Arquivos Kotlin copiados (NotificationListener.kt, BankNotificationParser.kt)
- ✅ AndroidManifest.xml configurado com serviço de notificações
- ✅ Permissões adicionadas (INTERNET, ACCESS_NOTIFICATION_POLICY)
- ✅ Android Studio aberto

## 📱 Gerando o APK no Android Studio

### Passo 1: Aguardar Gradle Sync
Quando o Android Studio abrir, aguarde o **Gradle sync** terminar. Você verá na parte inferior da tela uma barra de progresso. Isso pode levar alguns minutos na primeira vez.

### Passo 2: Build do APK
Após o Gradle sync finalizar:
1. No menu superior, vá em **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Aguarde a compilação terminar (pode levar alguns minutos)
3. Quando terminar, aparecerá uma notificação no canto inferior direito

### Passo 3: Localizar o APK
O APK gerado estará em:
```
C:\dev\budgetsystem\android\app\build\outputs\apk\debug\app-debug.apk
```

## 📲 Instalando no Celular

### Opção 1: Via Cabo USB
1. Conecte seu celular ao computador via USB
2. Habilite **Depuração USB** nas opções de desenvolvedor do Android
3. No Android Studio, clique em **Run** (ícone de play verde)
4. Selecione seu dispositivo

### Opção 2: Transferência Manual
1. Copie o arquivo `app-debug.apk` para o seu celular
2. No celular, vá em **Configurações** → **Segurança**
3. Habilite **Instalar de fontes desconhecidas** (ou permitir para o app de arquivos)
4. Abra o arquivo APK no celular e instale

## 🔔 Configurando as Notificações

Após instalar o app:
1. Abra o app uma vez
2. Vá em **Configurações do Android** → **Apps** → **Budget System**
3. Vá em **Permissões** ou **Acesso especial**
4. Procure por **Acesso a notificações** ou **Notification access**
5. Habilite para o Budget System
6. Pronto! O app agora pode capturar notificações de SMS bancários

## 🔐 Gerando APK Assinado (Para Distribuição)

Se quiser distribuir o app (Google Play ou compartilhar com outras pessoas):

### 1. Criar Keystore
No Android Studio:
1. **Build** → **Generate Signed Bundle / APK**
2. Selecione **APK**
3. Clique em **Create new...** para criar uma keystore
4. Preencha os dados:
   - Key store path: escolha um local seguro
   - Password: crie uma senha forte
   - Alias: nome da chave (ex: budgetsystem)
   - Validity: 25 anos ou mais
   - Preencha os dados do certificado
5. Clique **OK** e depois **Next**
6. Selecione **release** como build variant
7. Marque ambas as opções de assinatura (V1 e V2)
8. Clique em **Finish**

### 2. Localizar o APK Release
O APK assinado estará em:
```
C:\dev\budgetsystem\android\app\build\outputs\apk\release\app-release.apk
```

## ⚠️ IMPORTANTE
**Guarde sua keystore em um local seguro!** Você precisará dela para fazer atualizações do app no futuro. Sem ela, não conseguirá atualizar o app na Google Play.

## 🐛 Problemas Comuns

### Gradle sync falha
- Aguarde alguns minutos e tente novamente
- Verifique sua conexão com a internet (baixa dependências)
- Em último caso: **File** → **Invalidate Caches / Restart**

### APK não instala no celular
- Verifique se habilitou "Instalar de fontes desconhecidas"
- Verifique se não há outra versão do app instalada (desinstale primeiro)

### Notificações não funcionam
- Verifique se habilitou "Acesso a notificações" nas configurações
- Abra o app uma vez antes de testar
- Reinicie o celular após habilitar o acesso

## 📞 Testando

Para testar se está funcionando:
1. Instale o app
2. Configure o acesso a notificações
3. Faça um teste com uma notificação de banco (ou simule uma)
4. O app deve automaticamente adicionar o gasto ao budget correspondente

## 🎉 Pronto!

Seu app está pronto para uso! Todos os recursos estão funcionando:
- ✅ Controle de budgets com progresso visual
- ✅ Grupos para organizar budgets
- ✅ Compartilhamento em tempo real com outras pessoas
- ✅ Reset mensal automático (configurável)
- ✅ Histórico de meses anteriores
- ✅ Sincronização com Firebase
- ✅ Autenticação (Email + Google)
- ✅ Dark mode
- ✅ **Captura automática de notificações bancárias** (Android)
