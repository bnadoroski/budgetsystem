package com.budgetsystem.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import com.budgetsystem.app.NotificationPlugin;
import org.json.JSONObject;
import org.json.JSONArray;

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
        String description = intent.getStringExtra("description");
        String category = intent.getStringExtra("category");
        String amountStr = intent.getStringExtra("amount");

        // Fallbacks
        if (bank == null) bank = "Teste";
        if (description == null) description = "Despesa de teste";
        if (category == null) category = "Outros";
        if (amountStr == null) amountStr = "0";

        Log.d(TAG, "🏦 Banco: " + bank);
        Log.d(TAG, "📝 Descrição: " + description);
        Log.d(TAG, "🏷️ Categoria: " + category);
        Log.d(TAG, "💵 Valor: R$ " + amountStr);

        try {
            double amount = Double.parseDouble(amountStr);

            // Tenta enviar para o plugin primeiro
            NotificationPlugin plugin = NotificationPlugin.getInstance();
            if (plugin != null) {
                Log.d(TAG, "✅ Enviando para NotificationPlugin");
                plugin.notifyBankExpense(bank, amount, description, category);
            } else {
                // App fechado - salva em SharedPreferences
                Log.w(TAG, "⚠️ NotificationPlugin não disponível - salvando para depois");
                savePendingExpense(context, bank, amount, description, category);
            }

        } catch (NumberFormatException e) {
            Log.e(TAG, "❌ Erro ao converter valor: " + amountStr, e);
        }
    }
    
    private void savePendingExpense(Context context, String bank, double amount, 
                                    String description, String category) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("budget_pending_expenses", Context.MODE_PRIVATE);
            String existingJson = prefs.getString("expenses", "[]");
            
            JSONArray expenses = new JSONArray(existingJson);
            
            JSONObject expense = new JSONObject();
            expense.put("bank", bank);
            expense.put("amount", amount);
            expense.put("description", description);
            expense.put("category", category);
            expense.put("timestamp", System.currentTimeMillis());
            
            expenses.put(expense);
            
            // Salvar
            prefs.edit().putString("expenses", expenses.toString()).apply();
            
            Log.d(TAG, "💾 Despesa salva em SharedPreferences! Total pendentes: " + expenses.length());
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao salvar despesa pendente: " + e.getMessage(), e);
        }
    }
}
