package com.budgetsystem.app;

import android.util.Log;
import android.content.Intent;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

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
}
