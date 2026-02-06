package com.budgetsystem.app.utils;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.budgetsystem.app.MainActivity;

/**
 * Classe utilitária para criação de canais e notificações.
 * Centraliza toda a lógica duplicada nos serviços.
 */
public final class NotificationHelper {
    
    private NotificationHelper() {
        // Classe utilitária - não instanciar
    }
    
    // ==================== NOTIFICATION CHANNELS ====================
    
    /**
     * Cria todos os canais de notificação necessários.
     * Deve ser chamado na inicialização do app.
     */
    public static void createAllChannels(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            createForegroundChannel(context);
            createAlertsChannel(context);
            createListenerChannel(context);
        }
    }
    
    /**
     * Cria o canal para o serviço foreground (baixa prioridade).
     */
    public static void createForegroundChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                Constants.CHANNEL_FOREGROUND,
                Constants.CHANNEL_FOREGROUND_NAME,
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription(Constants.CHANNEL_FOREGROUND_DESC);
            channel.setShowBadge(false);
            channel.enableVibration(false);
            channel.setSound(null, null);
            
            getNotificationManager(context).createNotificationChannel(channel);
        }
    }
    
    /**
     * Cria o canal para alertas de despesas (alta prioridade).
     */
    public static void createAlertsChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                Constants.CHANNEL_NOTIFICATIONS,
                Constants.CHANNEL_NOTIFICATIONS_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription(Constants.CHANNEL_NOTIFICATIONS_DESC);
            channel.setShowBadge(true);
            channel.enableVibration(true);
            
            getNotificationManager(context).createNotificationChannel(channel);
        }
    }
    
    /**
     * Cria o canal para o listener de notificações (baixa prioridade).
     */
    public static void createListenerChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                Constants.CHANNEL_LISTENER,
                Constants.CHANNEL_LISTENER_NAME,
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription(Constants.CHANNEL_LISTENER_DESC);
            channel.setShowBadge(false);
            
            getNotificationManager(context).createNotificationChannel(channel);
        }
    }
    
    // ==================== NOTIFICATIONS ====================
    
    /**
     * Cria uma notificação para o serviço foreground.
     */
    public static Notification buildForegroundNotification(Context context, String title, String text) {
        PendingIntent pendingIntent = createMainActivityIntent(context);
        
        return new NotificationCompat.Builder(context, Constants.CHANNEL_FOREGROUND)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_info_details)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }
    
    /**
     * Cria uma notificação de alerta para nova despesa.
     */
    public static Notification buildExpenseNotification(
            Context context, 
            String title, 
            String text,
            String bigText) {
        
        PendingIntent pendingIntent = createMainActivityIntent(context);
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, Constants.CHANNEL_NOTIFICATIONS)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE);
        
        if (bigText != null && !bigText.isEmpty()) {
            builder.setStyle(new NotificationCompat.BigTextStyle().bigText(bigText));
        }
        
        return builder.build();
    }
    
    /**
     * Mostra uma notificação.
     */
    public static void showNotification(Context context, int notificationId, Notification notification) {
        getNotificationManager(context).notify(notificationId, notification);
    }
    
    /**
     * Cancela uma notificação.
     */
    public static void cancelNotification(Context context, int notificationId) {
        getNotificationManager(context).cancel(notificationId);
    }
    
    // ==================== PENDING INTENTS ====================
    
    /**
     * Cria um PendingIntent para abrir a MainActivity.
     */
    public static PendingIntent createMainActivityIntent(Context context) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        return PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );
    }
    
    // ==================== HELPERS ====================
    
    /**
     * Obtém o NotificationManager do sistema.
     */
    public static NotificationManager getNotificationManager(Context context) {
        return (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    }
    
    /**
     * Verifica se as notificações estão habilitadas para o app.
     */
    public static boolean areNotificationsEnabled(Context context) {
        NotificationManager manager = getNotificationManager(context);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            return manager.areNotificationsEnabled();
        }
        return true;
    }
}
