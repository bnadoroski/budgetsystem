package com.budgetsystem.app.utils;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Centraliza todo o acesso às SharedPreferences.
 * Evita duplicação de código e inconsistências nos nomes de chaves.
 */
public final class PreferencesManager {
    
    private static final String TAG = "PreferencesManager";
    
    private PreferencesManager() {
        // Classe utilitária - não instanciar
    }
    
    // ==================== SHARED PREFERENCES INSTANCES ====================
    
    /**
     * Obtém as preferências gerais do app.
     */
    public static SharedPreferences getBudgetPrefs(Context context) {
        return context.getSharedPreferences(Constants.PREFS_BUDGET, Context.MODE_PRIVATE);
    }
    
    /**
     * Obtém as preferências de despesas pendentes.
     */
    public static SharedPreferences getPendingPrefs(Context context) {
        return context.getSharedPreferences(Constants.PREFS_PENDING, Context.MODE_PRIVATE);
    }
    
    /**
     * Obtém as preferências do Capacitor (para sincronização com JS).
     */
    public static SharedPreferences getCapacitorPrefs(Context context) {
        return context.getSharedPreferences(Constants.PREFS_CAPACITOR, Context.MODE_PRIVATE);
    }
    
    // ==================== USER ID ====================
    
    /**
     * Obtém o ID do usuário autenticado.
     * Tenta primeiro nas prefs do Capacitor, depois nas prefs do Budget.
     */
    public static String getUserId(Context context) {
        // Tenta obter do Capacitor primeiro (formato JSON)
        String capacitorValue = getCapacitorPrefs(context).getString(Constants.KEY_USER_ID, null);
        if (capacitorValue != null) {
            // Remove aspas se estiver em formato JSON
            return capacitorValue.replace("\"", "");
        }
        
        // Fallback para prefs do Budget
        return getBudgetPrefs(context).getString(Constants.KEY_USER_ID, null);
    }
    
    /**
     * Salva o ID do usuário.
     */
    public static void setUserId(Context context, String userId) {
        getBudgetPrefs(context)
            .edit()
            .putString(Constants.KEY_USER_ID, userId)
            .apply();
    }
    
    /**
     * Remove o ID do usuário (logout).
     */
    public static void clearUserId(Context context) {
        getBudgetPrefs(context)
            .edit()
            .remove(Constants.KEY_USER_ID)
            .apply();
    }
    
    // ==================== FCM TOKEN ====================
    
    /**
     * Obtém o token FCM salvo.
     */
    public static String getFcmToken(Context context) {
        return getBudgetPrefs(context).getString(Constants.KEY_FCM_TOKEN, null);
    }
    
    /**
     * Salva o token FCM.
     */
    public static void setFcmToken(Context context, String token) {
        getBudgetPrefs(context)
            .edit()
            .putString(Constants.KEY_FCM_TOKEN, token)
            .apply();
    }
    
    // ==================== PENDING EXPENSES ====================
    
    /**
     * Obtém a lista de despesas pendentes como JSONArray.
     */
    public static JSONArray getPendingExpenses(Context context) {
        String json = getPendingPrefs(context).getString(Constants.KEY_PENDING_EXPENSES, "[]");
        try {
            return new JSONArray(json);
        } catch (JSONException e) {
            Log.e(TAG, "Erro ao parsear despesas pendentes: " + e.getMessage());
            return new JSONArray();
        }
    }
    
    /**
     * Adiciona uma nova despesa pendente.
     */
    public static void addPendingExpense(Context context, JSONObject expense) {
        JSONArray expenses = getPendingExpenses(context);
        expenses.put(expense);
        savePendingExpenses(context, expenses);
        
        Log.d(TAG, "💾 Despesa pendente salva. Total: " + expenses.length());
    }
    
    /**
     * Salva a lista completa de despesas pendentes.
     */
    public static void savePendingExpenses(Context context, JSONArray expenses) {
        getPendingPrefs(context)
            .edit()
            .putString(Constants.KEY_PENDING_EXPENSES, expenses.toString())
            .apply();
    }
    
    /**
     * Limpa todas as despesas pendentes.
     */
    public static void clearPendingExpenses(Context context) {
        getPendingPrefs(context)
            .edit()
            .remove(Constants.KEY_PENDING_EXPENSES)
            .apply();
        
        Log.d(TAG, "🗑️ Despesas pendentes limpas");
    }
    
    /**
     * Retorna a quantidade de despesas pendentes.
     */
    public static int getPendingExpensesCount(Context context) {
        return getPendingExpenses(context).length();
    }
    
    // ==================== EXPENSE TIMESTAMP (DUPLICATE DETECTION) ====================
    
    /**
     * Obtém o timestamp da última despesa processada.
     * Usado para evitar duplicatas.
     */
    public static long getLastExpenseTimestamp(Context context) {
        return getBudgetPrefs(context).getLong(Constants.KEY_LAST_EXPENSE_TIMESTAMP, 0);
    }
    
    /**
     * Salva o timestamp da última despesa processada.
     */
    public static void setLastExpenseTimestamp(Context context, long timestamp) {
        getBudgetPrefs(context)
            .edit()
            .putLong(Constants.KEY_LAST_EXPENSE_TIMESTAMP, timestamp)
            .apply();
    }
    
    /**
     * Verifica se uma despesa pode ser uma duplicata baseado no timestamp.
     */
    public static boolean isPotentialDuplicate(Context context, long expenseTimestamp) {
        long lastTimestamp = getLastExpenseTimestamp(context);
        return Math.abs(expenseTimestamp - lastTimestamp) < Constants.DUPLICATE_CHECK_WINDOW_MS;
    }
    
    // ==================== GENERIC HELPERS ====================
    
    /**
     * Obtém um valor string de qualquer preferência.
     */
    public static String getString(Context context, String prefsName, String key, String defaultValue) {
        return context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
            .getString(key, defaultValue);
    }
    
    /**
     * Salva um valor string em qualquer preferência.
     */
    public static void setString(Context context, String prefsName, String key, String value) {
        context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
            .edit()
            .putString(key, value)
            .apply();
    }
    
    /**
     * Remove uma chave de qualquer preferência.
     */
    public static void remove(Context context, String prefsName, String key) {
        context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
            .edit()
            .remove(key)
            .apply();
    }
    
    /**
     * Limpa todas as preferências de um arquivo.
     */
    public static void clearAll(Context context, String prefsName) {
        context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
            .edit()
            .clear()
            .apply();
    }
}
