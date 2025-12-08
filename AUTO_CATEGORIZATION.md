# 🤖 Sistema de Categorização Automática de Gastos

## ✅ Implementação Concluída!

O sistema agora detecta automaticamente a categoria do gasto baseado em **palavras-chave inteligentes** presentes nas notificações bancárias.

## 📋 Como Funciona

### 1. Detecção da Notificação
Quando você recebe uma notificação de banco (Nubank, Itaú, Bradesco, etc.), o app:
1. Captura o texto da notificação
2. Verifica se é uma despesa (palavras como "compra", "pagamento", "débito")
3. Extrai o valor em reais (R$ 123,45)

### 2. Categorização Inteligente
O sistema analisa o texto da notificação procurando por palavras-chave:

#### 🍔 **Alimentação**
- mercado, supermercado, padaria, restaurante
- ifood, rappi, uber eats
- mcdonalds, pizza, café, bar

#### 🚗 **Transporte**
- uber, 99, taxi
- combustível, gasolina, posto
- estacionamento, pedágio

#### 🎬 **Lazer**
- netflix, spotify, prime video, disney
- cinema, teatro, show
- games, steam, playstation

#### 💊 **Saúde**
- farmácia, drogaria, remédio
- hospital, clínica, médico, dentista
- plano de saúde, unimed

#### 💡 **Contas Fixas**
- energia, luz, água
- internet, telefone, celular
- aluguel, condomínio, iptu

#### 👕 **Vestuário**
- renner, c&a, zara, riachuelo
- nike, adidas, roupa, sapato

#### 📚 **Educação**
- curso, faculdade, escola
- livro, livraria, udemy

#### 🏠 **Casa**
- móveis, decoração, leroy
- casas bahia, magazine luiza

#### ❓ **Outros**
- Qualquer gasto que não se encaixe nas categorias acima

### 3. Adicionar ao Budget Correto

O sistema vai:
1. **Procurar um budget com o nome da categoria**
   - Ex: Se detectou "Alimentação", procura budget com nome "Alimentação"
   
2. **Se o budget não existir:**
   - Cria automaticamente um budget com o nome da categoria
   - Define um valor padrão (ex: R$ 1000,00)
   - Usa uma cor temática para a categoria

3. **Adiciona o gasto:**
   - Soma o valor no `spentValue` do budget
   - Atualiza em tempo real no Firebase
   - Sincroniza com todos os dispositivos compartilhados

## 🎯 Exemplo Prático

**Notificação recebida:**
```
Nubank
Compra aprovada de R$ 45,80
Uber 🚗
```

**O que acontece:**
1. ✅ Detecta que é uma despesa ("Compra aprovada")
2. ✅ Extrai valor: R$ 45,80
3. ✅ Analisa texto: encontra palavra "uber"
4. ✅ Categoria identificada: **Transporte**
5. ✅ Procura budget "Transporte"
6. ✅ Adiciona R$ 45,80 no budget de Transporte
7. ✅ Você vê na tela o budget atualizado! 🎉

## 🛠️ Configuração Necessária

### Passo 1: Copiar arquivos Kotlin atualizados
Os arquivos já foram copiados para:
- `android/app/src/main/java/com/budgetsystem/app/BankNotificationParser.kt`
- `android/app/src/main/java/com/budgetsystem/app/NotificationListener.kt`

### Passo 2: Criar budgets iniciais (Recomendado)
No app, crie budgets com os nomes das categorias:
- Alimentação
- Transporte
- Lazer
- Saúde
- Contas Fixas
- Vestuário
- Educação
- Casa
- Outros

Dessa forma, os gastos já vão direto para os budgets certos!

### Passo 3: Habilitar permissão de notificações
1. Instale o APK
2. Vá em **Configurações do Android** → **Apps** → **Budget System**
3. **Permissões** → **Acesso a notificações** → Habilite

## 📱 Como Testar

1. Abra o app
2. Faça uma compra real ou simule uma notificação de banco
3. Observe o budget correspondente sendo atualizado automaticamente!

### Simulando Notificação (Para testes)
Use o app "Notification Maker" ou similar para criar uma notificação fake:
- Título: "Nubank"
- Texto: "Compra aprovada de R$ 50,00 no Mercado Extra"
- O sistema vai detectar e adicionar no budget "Alimentação"

## 🎨 Personalização

Quer adicionar mais palavras-chave? Edite o arquivo:
`android/app/src/main/java/com/budgetsystem/app/BankNotificationParser.kt`

No mapa `categoryKeywords`, adicione suas palavras:

```kotlin
"Alimentação" to listOf(
    "mercado", "supermercado", "padaria",
    "seu_mercado_favorito_aqui" // Adicione aqui!
),
```

## ⚠️ Importante

- O sistema só funciona com notificações de **bancos brasileiros**
- A notificação precisa conter palavras como "compra", "pagamento", "débito"
- O valor precisa estar no formato brasileiro: R$ 123,45
- Se não encontrar categoria, vai para "Outros"
- Você pode sempre editar manualmente o budget depois

## 🚀 Próximos Passos

1. Gerar APK no Android Studio
2. Instalar no celular
3. Habilitar acesso a notificações
4. Fazer uma compra e ver a mágica acontecer! ✨

**Dica:** Crie os budgets das categorias com valores realistas para ter um controle melhor dos seus gastos!
