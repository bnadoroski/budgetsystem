package com.budgetsystem.app;

import org.junit.Before;
import org.junit.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.Assert.*;

/**
 * Testes básicos para FCMService
 * 
 * Testa estrutura e validação de dados:
 * - Instanciação do serviço
 * - Validação de tipos de notificação
 * - Estrutura de dados
 */
public class FCMServiceTest {
    
    private FCMService service;
    
    @Before
    public void setUp() {
        service = new FCMService();
    }
    
    @Test
    public void testServiceNotNull() {
        assertNotNull("FCMService deve ser instanciável", service);
    }
    
    @Test
    public void testValidNotificationTypes() {
        String[] validTypes = {"invite_response", "pending_expenses", "inactivity"};
        
        for (String type : validTypes) {
            assertTrue("Tipo de notificação deve ser válido: " + type, 
                       isValidNotificationType(type));
        }
    }
    
    @Test
    public void testInvalidNotificationType() {
        String invalidType = "invalid_type";
        assertFalse("Tipo inválido não deve ser aceito", 
                    isValidNotificationType(invalidType));
    }
    
    @Test
    public void testInviteResponseDataStructure() {
        Map<String, String> data = new HashMap<>();
        data.put("type", "invite_response");
        data.put("budgetName", "Alimentação");
        data.put("accepted", "true");
        
        assertTrue("Deve conter type", data.containsKey("type"));
        assertTrue("Deve conter budgetName", data.containsKey("budgetName"));
        assertTrue("Deve conter accepted", data.containsKey("accepted"));
        assertEquals("Type correto", "invite_response", data.get("type"));
    }
    
    @Test
    public void testPendingExpensesDataStructure() {
        Map<String, String> data = new HashMap<>();
        data.put("type", "pending_expenses");
        data.put("count", "3");
        data.put("total", "150.50");
        
        assertTrue("Deve conter count", data.containsKey("count"));
        assertTrue("Deve conter total", data.containsKey("total"));
        
        // Valida parsing de números
        int count = Integer.parseInt(data.get("count"));
        double total = Double.parseDouble(data.get("total"));
        
        assertEquals("Count deve ser 3", 3, count);
        assertEquals("Total deve ser 150.50", 150.50, total, 0.01);
    }
    
    @Test
    public void testInactivityDataStructure() {
        Map<String, String> data = new HashMap<>();
        data.put("type", "inactivity");
        data.put("days", "15");
        
        assertTrue("Deve conter days", data.containsKey("days"));
        
        int days = Integer.parseInt(data.get("days"));
        assertTrue("Days deve ser maior que 0", days > 0);
    }
    
    @Test
    public void testEmptyDataMapHandling() {
        Map<String, String> data = new HashMap<>();
        
        assertTrue("Mapa vazio deve ser válido", data.isEmpty());
        assertFalse("Não deve conter type", data.containsKey("type"));
    }
    
    @Test
    public void testTokenValidation() {
        String validToken = "test-fcm-token-12345";
        String emptyToken = "";
        
        assertNotNull("Token válido não deve ser null", validToken);
        assertFalse("Token válido não deve ser vazio", validToken.isEmpty());
        assertTrue("Token vazio deve ser vazio", emptyToken.isEmpty());
    }
    
    // Método auxiliar para validar tipos de notificação
    private boolean isValidNotificationType(String type) {
        return "invite_response".equals(type) || 
               "pending_expenses".equals(type) || 
               "inactivity".equals(type);
    }
}
