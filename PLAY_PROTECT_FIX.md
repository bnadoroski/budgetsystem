# Play Protect e Permissão de Notificações

## Problema 1: Play Protect Bloqueando a APK

O Google Play Protect bloqueia APKs não verificadas porque:
1. A APK é de **debug** (não assinada com chave de release)
2. A APK solicita permissões sensíveis (BIND_NOTIFICATION_LISTENER_SERVICE)

### Solução: Assinar a APK

Para gerar uma APK de release assinada:

1. **Gerar uma keystore** (uma vez só):
```bash
cd android
keytool -genkey -v -keystore budget-release-key.keystore -alias budget -keyalg RSA -keysize 2048 -validity 10000
```

2. **Criar `android/key.properties`**:
```properties
storePassword=SUA_SENHA
keyPassword=SUA_SENHA
keyAlias=budget
storeFile=budget-release-key.keystore
```

3. **Atualizar `android/app/build.gradle`** para usar a keystore:
```gradle
android {
    ...
    signingConfigs {
        release {
            def keystoreProperties = new Properties()
            def keystorePropertiesFile = rootProject.file('key.properties')
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
            }
            
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

4. **Gerar APK de release**:
```bash
cd android
.\\gradlew assembleRelease
```

A APK estará em: `android/app/build/outputs/apk/release/app-release.apk`

## Problema 2: Permissão de Notificações

### Status Atual ✅

O app **JÁ** solicita a permissão corretamente:

1. A `MainActivity` mostra um botão para habilitar notificações
2. Quando clicado, abre as configurações do Android
3. O usuário precisa manualmente habilitar o "Budget System" na lista

### Como Funciona

1. Abra o app
2. Clique em "Habilitar Acesso a Notificações"
3. Encontre "Budget System" na lista
4. Ative a permissão
5. Volte ao app

### Verificar Permissão

O código em `MainActivity.kt` já verifica se a permissão está ativa:

```kotlin
private fun isNotificationServiceEnabled(): Boolean {
    val enabledListeners = Settings.Secure.getString(
        contentResolver,
        "enabled_notification_listeners"
    )
    return enabledListeners?.contains(packageName) == true
}
```

## Próximos Passos

1. **Assinar a APK** com release key (isso reduz os avisos do Play Protect)
2. **Instalar a APK assinada**
3. **Conceder permissão de notificações** quando solicitado
4. **Testar notificações bancárias**

## Observação sobre Play Protect

Mesmo com APK assinada, o Play Protect pode avisar porque o app não está na Play Store. Isso é normal. O usuário pode clicar em "Instalar mesmo assim" ou desativar temporariamente o Play Protect durante o desenvolvimento.
