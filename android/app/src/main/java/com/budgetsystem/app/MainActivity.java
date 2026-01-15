package com.budgetsystem.app;

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
    }
}
