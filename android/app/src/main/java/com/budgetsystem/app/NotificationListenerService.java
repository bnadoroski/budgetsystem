package com.budgetsystem.app;

import android.service.notification.StatusBarNotification;
import android.os.Bundle;
import android.util.Log;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.HashSet;
import java.util.Set;
import java.net.URL;
import java.net.HttpURLConnection;
import org.json.JSONObject;
import org.json.JSONArray;
import java.io.OutputStream;

public class NotificationListenerService extends android.service.notification.NotificationListenerService {
    private static final String TAG = "BudgetNotifListener";
    private static final String CHANNEL_ID = "budget_listener_channel";
    
    // Guarda IDs de notificações já processadas para não duplicar
    private Set<String> processedNotificationIds = new HashSet<>();
    
    // BroadcastReceiver para verificar notificações quando o celular desbloquear
    private BroadcastReceiver checkNotificationsReceiver;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "NotificationListenerService CRIADO!");
        
        // Registra receiver para verificar notificações ao desbloquear
        registerCheckNotificationsReceiver();
    }
    
    /**
     * Registra um BroadcastReceiver para ouvir quando o celular é desbloqueado.
     */
    private void registerCheckNotificationsReceiver() {
        checkNotificationsReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("com.budgetsystem.CHECK_NOTIFICATIONS".equals(intent.getAction()) ||
                    Intent.ACTION_USER_PRESENT.equals(intent.getAction())) {
                    Log.d(TAG, "📱 Celular desbloqueado - verificando notificações ativas...");
                    checkActiveNotifications();
                }
            }
        };
        
        IntentFilter filter = new IntentFilter();
        filter.addAction("com.budgetsystem.CHECK_NOTIFICATIONS");
        filter.addAction(Intent.ACTION_USER_PRESENT);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(checkNotificationsReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(checkNotificationsReceiver, filter);
        }
        
        Log.d(TAG, "✅ CheckNotificationsReceiver registrado!");
    }
    
    /**
     * Verifica todas as notificações ativas na barra de notificações.
     * Útil para capturar notificações que chegaram quando o celular estava bloqueado.
     */
    private void checkActiveNotifications() {
        try {
            StatusBarNotification[] activeNotifications = getActiveNotifications();
            
            if (activeNotifications == null || activeNotifications.length == 0) {
                Log.d(TAG, "📭 Nenhuma notificação ativa");
                return;
            }
            
            Log.d(TAG, "📬 Encontradas " + activeNotifications.length + " notificações ativas");
            
            for (StatusBarNotification sbn : activeNotifications) {
                // Cria um ID único para esta notificação
                String notifId = sbn.getPackageName() + "_" + sbn.getId() + "_" + sbn.getPostTime();
                
                // Verifica se já processamos esta notificação
                if (processedNotificationIds.contains(notifId)) {
                    Log.d(TAG, "⏭️ Notificação já processada: " + notifId);
                    continue;
                }
                
                // Processa a notificação
                Log.d(TAG, "🔍 Verificando notificação ativa de: " + sbn.getPackageName());
                processNotification(sbn, true);
            }
            
            // Limpa IDs antigos para não crescer infinitamente (mantém últimas 100)
            if (processedNotificationIds.size() > 100) {
                processedNotificationIds.clear();
            }
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao verificar notificações ativas: " + e.getMessage(), e);
        }
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Budget System Listener",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Monitora notificações bancárias");
            channel.setShowBadge(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    private Notification createNotification() {
        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            intent, 
            PendingIntent.FLAG_IMMUTABLE
        );
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Budget System")
            .setContentText("Monitorando notificações bancárias")
            .setSmallIcon(android.R.drawable.ic_menu_info_details)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW);
        
        return builder.build();
    }

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        Log.d(TAG, "✅ NotificationListener CONECTADO e ATIVO!");
        
        // Inicia o Foreground Service para manter o app ativo
        startForegroundServiceIfNeeded();
        
        // Verifica notificações que já estavam na barra quando o listener conectou
        Log.d(TAG, "🔍 Verificando notificações existentes ao conectar...");
        checkActiveNotifications();
    }

    @Override
    public void onListenerDisconnected() {
        super.onListenerDisconnected();
        Log.w(TAG, "⚠️ NotificationListener DESCONECTADO!");
        
        // Tentar reconectar
        requestRebind(null);
    }
    
    /**
     * Inicia o Foreground Service para manter o app ativo em segundo plano.
     * Isso evita que o Android mate o serviço quando a tela está bloqueada.
     */
    private void startForegroundServiceIfNeeded() {
        try {
            Intent serviceIntent = new Intent(this, BudgetForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
            Log.d(TAG, "🚀 BudgetForegroundService iniciado!");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao iniciar ForegroundService: " + e.getMessage());
        }
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "NotificationListenerService DESTRUIDO!");
        
        // Desregistra o receiver
        if (checkNotificationsReceiver != null) {
            try {
                unregisterReceiver(checkNotificationsReceiver);
            } catch (Exception e) {
                Log.w(TAG, "Erro ao desregistrar receiver: " + e.getMessage());
            }
        }
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        processNotification(sbn, false);
    }
    
    /**
     * Processa uma notificação, seja em tempo real ou verificação posterior.
     * @param sbn A notificação a processar
     * @param isFromActiveCheck Se é de verificação de notificações ativas (após desbloqueio)
     */
    private void processNotification(StatusBarNotification sbn, boolean isFromActiveCheck) {
        try {
            String source = isFromActiveCheck ? "VERIFICAÇÃO AO DESBLOQUEAR" : "TEMPO REAL";
            Log.d(TAG, "📱 ===== NOTIFICAÇÃO [" + source + "] =====");
            
            String packageName = sbn.getPackageName();
            Log.d(TAG, "📦 Package: " + packageName);
            
            // Cria ID único para rastrear notificações processadas
            String notifId = packageName + "_" + sbn.getId() + "_" + sbn.getPostTime();

            Bundle extras = sbn.getNotification().extras;
            if (extras == null) {
                Log.d(TAG, "⚠️ Notificação sem extras");
                return;
            }

            String title = extras.getString("android.title");
            String text = extras.getCharSequence("android.text") != null 
                ? extras.getCharSequence("android.text").toString() 
                : "";
            String bigText = extras.getCharSequence("android.bigText") != null
                ? extras.getCharSequence("android.bigText").toString()
                : "";

            Log.d(TAG, "📌 Título: " + title);
            Log.d(TAG, "📝 Texto: " + text);
            Log.d(TAG, "📄 BigText: " + bigText);

            // Combina texto e bigText
            String fullText = (text + " " + bigText).toLowerCase();
            Log.d(TAG, "🔍 Texto completo: " + fullText);

            // Verifica se é notificação bancária/financeira
            boolean isBankNotification = 
                fullText.contains("transferência") ||
                fullText.contains("pix") ||
                fullText.contains("compra") ||
                fullText.contains("débito") ||
                fullText.contains("crédito") ||
                fullText.contains("pagamento") ||
                fullText.contains("recebeu") ||
                fullText.contains("r$") ||
                fullText.contains("real") ||
                fullText.contains("reais");

            // Verificar se é notificação de verificação de email do Firebase
            boolean isFirebaseVerification = 
                (packageName.contains("gmail") || packageName.contains("email") || packageName.contains("outlook") || packageName.contains("mail")) &&
                (fullText.contains("verify your email") || 
                 fullText.contains("verificar seu email") ||
                 fullText.contains("verifique seu email") ||
                 fullText.contains("confirme seu email") ||
                 fullText.contains("confirm your email") ||
                 fullText.contains("firebase") ||
                 (title != null && title.toLowerCase().contains("verificação")));

            if (isFirebaseVerification) {
                Log.d(TAG, "📧 NOTIFICAÇÃO DE VERIFICAÇÃO DE EMAIL DETECTADA!");
                handleEmailVerificationNotification(packageName, title, text);
                return;
            }

            if (!isBankNotification) {
                Log.d(TAG, "❌ Não é notificação bancária, ignorando");
                return;
            }

            Log.d(TAG, "💰 NOTIFICAÇÃO BANCÁRIA DETECTADA!");
            
            // Marca como processada para não duplicar
            processedNotificationIds.add(notifId);

            // Extrai valor monetário - padrão com r minúsculo (fullText está em toLowerCase)
            // Padrão: r$ 10,00 ou r$ 10 ou r$ 1.234,56
            Pattern pattern = Pattern.compile("r\\$\\s*([0-9]+(?:\\.[0-9]{3})*,[0-9]{2})");
            Matcher matcher = pattern.matcher(fullText);
            
            double amount = 0.0;
            if (matcher.find()) {
                String valueStr = matcher.group(1);
                Log.d(TAG, "💵 Valor encontrado (string): " + valueStr);
                
                // Remove pontos de milhar e troca vírgula por ponto
                valueStr = valueStr.replace(".", "").replace(",", ".");
                amount = Double.parseDouble(valueStr);
                Log.d(TAG, "💵 Valor parseado: " + amount);
            } else {
                Log.d(TAG, "⚠️ Nenhum valor encontrado na notificação");
                return;
            }
            
            // Extrair nome do comércio/estabelecimento
            String merchantName = extractMerchantName(fullText, title, text);
            Log.d(TAG, "🏪 Comércio identificado: " + merchantName);
            
            // Detectar parcelas
            int installmentNumber = 0;
            int installmentTotal = 0;
            InstallmentInfo installmentInfo = extractInstallmentInfo(fullText);
            if (installmentInfo != null) {
                installmentNumber = installmentInfo.current;
                installmentTotal = installmentInfo.total;
                Log.d(TAG, "💳 Parcelas detectadas: " + installmentNumber + "/" + installmentTotal);
            }

            // Identifica banco pelo package
            String bank = identifyBank(packageName);
            Log.d(TAG, "🏦 Banco identificado: " + bank);

            // Categoria baseada no conteúdo
            String category = categorizeExpense(fullText);
            Log.d(TAG, "🏷️ Categoria: " + category);

            // Descrição - tenta extrair informação útil do texto ao invés do título genérico
            String description = extractSmartDescription(title, text, bigText, fullText);
            if (description.length() > 100) {
                description = description.substring(0, 100) + "...";
            }
            Log.d(TAG, "📝 Descrição final: " + description);

            // Envia para o plugin Capacitor
            NotificationPlugin plugin = NotificationPlugin.getInstance();
            if (plugin != null) {
                Log.d(TAG, "📤 Enviando para NotificationPlugin...");
                plugin.notifyBankExpense(bank, amount, description, category, merchantName, installmentNumber, installmentTotal);
                Log.d(TAG, "✅ Enviado com sucesso!");
            }
            
            // SEMPRE salva no SharedPreferences como backup
            // Isso garante que mesmo se o evento JavaScript se perder, 
            // a despesa será carregada quando o app abrir/recarregar
            savePendingExpense(bank, amount, description, category, merchantName, installmentNumber, installmentTotal);
            
            // Envia também para FCM Cloud Function (opcional, para funcionar remotamente)
            sendToFirebaseFunction(bank, amount, description, category);

        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao processar notificação: " + e.getMessage(), e);
        }
    }

    private String identifyBank(String packageName) {
        // Mapeia packages para nomes de bancos
        if (packageName.contains("nubank") || packageName.contains("nu.production")) return "Nubank";
        if (packageName.contains("itau")) return "Itaú";
        if (packageName.contains("bradesco")) return "Bradesco";
        if (packageName.contains("santander")) return "Santander";
        if (packageName.contains("caixa")) return "Caixa";
        if (packageName.contains("bb") || packageName.contains("bancobrasil")) return "Banco do Brasil";
        if (packageName.contains("inter")) return "Banco Inter";
        if (packageName.contains("original")) return "Banco Original";
        if (packageName.contains("picpay")) return "PicPay";
        if (packageName.contains("mercadopago")) return "Mercado Pago";
        if (packageName.contains("next")) return "Next";
        if (packageName.contains("c6bank")) return "C6 Bank";
        return "Outro";
    }
    
    private void sendToFirebaseFunction(final String bank, final double amount, 
                                       final String description, final String category) {
        // Envia em thread separada para não bloquear
        new Thread(() -> {
            try {
                Log.d(TAG, "🔥 Enviando para Firebase Cloud Function...");
                
                // Pega userId do SharedPreferences (salvo quando usuário faz login)
                SharedPreferences prefs = getSharedPreferences("budget_system_prefs", MODE_PRIVATE);
                String userId = prefs.getString("userId", null);
                
                if (userId == null) {
                    Log.w(TAG, "⚠️ UserId não encontrado, pulando envio FCM");
                    return;
                }
                
                // URL da Cloud Function
                URL url = new URL("https://us-central1-budget-system-34ef8.cloudfunctions.net/sendExpenseNotification");
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                
                connection.setRequestMethod("POST");
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setDoOutput(true);
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                
                // Monta JSON
                JSONObject jsonData = new JSONObject();
                jsonData.put("userId", userId);
                jsonData.put("amount", amount);
                jsonData.put("bank", bank);
                jsonData.put("description", description);
                jsonData.put("category", category);
                
                // Envia
                OutputStream os = connection.getOutputStream();
                os.write(jsonData.toString().getBytes("UTF-8"));
                os.close();
                
                int responseCode = connection.getResponseCode();
                Log.d(TAG, "🔥 Firebase Function response: " + responseCode);
                
                if (responseCode == 200) {
                    Log.d(TAG, "✅ Notificação FCM enviada com sucesso!");
                } else {
                    Log.w(TAG, "⚠️ Firebase Function retornou: " + responseCode);
                }
                
                connection.disconnect();
                
            } catch (Exception e) {
                Log.e(TAG, "❌ Erro ao enviar para Firebase Function: " + e.getMessage());
            }
        }).start();
    }
    
    /**
     * Trata notificação de verificação de email do Firebase.
     * Envia um broadcast para o app informando que chegou email de verificação.
     */
    private void handleEmailVerificationNotification(String packageName, String title, String text) {
        try {
            Log.d(TAG, "📧 Processando notificação de verificação de email...");
            
            // Envia broadcast para o app
            Intent emailVerificationIntent = new Intent("com.budgetsystem.app.EMAIL_VERIFICATION_RECEIVED");
            emailVerificationIntent.setPackage(getPackageName());
            emailVerificationIntent.putExtra("title", title != null ? title : "");
            emailVerificationIntent.putExtra("text", text != null ? text : "");
            emailVerificationIntent.putExtra("source", packageName);
            sendBroadcast(emailVerificationIntent);
            
            Log.d(TAG, "✅ Broadcast de verificação de email enviado!");
            
            // Também notifica via plugin se disponível
            if (NotificationPlugin.getInstance() != null) {
                NotificationPlugin.getInstance().notifyEmailVerification(title, text);
            }
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao processar notificação de verificação: " + e.getMessage());
        }
    }

    private String categorizeExpense(String text) {
        // Categoriza baseado em palavras-chave
        // IMPORTANTE: Verificar Pix/Transferência ANTES de transporte
        // para evitar falsos positivos
        if (text.contains("pix") || text.contains("transferência") || text.contains("transferencia")) {
            return "Transferência";
        }
        if (text.contains("boleto") || text.contains("pagamento de fatura")) {
            return "Contas";
        }
        if (text.contains("alimentação") || text.contains("restaurante") || 
            text.contains("ifood") || text.contains("uber eats") || text.contains("rappi")) {
            return "Alimentação";
        }
        if (text.contains("transporte") || text.contains("uber") || 
            text.contains("99") || text.contains("gasolina") || text.contains("estacionamento")) {
            return "Transporte";
        }
        if (text.contains("mercado") || text.contains("supermercado")) {
            return "Mercado";
        }
        if (text.contains("farmácia") || text.contains("farmacia") || text.contains("saúde") || 
            text.contains("hospital") || text.contains("médico") || text.contains("medico")) {
            return "Saúde";
        }
        if (text.contains("conta") || text.contains("luz") || 
            text.contains("água") || text.contains("internet") || text.contains("energia")) {
            return "Contas";
        }
        return "Outros";
    }
    
    /**
     * Extrai uma descrição mais útil da notificação.
     * Em vez de usar apenas o título genérico (ex: "Boleto pago com sucesso"),
     * tenta extrair informações relevantes como nome do destinatário, empresa, etc.
     */
    private String extractSmartDescription(String title, String text, String bigText, String fullText) {
        // Usa bigText se disponível, senão text
        String searchText = (bigText != null && !bigText.isEmpty()) ? bigText : text;
        if (searchText == null) searchText = "";
        
        // NOVO: Padrão específico para nomes em CAIXA ALTA após "de", "para" ou "em"
        // Ex: "de GUILHERME SANTANA C", "para MARIA SILVA", "em LOJA XYZ"
        Pattern patternUpperCase = Pattern.compile("(?:de|para|em)\\s+([A-ZÀÁÂÃÉÊÍÓÔÕÚÇ][A-ZÀÁÂÃÉÊÍÓÔÕÚÇ\\s\\.]+?)(?:\\s*(?:\\.|,|cpf|no valor|r\\$|$))", Pattern.CASE_INSENSITIVE);
        Matcher matcherUpperCase = patternUpperCase.matcher(searchText);
        if (matcherUpperCase.find()) {
            String name = matcherUpperCase.group(1).trim();
            // Verifica se realmente tem letras maiúsculas (nome em caixa alta)
            if (name.length() >= 3 && name.length() <= 60 && hasUppercaseWords(name)) {
                String preposition = searchText.substring(matcherUpperCase.start(), matcherUpperCase.start() + 2).toLowerCase();
                if (preposition.startsWith("de")) {
                    // Recebido DE alguém
                    if (fullText.toLowerCase().contains("receb")) {
                        return "Recebido de " + capitalizeWords(name);
                    }
                    return "De " + capitalizeWords(name);
                } else if (preposition.startsWith("pa")) {
                    // Enviado PARA alguém
                    return "Para " + capitalizeWords(name);
                } else {
                    // Compra EM estabelecimento
                    return "Em " + capitalizeWords(name);
                }
            }
        }
        
        // Padrão: "para NOME" (boletos, pagamentos)
        Pattern patternPara = Pattern.compile("para\\s+([A-Za-zÀ-ÿ0-9\\s\\.\\-]+?)(?:\\s+(?:foi|no valor|r\\$|\\.|$))", Pattern.CASE_INSENSITIVE);
        Matcher matcherPara = patternPara.matcher(searchText);
        if (matcherPara.find()) {
            String recipient = matcherPara.group(1).trim();
            if (recipient.length() >= 3 && recipient.length() <= 60) {
                return capitalizeWords(recipient);
            }
        }
        
        // Padrão: "de NOME" (Pix recebido, transferência recebida)
        Pattern patternDe = Pattern.compile("(?:pix|transferência|valor)\\s+(?:recebido|de)\\s+(?:de\\s+)?([A-Za-zÀ-ÿ\\s]+?)(?:,|\\.|cpf|no valor|r\\$|$)", Pattern.CASE_INSENSITIVE);
        Matcher matcherDe = patternDe.matcher(searchText);
        if (matcherDe.find()) {
            String sender = matcherDe.group(1).trim();
            if (sender.length() >= 3 && sender.length() <= 60) {
                return "Pix de " + capitalizeWords(sender);
            }
        }
        
        // Padrão: "Compra em LOJA"
        Pattern patternCompra = Pattern.compile("compra\\s+(?:em|no|na)\\s+([A-Za-zÀ-ÿ0-9\\s\\.\\-]+?)(?:\\s+(?:no valor|aprovada|r\\$|\\.|$))", Pattern.CASE_INSENSITIVE);
        Matcher matcherCompra = patternCompra.matcher(searchText);
        if (matcherCompra.find()) {
            String store = matcherCompra.group(1).trim();
            if (store.length() >= 2 && store.length() <= 50) {
                return "Compra em " + capitalizeWords(store);
            }
        }
        
        // Padrão: "pagamento de fatura" específico para cartão
        if (fullText.contains("pagamento de fatura")) {
            return "Pagamento de fatura de cartão";
        }
        
        // Padrão: "Pix enviado para NOME"
        Pattern patternPixPara = Pattern.compile("pix\\s+(?:enviado\\s+)?para\\s+([A-Za-zÀ-ÿ\\s]+?)(?:\\s+(?:no valor|r\\$|\\.|$))", Pattern.CASE_INSENSITIVE);
        Matcher matcherPixPara = patternPixPara.matcher(searchText);
        if (matcherPixPara.find()) {
            String recipient = matcherPixPara.group(1).trim();
            if (recipient.length() >= 3 && recipient.length() <= 50) {
                return "Pix para " + capitalizeWords(recipient);
            }
        }
        
        // Se o título é muito genérico, tenta usar parte do texto
        String[] genericTitles = {
            "boleto pago com sucesso", "pagamento realizado", 
            "pix enviado", "pix recebido", "transferência realizada",
            "você recebeu um pix", "pagamento de fatura"
        };
        
        boolean isTitleGeneric = false;
        String lowerTitle = title != null ? title.toLowerCase() : "";
        for (String generic : genericTitles) {
            if (lowerTitle.contains(generic)) {
                isTitleGeneric = true;
                break;
            }
        }
        
        // Se título é genérico e temos texto, tenta extrair algo útil do texto
        if (isTitleGeneric && searchText.length() > 10) {
            // Pega até os primeiros 80 caracteres do texto que não sejam o valor
            String cleanedText = searchText.replaceAll("r\\$\\s*[0-9.,]+", "").trim();
            if (cleanedText.length() > 10) {
                // Limita e capitaliza
                String desc = cleanedText.length() > 80 ? cleanedText.substring(0, 80) : cleanedText;
                return capitalizeWords(desc);
            }
        }
        
        // Fallback: usa o título original
        return title != null && !title.isEmpty() ? title : (text != null ? text : "Transação");
    }
    
    private String extractMerchantName(String fullText, String title, String text) {
        // Tenta extrair nome do estabelecimento de padrões comuns
        // Padrão: "Compra em NOME DO ESTABELECIMENTO"
        Pattern pattern1 = Pattern.compile("compra\\s+(?:em|no|na)\\s+([^\\n\\r]+?)\\s+(?:r\\$|no valor|aprovada)", Pattern.CASE_INSENSITIVE);
        Matcher matcher1 = pattern1.matcher(text);
        if (matcher1.find()) {
            String merchant = matcher1.group(1).trim();
            // Limitar tamanho e limpar
            if (merchant.length() > 50) merchant = merchant.substring(0, 50);
            return capitalizeWords(merchant);
        }
        
        // Padrão: "aprovada em NOME DO ESTABELECIMENTO"
        Pattern patternAprovada = Pattern.compile("aprovada\\s+(?:em|no|na)\\s+([A-Za-zÀ-ÿ0-9\\s\\.\\-\\*]+?)(?:\\s*(?:\\.|,|r\\$|no valor|$))", Pattern.CASE_INSENSITIVE);
        Matcher matcherAprovada = patternAprovada.matcher(fullText);
        if (matcherAprovada.find()) {
            String merchant = matcherAprovada.group(1).trim();
            if (merchant.length() >= 2 && merchant.length() <= 50) {
                return capitalizeWords(merchant);
            }
        }
        
        // Padrão: "r$ VALOR em NOME DO ESTABELECIMENTO"
        Pattern patternValorEm = Pattern.compile("r\\$\\s*[0-9.,]+\\s+(?:em|no|na)\\s+([A-Za-zÀ-ÿ0-9\\s\\.\\-\\*]+?)(?:\\s*(?:\\.|,|aprovada|$))", Pattern.CASE_INSENSITIVE);
        Matcher matcherValorEm = patternValorEm.matcher(fullText);
        if (matcherValorEm.find()) {
            String merchant = matcherValorEm.group(1).trim();
            if (merchant.length() >= 2 && merchant.length() <= 50) {
                return capitalizeWords(merchant);
            }
        }
        
        // Padrão: "NOME - valor"
        Pattern pattern2 = Pattern.compile("^([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\\s\\.]+)\\s*-\\s*r\\$", Pattern.CASE_INSENSITIVE);
        Matcher matcher2 = pattern2.matcher(text);
        if (matcher2.find()) {
            String merchant = matcher2.group(1).trim();
            return capitalizeWords(merchant);
        }
        
        // Padrão: PIX para "Nome Pessoa"
        Pattern pattern3 = Pattern.compile("pix\\s+para\\s+([^\\n\\r]+?)\\s+(?:r\\$|no valor)", Pattern.CASE_INSENSITIVE);
        Matcher matcher3 = pattern3.matcher(text);
        if (matcher3.find()) {
            String merchant = matcher3.group(1).trim();
            if (merchant.length() > 50) merchant = merchant.substring(0, 50);
            return capitalizeWords(merchant);
        }
        
        // Padrão: "débito em NOME" ou "crédito em NOME"
        Pattern patternDebitoCredito = Pattern.compile("(?:débito|debito|crédito|credito)\\s+(?:em|no|na)\\s+([A-Za-zÀ-ÿ0-9\\s\\.\\-\\*]+?)(?:\\s*(?:\\.|,|r\\$|no valor|aprovad|$))", Pattern.CASE_INSENSITIVE);
        Matcher matcherDebitoCredito = patternDebitoCredito.matcher(fullText);
        if (matcherDebitoCredito.find()) {
            String merchant = matcherDebitoCredito.group(1).trim();
            if (merchant.length() >= 2 && merchant.length() <= 50) {
                return capitalizeWords(merchant);
            }
        }
        
        // Se não encontrou padrão, retorna "Desconhecido"
        return "Desconhecido";
    }
    
    private String capitalizeWords(String text) {
        // Capitaliza primeira letra de cada palavra
        String[] words = text.toLowerCase().split("\\s+");
        StringBuilder result = new StringBuilder();
        for (String word : words) {
            if (word.length() > 0) {
                result.append(Character.toUpperCase(word.charAt(0)));
                if (word.length() > 1) {
                    result.append(word.substring(1));
                }
                result.append(" ");
            }
        }
        return result.toString().trim();
    }
    
    /**
     * Verifica se o texto contém palavras em CAIXA ALTA (típico de nomes em notificações bancárias)
     */
    private boolean hasUppercaseWords(String text) {
        if (text == null || text.isEmpty()) return false;
        
        // Conta quantas letras maiúsculas vs minúsculas
        int upperCount = 0;
        int lowerCount = 0;
        for (char c : text.toCharArray()) {
            if (Character.isUpperCase(c)) upperCount++;
            else if (Character.isLowerCase(c)) lowerCount++;
        }
        
        // Se tem mais maiúsculas que minúsculas, provavelmente é nome em CAIXA ALTA
        return upperCount > lowerCount && upperCount >= 3;
    }
    
    private InstallmentInfo extractInstallmentInfo(String text) {
        // Padrões comuns de parcelas:
        // "3/12", "parcela 3 de 12", "3 de 12", "03/12"
        
        // Padrão: X/Y
        Pattern pattern1 = Pattern.compile("(\\d{1,2})/(\\d{1,2})");
        Matcher matcher1 = pattern1.matcher(text);
        if (matcher1.find()) {
            try {
                int current = Integer.parseInt(matcher1.group(1));
                int total = Integer.parseInt(matcher1.group(2));
                if (current > 0 && total > 0 && current <= total) {
                    return new InstallmentInfo(current, total);
                }
            } catch (NumberFormatException e) {
                // Ignora
            }
        }
        
        // Padrão: "parcela X de Y"
        Pattern pattern2 = Pattern.compile("parcela\\s+(\\d{1,2})\\s+de\\s+(\\d{1,2})", Pattern.CASE_INSENSITIVE);
        Matcher matcher2 = pattern2.matcher(text);
        if (matcher2.find()) {
            try {
                int current = Integer.parseInt(matcher2.group(1));
                int total = Integer.parseInt(matcher2.group(2));
                if (current > 0 && total > 0 && current <= total) {
                    return new InstallmentInfo(current, total);
                }
            } catch (NumberFormatException e) {
                // Ignora
            }
        }
        
        // Padrão: "X de Y"
        Pattern pattern3 = Pattern.compile("(\\d{1,2})\\s+de\\s+(\\d{1,2})");
        Matcher matcher3 = pattern3.matcher(text);
        if (matcher3.find()) {
            try {
                int current = Integer.parseInt(matcher3.group(1));
                int total = Integer.parseInt(matcher3.group(2));
                // Verifica se parece com parcela (ambos <= 99)
                if (current > 0 && total > 1 && current <= total && total <= 99) {
                    return new InstallmentInfo(current, total);
                }
            } catch (NumberFormatException e) {
                // Ignora
            }
        }
        
        return null; // Não é parcelado
    }
    
    // Classe helper para info de parcelas
    private static class InstallmentInfo {
        int current;
        int total;
        
        InstallmentInfo(int current, int total) {
            this.current = current;
            this.total = total;
        }
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // Opcional: log quando notificação é removida
        Log.d(TAG, "🗑️ Notificação removida: " + sbn.getPackageName());
    }
    
    /**
     * Salva despesa pendente em SharedPreferences para quando o app estiver fechado.
     * Quando o app abrir novamente, essas despesas serão carregadas.
     */
    private void savePendingExpense(String bank, double amount, String description, 
                                    String category, String merchantName, 
                                    int installmentNumber, int installmentTotal) {
        try {
            SharedPreferences prefs = getSharedPreferences("budget_pending_expenses", MODE_PRIVATE);
            String existingJson = prefs.getString("expenses", "[]");
            
            JSONArray expenses = new JSONArray(existingJson);
            
            JSONObject expense = new JSONObject();
            expense.put("bank", bank);
            expense.put("amount", amount);
            expense.put("description", description);
            expense.put("category", category);
            expense.put("timestamp", System.currentTimeMillis());
            
            if (merchantName != null && !merchantName.isEmpty()) {
                expense.put("merchantName", merchantName);
            }
            
            if (installmentTotal > 0) {
                expense.put("installmentNumber", installmentNumber);
                expense.put("installmentTotal", installmentTotal);
            }
            
            expenses.put(expense);
            
            // Salvar
            prefs.edit().putString("expenses", expenses.toString()).apply();
            
            Log.d(TAG, "💾 Despesa salva em SharedPreferences! Total pendentes: " + expenses.length());
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao salvar despesa pendente: " + e.getMessage(), e);
        }
    }
}
