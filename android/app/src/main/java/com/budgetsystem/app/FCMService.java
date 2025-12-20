package com.budgetsystem.app;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class FCMService extends FirebaseMessagingService {
    private static final String TAG = "FCMService";
    
    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "📨 Mensagem FCM recebida de: " + remoteMessage.getFrom());
        
        // Verifica se tem payload de dados
        if (!remoteMessage.getData().isEmpty()) {
            Log.d(TAG, "📦 Dados da mensagem: " + remoteMessage.getData());
            
            // Processa dados customizados
            handleDataPayload(remoteMessage.getData());
        }
        
        // Verifica se tem notificação
        if (remoteMessage.getNotification() != null) {
            Log.d(TAG, "📬 Título: " + remoteMessage.getNotification().getTitle());
            Log.d(TAG, "📝 Corpo: " + remoteMessage.getNotification().getBody());
            
            // A notificação será exibida automaticamente quando o app está em background
            // Se quiser customizar, use handleNotification()
        }
    }
    
    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "🔑 Novo FCM token: " + token);
        
        // TODO: Enviar token para o servidor/Firestore
        // O token será obtido via FCMPlugin.getToken() no lado TypeScript
        sendTokenToServer(token);
    }
    
    private void handleDataPayload(java.util.Map<String, String> data) {
        String type = data.get("type");
        
        if ("invite_response".equals(type)) {
            // Convite aceito ou rejeitado
            Log.d(TAG, "🎉 Resposta de convite recebida");
        } else if ("pending_expenses".equals(type)) {
            // Lembrete de despesas pendentes
            Log.d(TAG, "💰 Lembrete de despesas pendentes");
        } else if ("inactivity".equals(type)) {
            // Usuário inativo há 15+ dias
            Log.d(TAG, "😴 Lembrete de inatividade");
        }
    }
    
    private void sendTokenToServer(String token) {
        // TODO: Implementar envio do token para Firestore
        Log.d(TAG, "📤 Token seria enviado ao servidor: " + token);
    }
}
