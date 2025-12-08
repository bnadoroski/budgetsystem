package com.budgetsystem

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

class NotificationListener : NotificationListenerService() {
    
    private val TAG = "BudgetNotificationListener"
    private val parser = BankNotificationParser()
    
    // Lista de pacotes de apps bancários
    private val bankPackages = setOf(
        "com.nu.production",              // Nubank
        "br.com.bb.android",               // Banco do Brasil
        "br.com.bradesco",                 // Bradesco
        "com.itau",                        // Itaú
        "br.gov.caixa.tem",                // Caixa
        "com.santander.app",               // Santander
        "br.com.intermedium",              // Inter
        "br.com.c6bank.app",               // C6 Bank
        "com.picpay",                      // PicPay
        "br.com.original.bank",            // Banco Original
        "br.com.neon",                     // Neon
        "br.com.will.app"                  // Will Bank
    )
    
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        
        sbn?.let { notification ->
            val packageName = notification.packageName
            
            // Verifica se é de um banco
            if (bankPackages.contains(packageName)) {
                val extras = notification.notification.extras
                val title = extras.getString("android.title") ?: ""
                val text = extras.getCharSequence("android.text")?.toString() ?: ""
                
                Log.d(TAG, "Bank notification from $packageName: $title - $text")
                
                // Parse the notification
                val result = parser.parseNotification(packageName, "$title $text")
                
                if (result != null) {
                    Log.d(TAG, "Expense detected: ${result.amount} from ${result.bank}")
                    sendExpenseToServer(result)
                }
            }
        }
    }
    
    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }
    
    private fun sendExpenseToServer(expense: ExpenseData) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                // Endpoint do servidor Vue 3 (ajustar conforme necessário)
                val url = URL("http://10.0.2.2:3000/api/expenses")
                val connection = url.openConnection() as HttpURLConnection
                
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                
                val jsonBody = JSONObject().apply {
                    put("type", "expense")
                    put("amount", expense.amount)
                    put("bank", expense.bank)
                    put("description", expense.description)
                    put("timestamp", System.currentTimeMillis())
                }
                
                connection.outputStream.use { os ->
                    os.write(jsonBody.toString().toByteArray())
                }
                
                val responseCode = connection.responseCode
                Log.d(TAG, "Server response: $responseCode")
                
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    Log.d(TAG, "Expense sent successfully")
                } else {
                    Log.e(TAG, "Failed to send expense: $responseCode")
                }
                
                connection.disconnect()
                
            } catch (e: Exception) {
                Log.e(TAG, "Error sending expense to server", e)
            }
        }
    }
}

data class ExpenseData(
    val amount: Double,
    val bank: String,
    val description: String
)
