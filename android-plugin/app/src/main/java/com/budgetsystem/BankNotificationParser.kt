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
    
    // Padrões regex para detectar valores monetários
    private val moneyPatterns = listOf(
        // R$ 1.234,56 ou R$ 1234,56
        Pattern.compile("R\\$\\s*([0-9]{1,3}(?:\\.[0-9]{3})*(?:,[0-9]{2})?)"),
        // 1.234,56 (sem R$)
        Pattern.compile("(?:^|\\s)([0-9]{1,3}(?:\\.[0-9]{3})*,[0-9]{2})(?:\\s|$)"),
        // Valores sem pontuação: 1234,56
        Pattern.compile("(?:^|\\s)([0-9]+,[0-9]{2})(?:\\s|$)")
    )
    
    // Palavras-chave que indicam despesa
    private val expenseKeywords = listOf(
        "compra", "pagamento", "débito", "gasto", "pago",
        "aprovada", "realizada", "efetuada", "transferência",
        "pix", "ted", "doc", "boleto", "fatura"
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
        
        // Extrai descrição (primeiras palavras ou palavra-chave principal)
        val description = extractDescription(text)
        
        return ExpenseData(
            amount = amount,
            bank = bankName,
            description = description
        )
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
