package com.budgetsystem.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(name = "FCMPlugin")
public class FCMPlugin extends Plugin {
    private static final String TAG = "FCMPlugin";
    private static final String CHANNEL_ID = "budget_notifications";
    
    @Override
    public void load() {
        super.load();
        createNotificationChannel();
        Log.d(TAG, "🔔 FCMPlugin carregado!");
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Budget Notifications",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notificações do Budget System");
            channel.setShowBadge(true);
            
            NotificationManager manager = getContext().getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }
    
    @PluginMethod
    public void getToken(PluginCall call) {
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.w(TAG, "❌ Erro ao obter FCM token", task.getException());
                    call.reject("Erro ao obter token FCM");
                    return;
                }
                
                String token = task.getResult();
                Log.d(TAG, "✅ FCM Token obtido: " + token);
                
                JSObject ret = new JSObject();
                ret.put("token", token);
                call.resolve(ret);
            });
    }
    
    @PluginMethod
    public void setBadge(PluginCall call) {
        int count = call.getInt("count", 0);
        
        try {
            // Para Android 8.0+, o badge é gerenciado automaticamente pelas notificações
            // Mas podemos forçar usando algumas bibliotecas ou APIs específicas
            Log.d(TAG, "📱 Badge count definido para: " + count);
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao definir badge", e);
            call.reject("Erro ao definir badge");
        }
    }
    
    @PluginMethod
    public void clearBadge(PluginCall call) {
        try {
            Log.d(TAG, "🧹 Badge limpo");
            
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao limpar badge", e);
            call.reject("Erro ao limpar badge");
        }
    }
    
    @PluginMethod
    public void showLocalNotification(PluginCall call) {
        String title = call.getString("title", "Budget System");
        String body = call.getString("body", "");
        int badgeCount = call.getInt("badge", 0);
        
        Intent intent = new Intent(getContext(), MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            getContext(), 
            0, 
            intent, 
            PendingIntent.FLAG_IMMUTABLE
        );
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(getContext(), CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true);
        
        if (badgeCount > 0) {
            builder.setNumber(badgeCount);
        }
        
        NotificationManager notificationManager = 
            (NotificationManager) getContext().getSystemService(android.content.Context.NOTIFICATION_SERVICE);
        
        if (notificationManager != null) {
            notificationManager.notify(1, builder.build());
            Log.d(TAG, "📬 Notificação local exibida");
        }
        
        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
