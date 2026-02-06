package com.budgetsystem.app.utils;

/**
 * Centraliza todas as constantes utilizadas no aplicativo.
 * Evita duplicação e facilita manutenção.
 */
public final class Constants {
    
    private Constants() {
        // Classe utilitária - não instanciar
    }

    // ==================== NOTIFICATION CHANNELS ====================
    
    /**
     * Canal para o serviço foreground (baixa prioridade, silencioso)
     */
    public static final String CHANNEL_FOREGROUND = "budget_foreground_channel";
    public static final String CHANNEL_FOREGROUND_NAME = "Serviço em Segundo Plano";
    public static final String CHANNEL_FOREGROUND_DESC = "Mantém o monitoramento de notificações ativo";
    
    /**
     * Canal para alertas de despesas (alta prioridade, com som)
     */
    public static final String CHANNEL_NOTIFICATIONS = "budget_notifications";
    public static final String CHANNEL_NOTIFICATIONS_NAME = "Alertas de Despesas";
    public static final String CHANNEL_NOTIFICATIONS_DESC = "Notificações de novas despesas detectadas";
    
    /**
     * Canal para o listener de notificações (baixa prioridade)
     */
    public static final String CHANNEL_LISTENER = "budget_listener_channel";
    public static final String CHANNEL_LISTENER_NAME = "Budget System Listener";
    public static final String CHANNEL_LISTENER_DESC = "Monitora notificações bancárias";
    
    // ==================== NOTIFICATION IDS ====================
    
    public static final int NOTIFICATION_ID_FOREGROUND = 1001;
    public static final int NOTIFICATION_ID_NEW_EXPENSE = 2001;
    
    // ==================== SHARED PREFERENCES ====================
    
    /**
     * Preferências gerais do app
     */
    public static final String PREFS_BUDGET = "budget_system_prefs";
    
    /**
     * Preferências para despesas pendentes
     */
    public static final String PREFS_PENDING = "budget_pending_expenses";
    
    /**
     * Preferências do Capacitor (para sincronização com JS)
     */
    public static final String PREFS_CAPACITOR = "CapacitorStorage";
    
    // ==================== SHARED PREFERENCES KEYS ====================
    
    public static final String KEY_USER_ID = "userId";
    public static final String KEY_FCM_TOKEN = "fcmToken";
    public static final String KEY_PENDING_EXPENSES = "pendingExpenses";
    public static final String KEY_LAST_EXPENSE_TIMESTAMP = "lastExpenseTimestamp";
    
    // ==================== FIREBASE CLOUD FUNCTIONS ====================
    
    public static final String FIREBASE_PROJECT = "budget-system-34ef8";
    public static final String FIREBASE_REGION = "us-central1";
    public static final String FIREBASE_FUNCTIONS_BASE_URL = 
        "https://" + FIREBASE_REGION + "-" + FIREBASE_PROJECT + ".cloudfunctions.net";
    
    public static final String FUNCTION_SEND_EXPENSE_NOTIFICATION = 
        FIREBASE_FUNCTIONS_BASE_URL + "/sendExpenseNotification";
    public static final String FUNCTION_SEND_INVITE_NOTIFICATION = 
        FIREBASE_FUNCTIONS_BASE_URL + "/sendInviteNotification";
    
    // ==================== LOG TAGS ====================
    
    public static final String TAG_NOTIFICATION_LISTENER = "BudgetNotifListener";
    public static final String TAG_NOTIFICATION_PLUGIN = "NotificationPlugin";
    public static final String TAG_FCM_PLUGIN = "FCMPlugin";
    public static final String TAG_FCM_SERVICE = "FCMService";
    public static final String TAG_FOREGROUND_SERVICE = "BudgetForegroundSvc";
    public static final String TAG_BADGE_PLUGIN = "BadgePlugin";
    public static final String TAG_BOOT_RECEIVER = "BootReceiver";
    
    // ==================== BROADCAST ACTIONS ====================
    
    public static final String ACTION_CHECK_NOTIFICATIONS = "com.budgetsystem.CHECK_NOTIFICATIONS";
    public static final String ACTION_NEW_EXPENSE = "com.budgetsystem.NEW_EXPENSE";
    public static final String ACTION_MOCK_NOTIFICATION = "com.budgetsystem.MOCK_NOTIFICATION";
    
    // ==================== EXPENSE CATEGORIES ====================
    
    public static final String CATEGORY_FOOD = "Alimentação";
    public static final String CATEGORY_TRANSPORT = "Transporte";
    public static final String CATEGORY_ENTERTAINMENT = "Entretenimento";
    public static final String CATEGORY_SHOPPING = "Compras";
    public static final String CATEGORY_SERVICES = "Serviços";
    public static final String CATEGORY_HEALTH = "Saúde";
    public static final String CATEGORY_OTHER = "Outros";
    
    // ==================== TIMEOUTS ====================
    
    public static final int HTTP_TIMEOUT_MS = 10000;
    public static final int DUPLICATE_CHECK_WINDOW_MS = 5000;
    
    // ==================== LIMITS ====================
    
    public static final int MAX_PROCESSED_NOTIFICATIONS = 100;
    public static final int MAX_PENDING_EXPENSES = 50;
}
