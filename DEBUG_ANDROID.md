# Debug Android via ADB

Como o build release não aparece no `edge://inspect/#devices`, vamos usar o **ADB logcat** para ver os logs do app, incluindo os console.log do JavaScript.

## 1. Instalar ADB (Android Debug Bridge)

O ADB já vem junto com o Android SDK. Se você tem o Gradle funcionando, provavelmente já tem:

```powershell
# Verificar se ADB está disponível
cd android
.\gradlew --version

# O ADB geralmente está em:
# C:\Users\SeuUsuario\AppData\Local\Android\Sdk\platform-tools\adb.exe
```

## 2. Conectar o Celular

1. **Ativar Modo Desenvolvedor no celular:**
   - Vá em Configurações > Sobre o telefone
   - Toque 7 vezes em "Número da versão"
   - Modo desenvolvedor será ativado

2. **Ativar Depuração USB:**
   - Configurações > Opções do desenvolvedor
   - Ative "Depuração USB"

3. **Conectar via USB:**
   - Conecte o celular no PC
   - Autorize a depuração USB (vai aparecer popup no celular)

4. **Verificar conexão:**
```powershell
# Adicionar ADB ao PATH temporariamente
$env:Path += ";C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\platform-tools"

# Verificar dispositivos conectados
adb devices
```

Deve mostrar algo como:
```
List of devices attached
ABC123XYZ       device
```

## 3. Ver Logs do App

### Logs Completos (muito verbose)
```powershell
adb logcat
```

### Filtrar apenas logs do Chromium (onde os console.log aparecem)
```powershell
adb logcat chromium:V *:S
```

### Filtrar apenas logs do seu app
```powershell
adb logcat | Select-String "budgetsystem"
```

### Filtrar apenas os console.log que adicionamos
```powershell
# Ver logs de transações
adb logcat | Select-String "💾|🔍|📊|✅|❌|🔄|📦"
```

### Filtrar erros e crashes
```powershell
adb logcat *:E
```

## 4. Comandos Úteis

### Limpar logs antes de testar
```powershell
adb logcat -c
```

### Salvar logs em arquivo
```powershell
adb logcat > logs.txt
```

### Ver logs em tempo real e salvar
```powershell
adb logcat | Tee-Object -FilePath logs.txt
```

### Reinstalar APK
```powershell
# Desinstalar
adb uninstall com.budgetsystem.app

# Instalar
adb install android\app\build\outputs\apk\release\app-release.apk
```

## 5. Testar Transações - Passo a Passo

1. **Limpar logs:**
```powershell
adb logcat -c
```

2. **Iniciar monitoramento (em um terminal separado):**
```powershell
adb logcat | Select-String "💾|🔍|📊|✅|❌"
```

3. **No app, criar uma transação:**
   - Aprove uma despesa pendente
   - Ou adicione gasto manual

4. **Observe no terminal:**
   - ✅ Deve aparecer: `💾 Salvando transação:` com dados
   - ✅ Deve aparecer: `✅ Transação salva com ID: xyz`

5. **Abrir "Ver Lançamentos":**
   - Clique nos 3 pontos de um budget
   - Clique "Ver Lançamentos"

6. **Observe no terminal:**
   - ✅ Deve aparecer: `🔍 Carregando transações para budget: abc`
   - ✅ Deve aparecer: `📊 Transações encontradas: X`
   - ❌ Se mostrar `📊 Transações encontradas: 0` - problema na query

## 6. Verificar Problemas Comuns

### Se aparecer erro de índice:
```
The query requires an index. You can create it here: [URL]
```
- Abra o link no navegador
- Espere 2-5 minutos para o índice ser criado
- Tente novamente

### Se não aparecer logs de console.log:
```powershell
# Tente esse filtro mais abrangente
adb logcat | Select-String "console"
```

### Se o app crashar ao pedir permissão de notificação:
```powershell
# Ver logs de crash
adb logcat *:E | Select-String "FATAL|AndroidRuntime"
```

## 7. Build Debug (Alternativa)

Se quiser ver no `edge://inspect`, faça build debug:

```powershell
cd android
.\gradlew assembleDebug
```

O APK debug estará em:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

**Vantagens:**
- Aparece no `edge://inspect/#devices`
- DevTools completo no navegador

**Desvantagens:**
- APK maior
- Mais lento
- Não é a versão final de produção

## 8. Capturar Screenshot e Info do Sistema

```powershell
# Screenshot
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Info do dispositivo
adb shell getprop | Select-String "model|version"

# Ver apps instalados
adb shell pm list packages | Select-String "budgetsystem"
```

---

## Resumo Rápido

```powershell
# 1. Conectar celular
adb devices

# 2. Limpar logs
adb logcat -c

# 3. Monitorar logs de transações
adb logcat | Select-String "💾|🔍|📊|✅|❌|🔄|📦"

# 4. Em outro terminal, ver todos os erros
adb logcat *:E

# 5. Testar no app e observar logs
```

Se aparecer erros específicos, copie e cole aqui para analisarmos!
