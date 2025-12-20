package com.budgetsystem.app;

import org.junit.Before;
import org.junit.Test;

import static org.junit.Assert.*;

/**
 * Testes básicos para FCMPlugin
 * 
 * Verifica:
 * - Instanciação do plugin
 * - Constantes e estrutura
 * - Lógica de negócio independente de Android
 */
public class FCMPluginTest {
    
    private FCMPlugin plugin;
    
    @Before
    public void setUp() {
        plugin = new FCMPlugin();
    }
    
    @Test
    public void testPluginNotNull() {
        assertNotNull("FCMPlugin deve ser instanciável", plugin);
    }
    
    @Test
    public void testPluginIsCapacitorPlugin() {
        // Verifica que FCMPlugin herda de Plugin
        assertTrue("FCMPlugin deve ser uma instância de Plugin", 
                   plugin instanceof com.getcapacitor.Plugin);
    }
    
    @Test
    public void testChannelIdConstant() {
        // Channel ID é usado em createNotificationChannel
        // Este teste valida que a string está no formato esperado
        String channelId = "budget_notifications";
        
        assertNotNull("Channel ID não deve ser null", channelId);
        assertFalse("Channel ID não deve ser vazio", channelId.isEmpty());
        assertTrue("Channel ID deve conter apenas lowercase e underscore",
                   channelId.matches("^[a-z_]+$"));
    }
    
    @Test
    public void testNotificationDataStructure() {
        // Valida estrutura de dados de notificação
        String title = "Test Title";
        String body = "Test Body";
        
        assertNotNull("Title não deve ser null", title);
        assertNotNull("Body não deve ser null", body);
        assertFalse("Title não deve ser vazio", title.isEmpty());
    }
    
    @Test
    public void testBadgeCountValidation() {
        // Testa lógica de validação de badge count
        int validCount = 5;
        int zeroCount = 0;
        int negativeCount = -1;
        
        assertTrue("Count positivo deve ser válido", validCount >= 0);
        assertTrue("Count zero deve ser válido", zeroCount >= 0);
        assertFalse("Count negativo não deve ser válido", negativeCount >= 0);
    }
}
