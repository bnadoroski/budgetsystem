# Configuração do Stripe - Budget System

Este guia explica como configurar o Stripe para pagamentos no Budget System.

## 1. Criar conta no Stripe

1. Acesse [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register)
2. Crie sua conta e verifique seu email
3. Complete o cadastro da empresa (necessário para receber pagamentos)

## 2. Obter as chaves de API

### No Dashboard do Stripe:

1. Vá em **Developers > API Keys**
2. Copie as seguintes chaves:
   - **Publishable key** (começa com `pk_live_` ou `pk_test_`)
   - **Secret key** (começa com `sk_live_` ou `sk_test_`)

> ⚠️ **IMPORTANTE**: Use chaves de **test** durante o desenvolvimento!

## 3. Criar os Produtos e Preços

### No Dashboard do Stripe:

1. Vá em **Products > Add Product**

2. **Criar Plano Mensal:**
   - Name: `Budget System Premium - Mensal`
   - Description: `Acesso completo ao Budget System Premium por 1 mês`
   - Pricing model: `Standard pricing`
   - Price: `R$ 19,90` / `month` (recurring)
   - Clique em **Save product**
   - Copie o **Price ID** (começa com `price_`)

3. **Criar Plano Anual:**
   - Name: `Budget System Premium - Anual`
   - Description: `Acesso completo ao Budget System Premium por 1 ano`
   - Pricing model: `Standard pricing`
   - Price: `R$ 159,00` / `year` (recurring)
   - Clique em **Save product**
   - Copie o **Price ID** (começa com `price_`)

## 4. Configurar o Webhook

### No Dashboard do Stripe:

1. Vá em **Developers > Webhooks**
2. Clique em **Add endpoint**
3. Configure:
   - Endpoint URL: `https://us-central1-SEU_PROJETO.cloudfunctions.net/stripeWebhook`
   - Selecione os eventos:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
4. Clique em **Add endpoint**
5. Copie o **Signing secret** (começa com `whsec_`)

## 5. Configurar Portal do Cliente

### No Dashboard do Stripe:

1. Vá em **Settings > Billing > Customer portal**
2. Ative o portal
3. Configure:
   - ✅ Allow customers to view their billing history
   - ✅ Allow customers to update their payment methods
   - ✅ Allow customers to cancel subscriptions
   - ✅ Allow customers to switch plans
4. Salve as configurações

## 6. Configurar Variáveis de Ambiente

### Frontend (.env.local):

```env
VITE_FUNCTIONS_URL=https://us-central1-SEU_PROJETO.cloudfunctions.net
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_MONTHLY=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_YEARLY=price_xxxxxxxxxxxxx
```

### Firebase Functions:

Configure as variáveis secretas no Firebase:

```bash
# No diretório do projeto
cd functions

# Configurar secrets (recomendado para produção)
firebase functions:secrets:set STRIPE_SECRET_KEY
# Cole a secret key quando solicitado

firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# Cole o webhook signing secret quando solicitado

firebase functions:secrets:set STRIPE_PRICE_MONTHLY
# Cole o price ID do plano mensal

firebase functions:secrets:set STRIPE_PRICE_YEARLY
# Cole o price ID do plano anual
```

Alternativamente, você pode usar variáveis de ambiente no arquivo `.runtimeconfig.json` para desenvolvimento local:

```json
{
  "stripe": {
    "secret_key": "sk_test_xxxxx",
    "webhook_secret": "whsec_xxxxx",
    "price_monthly": "price_xxxxx",
    "price_yearly": "price_xxxxx"
  }
}
```

## 7. Deploy das Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

## 8. Testar o Fluxo

### Modo de Teste:

1. Use as chaves de teste (`pk_test_`, `sk_test_`)
2. Use cartões de teste:
   - **Sucesso**: `4242 4242 4242 4242`
   - **Falha**: `4000 0000 0000 0002`
   - **Requer autenticação**: `4000 0025 0000 3155`

### Verificar Webhook:

Use o Stripe CLI para testar localmente:

```bash
# Instalar Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Encaminhar webhooks para função local
stripe listen --forward-to http://localhost:5001/SEU_PROJETO/us-central1/stripeWebhook
```

## 9. Ir para Produção

1. Complete a verificação da conta no Stripe
2. Mude para chaves de produção (`pk_live_`, `sk_live_`)
3. Atualize o webhook para a URL de produção
4. Atualize as variáveis de ambiente com as chaves de produção
5. Faça novo deploy das functions

## Referência Rápida

### URLs das Cloud Functions:

- `createStripeCustomer` - Cria/obtém cliente Stripe
- `createStripeCheckout` - Cria sessão de checkout
- `createStripePortalSession` - Abre portal do cliente
- `stripeWebhook` - Recebe eventos do Stripe
- `cancelStripeSubscription` - Cancela assinatura
- `reactivateStripeSubscription` - Reativa assinatura

### Estrutura no Firestore:

```javascript
// users/{userId}
{
  stripeCustomerId: "cus_xxxxx",
  stripeSubscription: {
    id: "sub_xxxxx",
    status: "active", // active, canceled, past_due, unpaid, trialing
    currentPeriodStart: "2024-01-01T00:00:00Z",
    currentPeriodEnd: "2024-02-01T00:00:00Z",
    cancelAtPeriodEnd: false,
    priceId: "price_xxxxx",
    interval: "month" // month ou year
  },
  subscription: {
    plan: "premium", // free ou premium
    premiumStartDate: "2024-01-01T00:00:00Z",
    premiumEndDate: "2024-02-01T00:00:00Z"
  }
}
```

## Troubleshooting

### Webhook não recebe eventos:
- Verifique se a URL está correta
- Verifique se os eventos estão selecionados
- Verifique os logs no Stripe Dashboard

### Pagamento não ativa Premium:
- Verifique os logs das Cloud Functions
- Verifique se o webhook está configurado
- Verifique se o userId está no metadata da sessão

### Erro de CORS:
- Certifique-se de que as Cloud Functions têm os headers CORS configurados
- Verifique se a URL das functions está correta no frontend

## Suporte

- [Documentação do Stripe](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Firebase Functions](https://firebase.google.com/docs/functions)
