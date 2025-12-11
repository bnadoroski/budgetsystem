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
                    Log.d(TAG, "Expense detected: ${result.amount} from ${result.bank} - Category: ${result.category}")
                    sendExpenseToServer(result)
                }
            }
        }
    }
    
    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }
    
    private fun getServerUrl(): String {
        // Para dispositivo físico, usa o IP da rede local
        // Para emulador, usa 10.0.2.2 (localhost do host)
        // Tente primeiro com o IP configurado, senão usa o padrão do emulador
        return try {
            // Você pode configurar o IP do servidor via SharedPreferences ou BuildConfig
            // Por padrão, tenta o emulador
            val serverHost = "10.0.2.2" // Altere para o IP do seu computador na rede local se estiver usando dispositivo físico
            val serverPort = "5173" // Porta do Vite dev server
            "http://$serverHost:$serverPort/api/expenses"
        } catch (e: Exception) {
            Log.e(TAG, "Error getting server URL", e)
            "http://10.0.2.2:5173/api/expenses"
        }
    }
    
    private fun sendExpenseToServer(expense: ExpenseData) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val serverUrl = getServerUrl()
                Log.d(TAG, "Sending expense to: $serverUrl")
                
                val url = URL(serverUrl)
                val connection = url.openConnection() as HttpURLConnection
                
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                
                val jsonBody = JSONObject().apply {
                    put("type", "expense")
                    put("amount", expense.amount)
                    put("bank", expense.bank)
                    put("description", expense.description)
                    put("category", expense.category)
                    put("timestamp", System.currentTimeMillis())
                }
                
                Log.d(TAG, "Sending JSON: ${jsonBody.toString()}")
                
                connection.outputStream.use { os ->
                    os.write(jsonBody.toString().toByteArray())
                }
                
                val responseCode = connection.responseCode
                Log.d(TAG, "Server response code: $responseCode")
                
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    Log.d(TAG, "Expense sent successfully. Response: $response")
                } else {
                    val errorStream = connection.errorStream?.bufferedReader()?.use { it.readText() }
                    Log.e(TAG, "Failed to send expense: $responseCode - $errorStream")
                }
                
                connection.disconnect()
                
            } catch (e: Exception) {
                Log.e(TAG, "Error sending expense to server: ${e.message}", e)
            }
        }
    }
}

data class ExpenseData(
    val amount: Double,
    val bank: String,
    val description: String,
    val category: String
)
