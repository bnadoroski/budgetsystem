package com.budgetsystem

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import androidx.appcompat.app.AppCompatActivity
import android.widget.Button
import android.widget.TextView
import android.widget.Toast

class MainActivity : AppCompatActivity() {
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        val statusText = findViewById<TextView>(R.id.statusText)
        val enableButton = findViewById<Button>(R.id.enableButton)
        
        // Verifica se o serviço está habilitado
        updateStatus(statusText)
        
        enableButton.setOnClickListener {
            // Abre as configurações para habilitar o acesso a notificações
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            startActivity(intent)
        }
    }
    
    override fun onResume() {
        super.onResume()
        val statusText = findViewById<TextView>(R.id.statusText)
        updateStatus(statusText)
    }
    
    private fun updateStatus(statusText: TextView) {
        val isEnabled = isNotificationServiceEnabled()
        if (isEnabled) {
            statusText.text = "✓ Serviço ativo\n\nO Budget System está monitorando suas notificações bancárias."
            statusText.setTextColor(getColor(android.R.color.holo_green_dark))
        } else {
            statusText.text = "✗ Serviço inativo\n\nPor favor, habilite o acesso a notificações para o Budget System."
            statusText.setTextColor(getColor(android.R.color.holo_red_dark))
        }
    }
    
    private fun isNotificationServiceEnabled(): Boolean {
        val enabledListeners = Settings.Secure.getString(
            contentResolver,
            "enabled_notification_listeners"
        )
        val packageName = packageName
        return enabledListeners?.contains(packageName) == true
    }
}
