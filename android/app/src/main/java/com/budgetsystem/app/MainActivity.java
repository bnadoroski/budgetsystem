package com.budgetsystem.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth.class);
        registerPlugin(NotificationPlugin.class);
        registerPlugin(BadgePlugin.class);
        registerPlugin(FCMTokenPlugin.class);
        super.onCreate(savedInstanceState);
        
        // Processa deep link na criação se existir
        handleDeepLink(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // Processa deep link quando o app já está aberto
        handleDeepLink(intent);
    }
    
    private void handleDeepLink(Intent intent) {
        String action = intent.getAction();
        Uri data = intent.getData();
        
        if (Intent.ACTION_VIEW.equals(action) && data != null) {
            // Converte a URL externa para o path que o WebView vai carregar
            String host = data.getHost();
            if ("budgetsystem.app".equals(host)) {
                String path = data.getPath();
                String query = data.getQuery();
                String localPath = path != null ? path : "/";
                if (query != null && !query.isEmpty()) {
                    localPath += "?" + query;
                }
                
                // Carrega a URL no WebView do Capacitor
                // O Capacitor automaticamente serve o app de https://budgetsystem.app
                android.util.Log.d("MainActivity", "Deep link received: " + localPath);
            }
        }
    }
}
