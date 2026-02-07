package com.budgetsystem.app.utils;

import java.util.HashMap;
import java.util.Map;

/**
 * Identifica bancos através do nome do pacote da notificação.
 * Centraliza a lógica de identificação de bancos que estava duplicada.
 */
public final class BankIdentifier {
    
    private BankIdentifier() {
        // Classe utilitária - não instanciar
    }
    
    /**
     * Mapeamento de identificadores de pacote para nomes de banco.
     */
    private static final Map<String, String> BANK_PACKAGES = new HashMap<>();
    
    static {
        // Bancos digitais
        BANK_PACKAGES.put("nubank", "Nubank");
        BANK_PACKAGES.put("picpay", "PicPay");
        BANK_PACKAGES.put("inter", "Inter");
        BANK_PACKAGES.put("c6bank", "C6 Bank");
        BANK_PACKAGES.put("next", "Next");
        BANK_PACKAGES.put("neon", "Neon");
        BANK_PACKAGES.put("original", "Banco Original");
        BANK_PACKAGES.put("modal", "Modal");
        BANK_PACKAGES.put("will", "Will Bank");
        BANK_PACKAGES.put("99pay", "99Pay");
        BANK_PACKAGES.put("mercadopago", "Mercado Pago");
        BANK_PACKAGES.put("pagseguro", "PagSeguro");
        BANK_PACKAGES.put("iti", "Iti");
        
        // Bancos tradicionais
        BANK_PACKAGES.put("itau", "Itaú");
        BANK_PACKAGES.put("bradesco", "Bradesco");
        BANK_PACKAGES.put("santander", "Santander");
        BANK_PACKAGES.put("caixa", "Caixa");
        BANK_PACKAGES.put("bb", "Banco do Brasil");
        BANK_PACKAGES.put("bancodobrasil", "Banco do Brasil");
        BANK_PACKAGES.put("sicoob", "Sicoob");
        BANK_PACKAGES.put("sicredi", "Sicredi");
        BANK_PACKAGES.put("safra", "Safra");
        BANK_PACKAGES.put("btg", "BTG Pactual");
        
        // Carteiras digitais
        BANK_PACKAGES.put("ame", "Ame Digital");
        BANK_PACKAGES.put("paypal", "PayPal");
        BANK_PACKAGES.put("recargapay", "RecargaPay");
        BANK_PACKAGES.put("samsung.android.spay", "Samsung Pay");
        BANK_PACKAGES.put("gpay", "Google Pay");
        BANK_PACKAGES.put("google.android.apps.nbu", "Google Pay");
        
        // Mensageiros com pagamento
        BANK_PACKAGES.put("whatsapp", "WhatsApp");
    }
    
    /**
     * Identifica o banco pelo nome do pacote.
     * 
     * @param packageName Nome completo do pacote (ex: "com.nu.production")
     * @return Nome do banco ou null se não identificado
     */
    public static String identifyBank(String packageName) {
        if (packageName == null || packageName.isEmpty()) {
            return null;
        }
        
        String lowerPackage = packageName.toLowerCase();
        
        for (Map.Entry<String, String> entry : BANK_PACKAGES.entrySet()) {
            if (lowerPackage.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        
        return null;
    }
    
    /**
     * Verifica se o pacote é de um banco conhecido.
     */
    public static boolean isBankPackage(String packageName) {
        return identifyBank(packageName) != null;
    }
    
    /**
     * Lista de pacotes conhecidos de bancos (para filtragem rápida).
     */
    public static final String[] KNOWN_BANK_PACKAGE_FRAGMENTS = {
        "nubank", "itau", "bradesco", "santander", "inter", "c6bank",
        "picpay", "caixa", "bb", "bancodobrasil", "next", "neon",
        "original", "modal", "will", "mercadopago", "pagseguro",
        "sicoob", "sicredi", "safra", "btg", "ame", "paypal",
        "99pay", "iti", "recargapay", "spay", "gpay", "whatsapp"
    };
    
    /**
     * Verifica rapidamente se o pacote pode ser de um banco.
     * Mais rápido que identifyBank() para filtragem inicial.
     */
    public static boolean mightBeBankPackage(String packageName) {
        if (packageName == null) return false;
        
        String lower = packageName.toLowerCase();
        for (String fragment : KNOWN_BANK_PACKAGE_FRAGMENTS) {
            if (lower.contains(fragment)) {
                return true;
            }
        }
        return false;
    }
}
