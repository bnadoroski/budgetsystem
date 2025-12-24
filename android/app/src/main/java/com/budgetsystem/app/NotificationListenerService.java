package com.budgetsystem.app;

import android.service.notification.StatusBarNotification;
import android.os.Bundle;
import android.util.Log;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.net.URL;
import java.net.HttpURLConnection;
import org.json.JSONObject;
import java.io.OutputStream;

public class NotificationListenerService extends android.service.notification.NotificationListenerService {
    private static final String TAG = "BudgetNotifListener";
    private static final String CHANNEL_ID = "budget_listener_channel";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "NotificationListenerService CRIADO!");
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
    }

    @Override
    public void onListenerDisconnected() {
        super.onListenerDisconnected();
        Log.w(TAG, "⚠️ NotificationListener DESCONECTADO!");
        
        // Tentar reconectar
        requestRebind(null);
    }
    
    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "NotificationListenerService DESTRUIDO!");
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            Log.d(TAG, "📱 ===== NOVA NOTIFICAÇÃO RECEBIDA =====");
            
            String packageName = sbn.getPackageName();
            Log.d(TAG, "📦 Package: " + packageName);

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

            if (!isBankNotification) {
                Log.d(TAG, "❌ Não é notificação bancária, ignorando");
                return;
            }

            Log.d(TAG, "💰 NOTIFICAÇÃO BANCÁRIA DETECTADA!");

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

            // Descrição (título ou texto)
            String description = title != null && !title.isEmpty() ? title : text;
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
            } else {
                Log.e(TAG, "❌ NotificationPlugin não está disponível!");
            }
            
            // Envia também para FCM Cloud Function (opcional, para funcionar remotamente)
            sendToFirebaseFunction(bank, amount, description, category);

        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao processar notificação: " + e.getMessage(), e);
        }
    }

    private String identifyBank(String packageName) {
        // Mapeia packages para nomes de bancos
        if (packageName.contains("nubank")) return "Nubank";
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

    private String categorizeExpense(String text) {
        // Categoriza baseado em palavras-chave
        if (text.contains("alimentação") || text.contains("restaurante") || 
            text.contains("ifood") || text.contains("uber eats")) {
            return "Alimentação";
        }
        if (text.contains("transporte") || text.contains("uber") || 
            text.contains("99") || text.contains("gasolina")) {
            return "Transporte";
        }
        if (text.contains("mercado") || text.contains("supermercado")) {
            return "Mercado";
        }
        if (text.contains("farmácia") || text.contains("saúde") || 
            text.contains("hospital") || text.contains("médico")) {
            return "Saúde";
        }
        if (text.contains("conta") || text.contains("luz") || 
            text.contains("água") || text.contains("internet")) {
            return "Contas";
        }
        if (text.contains("transferência") || text.contains("pix")) {
            return "Transferência";
        }
        return "Outros";
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
}
