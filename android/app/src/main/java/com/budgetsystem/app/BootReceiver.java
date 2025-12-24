package com.budgetsystem.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.ComponentName;
import android.os.Build;
import android.util.Log;

/**
 * Receiver que é acionado quando o dispositivo reinicia.
 * Garante que o NotificationListenerService seja reconectado
 * e que o ForegroundService seja iniciado.
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BudgetBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "📱 Boot receiver acionado: " + action);
        
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action) ||
            "com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {
            
            Log.d(TAG, "🔄 Dispositivo reiniciou - iniciando serviços");
            
            // Inicia o ForegroundService
            try {
                Intent serviceIntent = new Intent(context, BudgetForegroundService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
                Log.d(TAG, "✅ ForegroundService iniciado");
            } catch (Exception e) {
                Log.e(TAG, "❌ Erro ao iniciar ForegroundService: " + e.getMessage());
            }
            
            // Solicita que o sistema reconecte o NotificationListenerService
            try {
                ComponentName componentName = new ComponentName(
                    context.getPackageName(),
                    NotificationListenerService.class.getName()
                );
                
                android.service.notification.NotificationListenerService.requestRebind(componentName);
                Log.d(TAG, "✅ Rebind do NotificationListener solicitado");
            } catch (Exception e) {
                Log.e(TAG, "❌ Erro ao solicitar rebind: " + e.getMessage());
            }
        }
    }
}
