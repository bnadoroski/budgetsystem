# Script de Debug Android - Budget System
# Facilita o processo de debug via ADB

Write-Host "[DEBUG] Budget System - Debug Android" -ForegroundColor Cyan
Write-Host ""

# Adicionar ADB ao PATH
$adbPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools"
if (Test-Path $adbPath) {
    $env:Path += ";$adbPath"
    Write-Host "[OK] ADB encontrado em: $adbPath" -ForegroundColor Green
} else {
    Write-Host "[ERRO] ADB nao encontrado. Certifique-se de ter o Android SDK instalado." -ForegroundColor Red
    Write-Host "   Geralmente em: C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\platform-tools" -ForegroundColor Yellow
    exit 1
}

# Verificar dispositivos conectados
Write-Host ""
Write-Host "[CHECK] Verificando dispositivos conectados..." -ForegroundColor Cyan
$devices = adb devices | Select-String "device$" | Where-Object { $_ -notmatch "List of devices" }

if ($devices.Count -eq 0) {
    Write-Host "[ERRO] Nenhum dispositivo conectado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Passos para conectar:" -ForegroundColor Yellow
    Write-Host "1. Ative o Modo Desenvolvedor no celular" -ForegroundColor White
    Write-Host "   (Configuracoes > Sobre > Toque 7x em 'Numero da versao')" -ForegroundColor White
    Write-Host "2. Ative 'Depuracao USB' em Opcoes do Desenvolvedor" -ForegroundColor White
    Write-Host "3. Conecte o celular via USB" -ForegroundColor White
    Write-Host "4. Autorize a depuracao no popup do celular" -ForegroundColor White
    exit 1
}

Write-Host "[OK] Dispositivo(s) conectado(s):" -ForegroundColor Green
adb devices
Write-Host ""

# Menu de opcoes
Write-Host "Escolha uma opcao:" -ForegroundColor Cyan
Write-Host "1 - Ver logs de transacoes" -ForegroundColor White
Write-Host "2 - Ver todos os console.log" -ForegroundColor White
Write-Host "3 - Ver apenas erros" -ForegroundColor White
Write-Host "4 - Ver logs completos (muito verbose)" -ForegroundColor White
Write-Host "5 - Reinstalar APK" -ForegroundColor White
Write-Host "6 - Limpar logs e monitorar transacoes" -ForegroundColor White
Write-Host "7 - Salvar logs em arquivo" -ForegroundColor White
Write-Host "0 - Sair" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Digite o numero da opcao"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "[MONITOR] Monitorando logs de transacoes..." -ForegroundColor Green
        Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
        Write-Host ""
        adb logcat | Select-String "Salvando transacao|Carregando transacoes|Transacoes encontradas|Transacao salva|TransactionsModal"
    }
    
    "2" {
        Write-Host ""
        Write-Host "[MONITOR] Monitorando console.log..." -ForegroundColor Green
        Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
        Write-Host ""
        adb logcat chromium:V *:S
    }
    
    "3" {
        Write-Host ""
        Write-Host "[ERRO] Monitorando apenas erros..." -ForegroundColor Red
        Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
        Write-Host ""
        adb logcat *:E
    }
    
    "4" {
        Write-Host ""
        Write-Host "[VERBOSE] Logs completos (muito verbose)..." -ForegroundColor Yellow
        Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
        Write-Host ""
        adb logcat
    }
    
    "5" {
        Write-Host ""
        $apkPath = "android\app\build\outputs\apk\release\app-release.apk"
        
        if (-not (Test-Path $apkPath)) {
            Write-Host "[ERRO] APK nao encontrado em: $apkPath" -ForegroundColor Red
            Write-Host "   Execute 'cd android; .\gradlew assembleRelease' primeiro" -ForegroundColor Yellow
            exit 1
        }
        
        Write-Host "[DESINSTALAR] Desinstalando app antigo..." -ForegroundColor Yellow
        adb uninstall com.budgetsystem.app 2>$null
        
        Write-Host "[INSTALAR] Instalando novo APK..." -ForegroundColor Cyan
        adb install $apkPath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] APK instalado com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "[ERRO] Erro ao instalar APK" -ForegroundColor Red
        }
    }
    
    "6" {
        Write-Host ""
        Write-Host "[LIMPAR] Limpando logs..." -ForegroundColor Yellow
        adb logcat -c
        
        Write-Host "[OK] Logs limpos!" -ForegroundColor Green
        Write-Host ""
        Write-Host "[MONITOR] Monitorando transacoes..." -ForegroundColor Green
        Write-Host "Agora teste criar uma transacao no app!" -ForegroundColor Cyan
        Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
        Write-Host ""
        adb logcat | Select-String "Salvando transacao|Carregando transacoes|Transacoes encontradas|Transacao salva|TransactionsModal"
    }
    
    "7" {
        Write-Host ""
        $logFile = "debug-logs-$(Get-Date -Format 'yyyyMMdd-HHmmss').txt"
        Write-Host "[SALVAR] Salvando logs em: $logFile" -ForegroundColor Cyan
        Write-Host "Pressione Ctrl+C para parar" -ForegroundColor Yellow
        Write-Host ""
        adb logcat | Tee-Object -FilePath $logFile
    }
    
    "0" {
        Write-Host ""
        Write-Host "[FIM] Ate mais!" -ForegroundColor Cyan
        exit 0
    }
    
    default {
        Write-Host ""
        Write-Host "[ERRO] Opcao invalida!" -ForegroundColor Red
    }
}
