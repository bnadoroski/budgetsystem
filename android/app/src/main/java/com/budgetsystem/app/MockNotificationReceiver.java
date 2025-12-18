package com.budgetsystem.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import com.budgetsystem.app.NotificationPlugin;

public class MockNotificationReceiver extends BroadcastReceiver {
    private static final String TAG = "MockNotificationRcv";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent.getAction() == null || !intent.getAction().equals("com.budgetsystem.MOCK_NOTIFICATION")) {
            return;
        }

        Log.d(TAG, "🎭 MOCK NOTIFICATION RECEBIDA!");

        // Extrair dados do intent
        String bank = intent.getStringExtra("bank");
        String title = intent.getStringExtra("title");
        String text = intent.getStringExtra("text");
        String amountStr = intent.getStringExtra("amount");

        Log.d(TAG, "🏦 Banco: " + bank);
        Log.d(TAG, "📌 Título: " + title);
        Log.d(TAG, "📝 Texto: " + text);
        Log.d(TAG, "💵 Valor: R$ " + amountStr);

        // Validar dados
        if (bank == null || title == null || text == null || amountStr == null) {
            Log.e(TAG, "❌ Dados incompletos no mock");
            return;
        }

        try {
            double amount = Double.parseDouble(amountStr);

            // Enviar para o plugin
            NotificationPlugin plugin = NotificationPlugin.getInstance();
            if (plugin != null) {
                Log.d(TAG, "✅ Enviando para NotificationPlugin");
                plugin.notifyBankExpense(bank, amount, text, "Auto");
            } else {
                Log.w(TAG, "⚠️ NotificationPlugin não disponível");
            }

        } catch (NumberFormatException e) {
            Log.e(TAG, "❌ Erro ao converter valor: " + amountStr, e);
        }
    }
}
