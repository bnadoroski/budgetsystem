package com.budgetsystem.app;

import android.util.Log;
import android.content.Intent;
import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;
import org.json.JSONArray;

@CapacitorPlugin(name = "NotificationPlugin")
public class NotificationPlugin extends Plugin {
    private static final String TAG = "NotificationPlugin";
    private static NotificationPlugin instance;

    @Override
    public void load() {
        super.load();
        instance = this;
        Log.d(TAG, "🔌 NotificationPlugin carregado!");
    }

    public static NotificationPlugin getInstance() {
        return instance;
    }

    // Verifica se tem permissão de notificação
    @PluginMethod
    public void checkPermission(PluginCall call) {
        String enabledListeners = Settings.Secure.getString(
            getContext().getContentResolver(),
            "enabled_notification_listeners"
        );
        
        boolean hasPermission = enabledListeners != null && 
            enabledListeners.contains(getContext().getPackageName());
        
        Log.d(TAG, "🔐 Permissão de notificação: " + (hasPermission ? "HABILITADA ✅" : "DESABILITADA ❌"));
        
        JSObject ret = new JSObject();
        ret.put("hasPermission", hasPermission);
        call.resolve(ret);
    }

    // Abre configurações de permissão de notificação
    @PluginMethod
    public void requestPermission(PluginCall call) {
        Log.d(TAG, "📱 Abrindo configurações de permissão...");
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        getActivity().startActivity(intent);
        call.resolve();
    }

    // Chamado pelo NotificationListenerService quando detecta despesa
    public void notifyBankExpense(String bank, double amount, String description, String category, 
                                   String merchantName, int installmentNumber, int installmentTotal) {
        Log.d(TAG, "💰 notifyBankExpense chamado:");
        Log.d(TAG, "  - Bank: " + bank);
        Log.d(TAG, "  - Amount: R$ " + amount);
        Log.d(TAG, "  - Description: " + description);
        Log.d(TAG, "  - Category: " + category);
        Log.d(TAG, "  - Merchant: " + merchantName);
        if (installmentTotal > 0) {
            Log.d(TAG, "  - Installments: " + installmentNumber + "/" + installmentTotal);
        }

        JSObject ret = new JSObject();
        ret.put("bank", bank);
        ret.put("amount", amount);
        ret.put("description", description);
        ret.put("category", category);
        ret.put("timestamp", System.currentTimeMillis());
        
        if (merchantName != null && !merchantName.isEmpty()) {
            ret.put("merchantName", merchantName);
        }
        
        if (installmentTotal > 0) {
            ret.put("installmentNumber", installmentNumber);
            ret.put("installmentTotal", installmentTotal);
        }

        Log.d(TAG, "📤 Enviando evento 'bankExpense' para o JavaScript");
        notifyListeners("bankExpense", ret);
    }
    
    // Versão legacy para compatibilidade (caso chamado sem novos parâmetros)
    public void notifyBankExpense(String bank, double amount, String description, String category) {
        notifyBankExpense(bank, amount, description, category, null, 0, 0);
    }

    @PluginMethod
    public void echo(PluginCall call) {
        String value = call.getString("value");
        Log.d(TAG, "✅ Echo recebido: " + value);

        JSObject ret = new JSObject();
        ret.put("value", value);
        call.resolve(ret);
    }

    // Verifica se está ignorando otimizações de bateria
    @PluginMethod
    public void checkBatteryOptimization(PluginCall call) {
        boolean isIgnoring = false;
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            isIgnoring = pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        } else {
            isIgnoring = true; // Antes do Android M não tinha essa restrição
        }
        
        Log.d(TAG, "🔋 Ignorando otimização de bateria: " + (isIgnoring ? "SIM ✅" : "NÃO ❌"));
        
        JSObject ret = new JSObject();
        ret.put("isIgnoring", isIgnoring);
        call.resolve(ret);
    }

    // Solicita para ignorar otimizações de bateria
    @PluginMethod
    public void requestIgnoreBatteryOptimization(PluginCall call) {
        Log.d(TAG, "🔋 Solicitando para ignorar otimização de bateria...");
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            
            if (!pm.isIgnoringBatteryOptimizations(getContext().getPackageName())) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(intent);
            } else {
                Log.d(TAG, "✅ Já está ignorando otimização de bateria");
            }
        }
        
        call.resolve();
    }

    // Abre configurações de bateria do app
    @PluginMethod
    public void openBatterySettings(PluginCall call) {
        Log.d(TAG, "⚙️ Abrindo configurações de bateria...");
        
        try {
            // Tenta abrir configurações específicas do app
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
        } catch (Exception e) {
            // Fallback para configurações gerais de bateria
            Intent intent = new Intent(Settings.ACTION_BATTERY_SAVER_SETTINGS);
            getActivity().startActivity(intent);
        }
        
        call.resolve();
    }

    // Carrega despesas pendentes que foram salvas enquanto o app estava fechado
    @PluginMethod
    public void loadPendingExpenses(PluginCall call) {
        Log.d(TAG, "📂 Carregando despesas pendentes...");
        
        try {
            SharedPreferences prefs = getContext().getSharedPreferences("budget_pending_expenses", Context.MODE_PRIVATE);
            String expensesJson = prefs.getString("expenses", "[]");
            
            JSONArray expenses = new JSONArray(expensesJson);
            Log.d(TAG, "📂 Encontradas " + expenses.length() + " despesas pendentes");
            
            JSArray jsExpenses = new JSArray();
            for (int i = 0; i < expenses.length(); i++) {
                JSONObject expense = expenses.getJSONObject(i);
                JSObject jsExpense = new JSObject();
                jsExpense.put("bank", expense.optString("bank", "Outro"));
                jsExpense.put("amount", expense.optDouble("amount", 0));
                jsExpense.put("description", expense.optString("description", ""));
                jsExpense.put("category", expense.optString("category", "Outros"));
                jsExpense.put("timestamp", expense.optLong("timestamp", System.currentTimeMillis()));
                
                if (expense.has("merchantName")) {
                    jsExpense.put("merchantName", expense.getString("merchantName"));
                }
                if (expense.has("installmentNumber")) {
                    jsExpense.put("installmentNumber", expense.getInt("installmentNumber"));
                    jsExpense.put("installmentTotal", expense.getInt("installmentTotal"));
                }
                
                jsExpenses.put(jsExpense);
            }
            
            JSObject ret = new JSObject();
            ret.put("expenses", jsExpenses);
            ret.put("count", expenses.length());
            call.resolve(ret);
            
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao carregar despesas pendentes: " + e.getMessage(), e);
            JSObject ret = new JSObject();
            ret.put("expenses", new JSArray());
            ret.put("count", 0);
            call.resolve(ret);
        }
    }

    // Limpa as despesas pendentes após serem processadas
    @PluginMethod
    public void clearPendingExpenses(PluginCall call) {
        Log.d(TAG, "🗑️ Limpando despesas pendentes...");
        
        try {
            SharedPreferences prefs = getContext().getSharedPreferences("budget_pending_expenses", Context.MODE_PRIVATE);
            prefs.edit().putString("expenses", "[]").apply();
            Log.d(TAG, "✅ Despesas pendentes limpas!");
            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao limpar despesas pendentes: " + e.getMessage(), e);
            call.reject("Erro ao limpar despesas pendentes");
        }
    }
}
