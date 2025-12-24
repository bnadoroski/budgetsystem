package com.budgetsystem.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Receiver que detecta quando o usuário desbloqueia o celular.
 * Quando isso acontece, notifica o NotificationListenerService para
 * verificar notificações bancárias que podem ter sido perdidas.
 */
public class ScreenUnlockReceiver extends BroadcastReceiver {
    private static final String TAG = "ScreenUnlockReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_USER_PRESENT.equals(intent.getAction())) {
            Log.d(TAG, "📱 Celular DESBLOQUEADO! Verificando notificações pendentes...");
            
            // Envia broadcast para o NotificationListenerService verificar notificações
            Intent checkIntent = new Intent("com.budgetsystem.CHECK_NOTIFICATIONS");
            context.sendBroadcast(checkIntent);
        }
    }
}
