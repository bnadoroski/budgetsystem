package com.budgetsystem.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;

/**
 * Foreground Service para manter o app ativo em segundo plano.
 * Isso ajuda a evitar que o Android mate o NotificationListenerService
 * quando a tela está bloqueada ou o app está em segundo plano.
 */
public class BudgetForegroundService extends Service {
    private static final String TAG = "BudgetForegroundSvc";
    private static final String CHANNEL_ID = "budget_foreground_channel";
    private static final int NOTIFICATION_ID = 1001;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "🚀 BudgetForegroundService CRIADO!");
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "▶️ BudgetForegroundService INICIADO!");
        
        // Cria notificação e inicia como foreground
        Notification notification = createNotification();
        startForeground(NOTIFICATION_ID, notification);
        
        // START_STICKY = reinicia automaticamente se o sistema matar o serviço
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "💀 BudgetForegroundService DESTRUÍDO!");
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Budget System Monitor",
                NotificationManager.IMPORTANCE_LOW // Low = sem som, sem vibração
            );
            channel.setDescription("Mantém o monitoramento de notificações bancárias ativo");
            channel.setShowBadge(false);
            channel.setSound(null, null);
            channel.enableVibration(false);
            
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification createNotification() {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            intent, 
            PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Budget System")
            .setContentText("Monitorando notificações bancárias")
            .setSmallIcon(android.R.drawable.ic_menu_manage) // Ícone discreto
            .setContentIntent(pendingIntent)
            .setOngoing(true) // Não pode ser descartada
            .setPriority(NotificationCompat.PRIORITY_LOW) // Prioridade baixa = discreta
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setSilent(true) // Sem som
            .build();
    }
}
