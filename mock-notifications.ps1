# Script para gerar notificações mock de banco via ADB
# Simula notificações do C6 Bank e outros bancos

Write-Host "=== Gerador de Notificações Mock de Banco ===" -ForegroundColor Cyan
Write-Host ""

# Verificar se ADB está disponível
$adbPath = "adb"
try {
    $null = & $adbPath version 2>&1
} catch {
    Write-Host "Erro: ADB não encontrado. Instale o Android SDK Platform Tools." -ForegroundColor Red
    exit 1
}

# Verificar se há dispositivo conectado
$devices = & $adbPath devices | Select-String "device$"
if ($devices.Count -eq 0) {
    Write-Host "Erro: Nenhum dispositivo Android conectado." -ForegroundColor Red
    Write-Host "Conecte um dispositivo via USB ou inicie um emulador." -ForegroundColor Yellow
    exit 1
}

Write-Host "Dispositivo detectado!" -ForegroundColor Green
Write-Host ""

# Função para enviar notificação
function Send-MockNotification {
    param(
        [string]$Bank,
        [string]$Title,
        [string]$Text,
        [string]$Amount
    )
    
    Write-Host "Enviando: [$Bank] $Title - $Amount" -ForegroundColor Yellow
    
    $packageName = "com.budgetsystem.app"
    
    # Comando ADB para enviar broadcast com dados da notificação
    $command = "am broadcast -a com.budgetsystem.MOCK_NOTIFICATION --es bank `"$Bank`" --es title `"$Title`" --es text `"$Text`" --es amount `"$Amount`""
    
    & $adbPath shell $command | Out-Null
    Start-Sleep -Milliseconds 500
}

# Menu de opções
Write-Host "Escolha o tipo de notificação:" -ForegroundColor Cyan
Write-Host "1. Notificações do C6 Bank (como na imagem)"
Write-Host "2. Notificações variadas de bancos"
Write-Host "3. Notificação customizada"
Write-Host "4. Enviar múltiplas notificações aleatórias"
Write-Host ""

$choice = Read-Host "Opção"

switch ($choice) {
    "1" {
        # Notificações do C6 Bank (similar às imagens)
        Write-Host ""
        Write-Host "Enviando notificações do C6 Bank..." -ForegroundColor Green
        Write-Host ""
        
        Send-MockNotification -Bank "C6 Bank" -Title "Compra no crédito aprovada" `
            -Text "Sua compra no cartão final 9428 no valor de R$ 194,65, dia 17/12/2025 às 16:45, em BAZAR DA CASA Curitiba BRA, foi aprovada." `
            -Amount "194.65"
        
        Send-MockNotification -Bank "C6 Bank" -Title "Compra no crédito aprovada" `
            -Text "Sua compra no cartão final 9428 no valor de R$ 276,00, dia 17/12/2025 às 16:29, em Pinhit CURITIBA BRA, foi aprovada." `
            -Amount "276.00"
        
        Write-Host ""
        Write-Host "Notificações enviadas com sucesso!" -ForegroundColor Green
    }
    
    "2" {
        Write-Host ""
        Write-Host "Enviando notificações variadas..." -ForegroundColor Green
        Write-Host ""
        
        # C6 Bank
        Send-MockNotification -Bank "C6 Bank" -Title "Compra aprovada" `
            -Text "Compra de R$ 89,90 no Magazine Luiza aprovada" `
            -Amount "89.90"
        
        # Nubank
        Send-MockNotification -Bank "Nubank" -Title "Compra aprovada" `
            -Text "Compra de R$ 45,50 no iFood foi aprovada" `
            -Amount "45.50"
        
        # Inter
        Send-MockNotification -Bank "Banco Inter" -Title "Pagamento realizado" `
            -Text "Pagamento de R$ 150,00 realizado com sucesso" `
            -Amount "150.00"
        
        # Itaú
        Send-MockNotification -Bank "Itaú" -Title "Compra débito" `
            -Text "Compra no débito de R$ 23,80 em Supermercado Carrefour" `
            -Amount "23.80"
        
        Write-Host ""
        Write-Host "Notificações enviadas com sucesso!" -ForegroundColor Green
    }
    
    "3" {
        Write-Host ""
        $bank = Read-Host "Nome do banco"
        $title = Read-Host "Título da notificação"
        $text = Read-Host "Texto da notificação"
        $amount = Read-Host "Valor (ex: 123.45)"
        
        Write-Host ""
        Send-MockNotification -Bank $bank -Title $title -Text $text -Amount $amount
        Write-Host ""
        Write-Host "Notificação enviada!" -ForegroundColor Green
    }
    
    "4" {
        Write-Host ""
        $count = Read-Host "Quantas notificações? (ex: 5)"
        Write-Host ""
        Write-Host "Enviando $count notificações aleatórias..." -ForegroundColor Green
        Write-Host ""
        
        $banks = @("C6 Bank", "Nubank", "Banco Inter", "Itaú", "Bradesco", "Santander")
        $stores = @("Magazine Luiza", "iFood", "Uber", "Netflix", "Mercado Livre", "Amazon", 
                   "Carrefour", "Extra", "Pão de Açúcar", "Americanas", "Casas Bahia")
        
        for ($i = 1; $i -le [int]$count; $i++) {
            $bank = $banks | Get-Random
            $store = $stores | Get-Random
            $amount = [math]::Round((Get-Random -Minimum 10 -Maximum 500) + (Get-Random) / 100, 2)
            
            Send-MockNotification -Bank $bank -Title "Compra aprovada" `
                -Text "Compra de R$ $amount em $store aprovada" `
                -Amount $amount
        }
        
        Write-Host ""
        Write-Host "Todas as notificações foram enviadas!" -ForegroundColor Green
    }
    
    default {
        Write-Host "Opção inválida!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Para ver os logs do app, execute:" -ForegroundColor Cyan
Write-Host "adb logcat | Select-String 'BudgetNotification'" -ForegroundColor White
Write-Host ""
