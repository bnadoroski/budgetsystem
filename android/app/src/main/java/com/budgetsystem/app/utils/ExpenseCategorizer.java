package com.budgetsystem.app.utils;

import java.util.HashMap;
import java.util.Map;
import java.util.Arrays;
import java.util.List;

/**
 * Categoriza despesas baseado em palavras-chave encontradas no texto.
 * Centraliza a lógica de categorização que estava inline no código.
 */
public final class ExpenseCategorizer {
    
    private ExpenseCategorizer() {
        // Classe utilitária - não instanciar
    }
    
    /**
     * Mapeamento de categoria para lista de palavras-chave.
     */
    private static final Map<String, List<String>> CATEGORY_KEYWORDS = new HashMap<>();
    
    static {
        // Alimentação
        CATEGORY_KEYWORDS.put(Constants.CATEGORY_FOOD, Arrays.asList(
            "alimentação", "alimentacao", "restaurante", "lanchonete",
            "ifood", "rappi", "uber eats", "ubereats", "99food",
            "mcdonald", "burger king", "subway", "pizza", "sushi",
            "padaria", "mercado", "supermercado", "açougue", "acougue",
            "café", "cafe", "cafeteria", "bar", "boteco",
            "food", "refeição", "refeicao", "almoço", "almoco",
            "jantar", "lanche", "delivery", "comida"
        ));
        
        // Transporte
        CATEGORY_KEYWORDS.put(Constants.CATEGORY_TRANSPORT, Arrays.asList(
            "transporte", "uber", "99", "cabify", "taxi", "táxi",
            "combustível", "combustivel", "gasolina", "etanol", "diesel",
            "posto", "shell", "ipiranga", "br distribuidora", "ale",
            "estacionamento", "parking", "pedágio", "pedagio",
            "ônibus", "onibus", "metrô", "metro", "trem",
            "passagem", "bilhete", "mobilidade"
        ));
        
        // Entretenimento
        CATEGORY_KEYWORDS.put(Constants.CATEGORY_ENTERTAINMENT, Arrays.asList(
            "entretenimento", "cinema", "cinemark", "uci", "kinoplex",
            "netflix", "spotify", "amazon prime", "disney", "hbo",
            "youtube", "twitch", "gaming", "game", "jogo",
            "show", "teatro", "museu", "parque", "diversão", "diversao",
            "ingresso", "evento", "festa", "balada", "bar"
        ));
        
        // Compras
        CATEGORY_KEYWORDS.put(Constants.CATEGORY_SHOPPING, Arrays.asList(
            "compras", "shopping", "loja", "magazine", "americanas",
            "amazon", "mercado livre", "shopee", "aliexpress", "shein",
            "renner", "riachuelo", "c&a", "marisa", "zara",
            "roupas", "calçados", "calcados", "acessórios", "acessorios",
            "eletrônicos", "eletronicos", "celular", "notebook"
        ));
        
        // Serviços
        CATEGORY_KEYWORDS.put(Constants.CATEGORY_SERVICES, Arrays.asList(
            "serviços", "servicos", "serviço", "servico",
            "internet", "telefone", "celular", "luz", "energia",
            "água", "agua", "gás", "gas", "condomínio", "condominio",
            "aluguel", "assinatura", "mensalidade", "fatura",
            "conta", "boleto", "taxa", "tarifa"
        ));
        
        // Saúde
        CATEGORY_KEYWORDS.put(Constants.CATEGORY_HEALTH, Arrays.asList(
            "saúde", "saude", "farmácia", "farmacia", "drogaria",
            "droga raia", "drogasil", "pague menos", "panvel",
            "médico", "medico", "consulta", "exame", "laboratório", "laboratorio",
            "hospital", "clínica", "clinica", "dentista", "odonto",
            "remédio", "remedio", "medicamento", "plano de saúde", "plano de saude"
        ));
    }
    
    /**
     * Categoriza o texto da despesa.
     * 
     * @param text Texto para categorizar (título ou descrição da notificação)
     * @return Categoria identificada ou "Outros" se não identificada
     */
    public static String categorize(String text) {
        if (text == null || text.isEmpty()) {
            return Constants.CATEGORY_OTHER;
        }
        
        String lowerText = text.toLowerCase();
        
        for (Map.Entry<String, List<String>> entry : CATEGORY_KEYWORDS.entrySet()) {
            for (String keyword : entry.getValue()) {
                if (lowerText.contains(keyword)) {
                    return entry.getKey();
                }
            }
        }
        
        return Constants.CATEGORY_OTHER;
    }
    
    /**
     * Retorna as palavras-chave de uma categoria específica.
     */
    public static List<String> getKeywordsForCategory(String category) {
        return CATEGORY_KEYWORDS.getOrDefault(category, Arrays.asList());
    }
    
    /**
     * Verifica se o texto corresponde a uma categoria específica.
     */
    public static boolean matchesCategory(String text, String category) {
        if (text == null || category == null) return false;
        
        List<String> keywords = getKeywordsForCategory(category);
        String lowerText = text.toLowerCase();
        
        for (String keyword : keywords) {
            if (lowerText.contains(keyword)) {
                return true;
            }
        }
        return false;
    }
}
