package com.budgetsystem

import java.util.regex.Pattern

class BankNotificationParser {
    
    // Mapa de pacotes para nomes de bancos
    private val bankNames = mapOf(
        "com.nu.production" to "Nubank",
        "br.com.bb.android" to "Banco do Brasil",
        "br.com.bradesco" to "Bradesco",
        "com.itau" to "Itaú",
        "br.gov.caixa.tem" to "Caixa",
        "com.santander.app" to "Santander",
        "br.com.intermedium" to "Inter",
        "br.com.c6bank.app" to "C6 Bank",
        "com.picpay" to "PicPay",
        "br.com.original.bank" to "Banco Original",
        "br.com.neon" to "Neon",
        "br.com.will.app" to "Will Bank"
    )
    
    // Mapa de palavras-chave para categorias de budget
    private val categoryKeywords = mapOf(
        // Alimentação
        "Alimentação" to listOf(
            "mercado", "supermercado", "padaria", "açougue", "hortifruti",
            "restaurante", "lanchonete", "fast food", "delivery", "ifood",
            "rappi", "uber eats", "mcdonalds", "burguer", "pizza",
            "café", "cafeteria", "bar", "padoca", "empório"
        ),
        // Transporte
        "Transporte" to listOf(
            "uber", "99", "taxi", "combustível", "gasolina", "etanol",
            "posto", "shell", "ipiranga", "ale", "estacionamento",
            "pedágio", "ônibus", "metrô", "bilhete único"
        ),
        // Lazer
        "Lazer" to listOf(
            "netflix", "spotify", "prime video", "disney", "hbo",
            "cinema", "teatro", "show", "ingresso", "streaming",
            "youtube premium", "deezer", "amazon music", "globoplay",
            "apple music", "games", "steam", "playstation", "xbox"
        ),
        // Saúde
        "Saúde" to listOf(
            "farmácia", "drogaria", "remédio", "medicamento", "hospital",
            "clínica", "médico", "dentista", "laboratório", "exame",
            "plano de saúde", "unimed", "amil", "sulamerica"
        ),
        // Contas Fixas
        "Contas Fixas" to listOf(
            "energia", "luz", "água", "internet", "telefone", "celular",
            "aluguel", "condomínio", "iptu", "seguro", "gás",
            "vivo", "claro", "tim", "oi", "net", "sky"
        ),
        // Vestuário
        "Vestuário" to listOf(
            "renner", "c&a", "zara", "riachuelo", "marisa", "shein",
            "nike", "adidas", "roupa", "calçado", "sapato", "tênis"
        ),
        // Educação
        "Educação" to listOf(
            "curso", "faculdade", "escola", "colégio", "livro", "livraria",
            "apostila", "material escolar", "udemy", "coursera"
        ),
        // Casa
        "Casa" to listOf(
            "móveis", "decoração", "leroy", "tok&stok", "casas bahia",
            "magazine luiza", "amazon", "mercado livre", "reforma"
        )
    )
    
    // Padrões regex para detectar valores monetários
    private val moneyPatterns = listOf(
        // R$ 1.234,56 ou R$ 1234,56
        Pattern.compile("R\\$\\s*([0-9]{1,3}(?:\\.[0-9]{3})*(?:,[0-9]{2})?)"),
        // 1.234,56 (sem R$)
        Pattern.compile("(?:^|\\s)([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2})(?:\\s|$)"),
        // Valores sem pontuação: 1234,56
        Pattern.compile("(?:^|\\s)([0-9]+,[0-9]{2})(?:\\s|$)"),
        // Valores com espaço: R$ 1 234,56
        Pattern.compile("R\\$\\s*([0-9]{1,3}(?:\\s[0-9]{3})*(?:,[0-9]{2})?)"),
        // Formato alternativo: 1234.56 (com ponto decimal)
        Pattern.compile("(?:^|\\s)([0-9]+\\.[0-9]{2})(?:\\s|$)")
    )
    
    // Palavras-chave que indicam despesa
    private val expenseKeywords = listOf(
        "compra", "pagamento", "débito", "gasto", "pago",
        "aprovada", "realizada", "efetuada", "transferência",
        "pix", "ted", "doc", "boleto", "fatura",
        "enviada", "enviado", "transferido", "transferida",
        "recebida", "recebido", "saque", "retirada",
        "transação", "débito automático", "cobrança"
    )
    
    fun parseNotification(packageName: String, text: String): ExpenseData? {
        val lowerText = text.lowercase()
        
        // Verifica se contém palavras-chave de despesa
        val hasExpenseKeyword = expenseKeywords.any { lowerText.contains(it) }
        if (!hasExpenseKeyword) {
            return null
        }
        
        // Extrai o valor monetário
        val amount = extractAmount(text) ?: return null
        
        // Obtém o nome do banco
        val bankName = bankNames[packageName] ?: "Banco Desconhecido"
        
        // Extrai descrição
        val description = extractDescription(text)
        
        // Identifica a categoria baseada em palavras-chave
        val category = detectCategory(lowerText)
        
        return ExpenseData(
            amount = amount,
            bank = bankName,
            description = description,
            category = category
        )
    }
    
    private fun detectCategory(text: String): String {
        // Procura por palavras-chave em cada categoria
        for ((category, keywords) in categoryKeywords) {
            for (keyword in keywords) {
                if (text.contains(keyword.lowercase())) {
                    return category
                }
            }
        }
        
        // Se não encontrar nenhuma categoria, retorna "Outros"
        return "Outros"
    }
    
    private fun extractAmount(text: String): Double? {
        for (pattern in moneyPatterns) {
            val matcher = pattern.matcher(text)
            if (matcher.find()) {
                val amountStr = matcher.group(1)
                return parseAmount(amountStr)
            }
        }
        return null
    }
    
    private fun parseAmount(amountStr: String): Double? {
        return try {
            // Remove R$ e espaços
            val cleaned = amountStr.replace("R$", "").trim()
            // Remove pontos (milhares) e substitui vírgula por ponto (decimal)
            val normalized = cleaned.replace(".", "").replace(",", ".")
            normalized.toDoubleOrNull()
        } catch (e: Exception) {
            null
        }
    }
    
    private fun extractDescription(text: String): String {
        val lowerText = text.lowercase()
        
        // Tenta encontrar a palavra-chave principal
        for (keyword in expenseKeywords) {
            if (lowerText.contains(keyword)) {
                return keyword.capitalize()
            }
        }
        
        // Se não encontrar, retorna as primeiras palavras
        val words = text.split(" ").take(3)
        return words.joinToString(" ")
    }
    
    private fun String.capitalize(): String {
        return this.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
    }
}
