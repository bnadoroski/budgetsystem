package com.budgetsystem.app;

import android.content.SharedPreferences;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.SetOptions;
import java.util.HashMap;
import java.util.Map;

@CapacitorPlugin(name = "FCMTokenPlugin")
public class FCMTokenPlugin extends Plugin {
    private static final String TAG = "FCMTokenPlugin";

    @PluginMethod
    public void getToken(PluginCall call) {
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Log.e(TAG, "❌ Falha ao obter token FCM", task.getException());
                    call.reject("Falha ao obter token FCM: " + task.getException().getMessage());
                    return;
                }

                String token = task.getResult();
                Log.d(TAG, "✅ Token FCM obtido: " + token);

                // Salva no SharedPreferences
                saveTokenToPreferences(token);

                JSObject result = new JSObject();
                result.put("token", token);
                call.resolve(result);
            });
    }

    @PluginMethod
    public void saveTokenToFirestore(PluginCall call) {
        String userId = call.getString("userId");
        
        if (userId == null || userId.isEmpty()) {
            call.reject("userId é obrigatório");
            return;
        }

        Log.d(TAG, "📱 Obtendo token FCM para userId: " + userId);

        // Apenas obtém o token e retorna para o JavaScript salvar
        FirebaseMessaging.getInstance().getToken()
            .addOnCompleteListener(task -> {
                if (!task.isSuccessful()) {
                    Exception e = task.getException();
                    Log.e(TAG, "❌ Falha ao obter token FCM: " + (e != null ? e.getMessage() : "unknown error"), e);
                    call.reject("Falha ao obter token FCM: " + (e != null ? e.getMessage() : "unknown"));
                    return;
                }

                String token = task.getResult();
                
                if (token == null || token.isEmpty()) {
                    Log.e(TAG, "❌ Token FCM retornado é null ou vazio!");
                    call.reject("Token FCM é null ou vazio");
                    return;
                }
                
                Log.d(TAG, "✅ Token FCM obtido: " + token.substring(0, Math.min(20, token.length())) + "...");

                // Salva no SharedPreferences
                saveTokenToPreferences(token);

                // Retorna o token para o JavaScript salvar no Firestore
                // (O JavaScript tem a autenticação do Firebase)
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("token", token);
                result.put("needsFirestoreSave", true);
                call.resolve(result);
            });
    }

    @PluginMethod
    public void forceRefreshToken(PluginCall call) {
        // Deleta o token atual e obtém um novo
        FirebaseMessaging.getInstance().deleteToken()
            .addOnCompleteListener(deleteTask -> {
                if (!deleteTask.isSuccessful()) {
                    Log.w(TAG, "⚠️ Falha ao deletar token antigo");
                }
                
                // Obtém novo token
                FirebaseMessaging.getInstance().getToken()
                    .addOnCompleteListener(task -> {
                        if (!task.isSuccessful()) {
                            Log.e(TAG, "❌ Falha ao obter novo token FCM", task.getException());
                            call.reject("Falha ao obter novo token FCM");
                            return;
                        }

                        String token = task.getResult();
                        Log.d(TAG, "✅ Novo token FCM: " + token);

                        // Salva no SharedPreferences
                        saveTokenToPreferences(token);

                        JSObject result = new JSObject();
                        result.put("token", token);
                        call.resolve(result);
                    });
            });
    }

    private void saveTokenToPreferences(String token) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences("CapacitorStorage", getContext().MODE_PRIVATE);
            prefs.edit().putString("fcmToken", token).apply();
            Log.d(TAG, "✅ Token salvo no SharedPreferences");
        } catch (Exception e) {
            Log.e(TAG, "❌ Erro ao salvar no SharedPreferences: " + e.getMessage());
        }
    }
}
