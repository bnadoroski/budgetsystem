# Script de Validacao do Build Android
# Executa todos os testes e validacoes necessarias

Write-Host "[INFO] Iniciando validacao do Build Android..." -ForegroundColor Cyan
Write-Host ""

$ErrorCount = 0
$WarningCount = 0

# Define diretorio do projeto
$ProjectRoot = "c:\dev\budgetsystem"
$AndroidDir = "$ProjectRoot\android"

Set-Location $AndroidDir

# 1. Clean Build
Write-Host "[1/7] Limpando build anterior..." -ForegroundColor Yellow
.\gradlew.bat clean | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Clean executado com sucesso" -ForegroundColor Green
} else {
    Write-Host "   [ERRO] Erro no clean" -ForegroundColor Red
    $ErrorCount++
}
Write-Host ""

# 2. Compilacao Java
Write-Host "[2/7] Compilando codigo Java..." -ForegroundColor Yellow
.\gradlew.bat compileDebugJavaWithJavac --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Compilacao Java bem-sucedida" -ForegroundColor Green
} else {
    Write-Host "   [ERRO] Erros de compilacao Java" -ForegroundColor Red
    $ErrorCount++
}
Write-Host ""

# 3. Testes Unitarios
Write-Host "[3/7] Executando testes unitarios..." -ForegroundColor Yellow
$TestOutput = .\gradlew.bat :app:testDebugUnitTest --quiet 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   [OK] Testes executados com sucesso" -ForegroundColor Green
} else {
    Write-Host "   [ERRO] Testes falharam" -ForegroundColor Red
    $ErrorCount++
}
Write-Host ""

# 4. Build APK Debug
Write-Host "[4/7] Gerando APK Debug..." -ForegroundColor Yellow
.\gradlew.bat assembleDebug --quiet
if ($LASTEXITCODE -eq 0) {
    $ApkPath = "$AndroidDir\app\build\outputs\apk\debug\app-debug.apk"
    if (Test-Path $ApkPath) {
        $ApkSize = (Get-Item $ApkPath).Length / 1MB
        Write-Host "   [OK] APK gerado com sucesso" -ForegroundColor Green
        Write-Host "   Localizacao: $ApkPath" -ForegroundColor Cyan
        Write-Host "   Tamanho: $([math]::Round($ApkSize, 2)) MB" -ForegroundColor Cyan
    } else {
        Write-Host "   [AVISO] APK compilado mas arquivo nao encontrado" -ForegroundColor Yellow
        $WarningCount++
    }
} else {
    Write-Host "   [ERRO] Erro ao gerar APK" -ForegroundColor Red
    $ErrorCount++
}
Write-Host ""

# 5. Verificar arquivos criticos
Write-Host "[5/7] Verificando arquivos criticos..." -ForegroundColor Yellow

$CriticalFiles = @(
    "$AndroidDir\app\src\main\java\com\budgetsystem\app\FCMPlugin.java",
    "$AndroidDir\app\src\main\java\com\budgetsystem\app\FCMService.java",
    "$AndroidDir\app\src\main\java\com\budgetsystem\app\NotificationListenerService.java",
    "$AndroidDir\app\src\main\AndroidManifest.xml",
    "$AndroidDir\app\google-services.json"
)

foreach ($file in $CriticalFiles) {
    $fileName = Split-Path $file -Leaf
    if (Test-Path $file) {
        Write-Host "   [OK] $fileName" -ForegroundColor Green
    } else {
        Write-Host "   [ERRO] $fileName FALTANDO!" -ForegroundColor Red
        $ErrorCount++
    }
}
Write-Host ""

# 6. Verificar dependencias Firebase
Write-Host "[6/7] Verificando dependencias Firebase..." -ForegroundColor Yellow
$BuildGradle = Get-Content "$AndroidDir\app\build.gradle" -Raw
if ($BuildGradle -match "firebase-messaging") {
    Write-Host "   [OK] Firebase Messaging configurado" -ForegroundColor Green
} else {
    Write-Host "   [ERRO] Firebase Messaging NAO encontrado" -ForegroundColor Red
    $ErrorCount++
}

if ($BuildGradle -match "firebase-bom") {
    Write-Host "   [OK] Firebase BOM configurado" -ForegroundColor Green
} else {
    Write-Host "   [AVISO] Firebase BOM nao encontrado (opcional)" -ForegroundColor Yellow
    $WarningCount++
}
Write-Host ""

# 7. Verificar AndroidManifest
Write-Host "[7/7] Verificando AndroidManifest..." -ForegroundColor Yellow
$Manifest = Get-Content "$AndroidDir\app\src\main\AndroidManifest.xml" -Raw

$ManifestChecks = @{
    "FCMService registrado" = "FCMService"
    "Intent Filter FCM" = "com.google.firebase.MESSAGING_EVENT"
    "NotificationListenerService" = "NotificationListenerService"
    "Permissao INTERNET" = "android.permission.INTERNET"
    "Permissao WAKE_LOCK" = "android.permission.WAKE_LOCK"
}

foreach ($check in $ManifestChecks.GetEnumerator()) {
    if ($Manifest -match [regex]::Escape($check.Value)) {
        Write-Host "   [OK] $($check.Key)" -ForegroundColor Green
    } else {
        Write-Host "   [ERRO] $($check.Key) FALTANDO!" -ForegroundColor Red
        $ErrorCount++
    }
}
Write-Host ""

# 8. Resumo Final
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "RESUMO DA VALIDACAO" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

if ($ErrorCount -eq 0 -and $WarningCount -eq 0) {
    Write-Host "[SUCESSO] VALIDACAO 100% CONCLUIDA!" -ForegroundColor Green
    Write-Host "   Nenhum erro encontrado" -ForegroundColor Green
    Write-Host "   Nenhum warning encontrado" -ForegroundColor Green
    Write-Host ""
    Write-Host "   O build esta PRONTO PARA PRODUCAO!" -ForegroundColor Green
} elseif ($ErrorCount -eq 0) {
    Write-Host "[SUCESSO] VALIDACAO CONCLUIDA COM AVISOS" -ForegroundColor Yellow
    Write-Host "   Nenhum erro encontrado" -ForegroundColor Green
    Write-Host "   $WarningCount warning(s) encontrado(s)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   O build esta OK, mas revise os warnings." -ForegroundColor Yellow
} else {
    Write-Host "[FALHA] VALIDACAO FALHOU" -ForegroundColor Red
    Write-Host "   $ErrorCount erro(s) encontrado(s)" -ForegroundColor Red
    if ($WarningCount -gt 0) {
        Write-Host "   $WarningCount warning(s) encontrado(s)" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "   Corrija os erros antes de fazer deploy!" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Retorna ao diretorio original
Set-Location $ProjectRoot

# Exit code
if ($ErrorCount -gt 0) {
    exit 1
} else {
    exit 0
}
