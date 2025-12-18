package com.budgetsystem.app;

import android.service.notification.StatusBarNotification;
import android.os.Bundle;
import android.util.Log;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class NotificationListenerService extends android.service.notification.NotificationListenerService {
    private static final String TAG = "BudgetNotifListener";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "🎧 NotificationListenerService CRIADO!");
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
                plugin.notifyBankExpense(bank, amount, description, category);
                Log.d(TAG, "✅ Enviado com sucesso!");
            } else {
                Log.e(TAG, "❌ NotificationPlugin não está disponível!");
            }

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

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {
        // Opcional: log quando notificação é removida
        Log.d(TAG, "🗑️ Notificação removida: " + sbn.getPackageName());
    }
}
