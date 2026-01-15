package com.budgetsystem.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class FCMService extends FirebaseMessagingService {
    private static final String TAG = "FCMService";
    private static final String CHANNEL_ID = "budget_notifications";
    private static final String CHANNEL_NAME = "Budget Notifications";
    
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "📨 Mensagem FCM recebida de: " + remoteMessage.getFrom());
        
        String title = "";
        String body = "";
        
        // Verifica se tem notificação
        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle();
            body = remoteMessage.getNotification().getBody();
            Log.d(TAG, "📬 Título: " + title);
            Log.d(TAG, "📝 Corpo: " + body);
        }
        
        // Verifica se tem payload de dados
        if (!remoteMessage.getData().isEmpty()) {
            Log.d(TAG, "📦 Dados da mensagem: " + remoteMessage.getData());
            
            // Se não tiver título/corpo da notificação, usa dos dados
            if (title.isEmpty() && remoteMessage.getData().containsKey("title")) {
                title = remoteMessage.getData().get("title");
            }
            if (body.isEmpty() && remoteMessage.getData().containsKey("body")) {
                body = remoteMessage.getData().get("body");
            }
            
            // Processa dados customizados
            handleDataPayload(remoteMessage.getData());
        }
        
        // Sempre mostra a notificação (mesmo com app em foreground)
        if (!title.isEmpty() || !body.isEmpty()) {
            showNotification(title, body);
        }
    }
    
    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "🔑 Novo FCM token: " + token);
        
        // Salva token no SharedPreferences para o Capacitor/TypeScript poder ler
        saveTokenToPreferences(token);
        
        // Tenta enviar para o Firestore diretamente
        sendTokenToFirestore(token);
    }
    
    private void saveTokenToPreferences(String token) {
        try {
            android.content.SharedPreferences prefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);
            prefs.edit().putString("fcmToken", token).apply();
            Log.d(TAG, "✅ FCM token salvo no SharedPreferences");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao salvar token no SharedPreferences: " + e.getMessage());
        }
    }
    
    private void sendTokenToFirestore(String token) {
        try {
            // Obtém o userId salvo pelo app
            android.content.SharedPreferences prefs = getSharedPreferences("CapacitorStorage", MODE_PRIVATE);
            String userId = prefs.getString("userId", null);
            
            if (userId == null || userId.isEmpty()) {
                Log.w(TAG, "⚠️ UserId não encontrado, token será salvo quando usuário logar");
                return;
            }
            
            // Envia para o Firestore via Firebase Admin
            com.google.firebase.firestore.FirebaseFirestore db = com.google.firebase.firestore.FirebaseFirestore.getInstance();
            java.util.Map<String, Object> data = new java.util.HashMap<>();
            data.put("fcmToken", token);
            data.put("fcmTokenUpdatedAt", new java.util.Date().toString());
            
            db.collection("users").document(userId)
                .set(data, com.google.firebase.firestore.SetOptions.merge())
                .addOnSuccessListener(aVoid -> {
                    Log.d(TAG, "✅ FCM token salvo no Firestore para userId: " + userId);
                })
                .addOnFailureListener(e -> {
                    Log.e(TAG, "❌ Erro ao salvar token no Firestore: " + e.getMessage());
                });
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao enviar token para Firestore: " + e.getMessage());
        }
    }
    
    private void showNotification(String title, String body) {
        createNotificationChannel();
        
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 
            0, 
            intent, 
            PendingIntent.FLAG_IMMUTABLE
        );
        
        Uri defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        
        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher) // Usa ícone do app
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setSound(defaultSoundUri)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent);
        
        NotificationManager notificationManager = 
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        
        // Usa timestamp como ID para evitar sobrescrever notificações
        int notificationId = (int) System.currentTimeMillis();
        notificationManager.notify(notificationId, notificationBuilder.build());
        
        Log.d(TAG, "✅ Notificação exibida: " + title);
    }
    
    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notificações de convites e lembretes do Budget System");
            channel.enableVibration(true);
            channel.enableLights(true);
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
            Log.d(TAG, "📢 Canal de notificação criado: " + CHANNEL_ID);
        }
    }
    
    private void handleDataPayload(java.util.Map<String, String> data) {
        String type = data.get("type");
        
        if ("invite".equals(type)) {
            String action = data.get("action");
            if ("view_invite".equals(action)) {
                Log.d(TAG, "📬 Novo convite de compartilhamento recebido");
            } else if ("refresh_budgets".equals(action)) {
                Log.d(TAG, "🔄 Convite aceito - recarregar budgets");
            } else if ("refresh_invites".equals(action)) {
                Log.d(TAG, "🔄 Convite rejeitado - recarregar convites");
            }
        } else if ("pending_expenses".equals(type)) {
            Log.d(TAG, "💰 Lembrete de despesas pendentes");
        } else if ("inactivity".equals(type)) {
            Log.d(TAG, "😴 Lembrete de inatividade");
        }
    }
}