# 💰 Estratégia de Preços - You Ai Plataforma SaaS

## 📊 Tabela de Preços

| Plano | Duração | Preço | Desconto | Valor/Mês Efetivo |
|-------|---------|-------|----------|-------------------|
| **Mensal** | 1 mês | **R$ 49,90** | - | R$ 49,90 |
| **Semestral** | 6 meses | **R$ 229,90** | 8-10% | R$ 38,32 |
| **Anual** | 12 meses | **R$ 479,00** | 20% | R$ 39,92 |

---

## 🎯 Detalhamento de Cada Plano

### 📅 **Plano Mensal - R$ 49,90/mês**

**Ideal para:** Quem prefere flexibilidade e quer testar a plataforma

**Características:**
- Acesso por **1 mês** (30 dias)
- Renovação manual ou automática
- Cancelamento a qualquer momento
- Sem contrato de longa duração

**Modelo de cobrança:**
- Cobrado via Pix a cada mês
- Acesso liberado imediatamente após confirmação

---

### 💎 **Plano Semestral - R$ 229,90 (6 meses)**

**Ideal para:** Usuários que querem economizar ~8-10% + teste a médio prazo

**Características:**
- Acesso por **6 meses** (180 dias)
- Equivalente a **~R$ 38,32 por mês**
- **Desconto de 8-10%** sobre o valor mensal
  - 6 × R$ 49,90 = R$ 299,40 (preço cheio)
  - Desconto: R$ 229,90 - R$ 299,40 = **-R$ 69,50 economizados**
- Renovação após 6 meses

**Modelo de cobrança:**
- Pagamento único via Pix no ato da contratação
- Acesso liberado por 180 dias
- Renovação automática se ativar essa opção

**Benefício:** Cliente economiza ~1-2 meses de uso

---

### 🏆 **Plano Anual - R$ 479,00 (12 meses)**

**Ideal para:** Clientes comprometidos que querem máxima economia + fidelização

**Características:**
- Acesso por **12 meses** (365 dias)
- Equivalente a **~R$ 39,92 por mês**
- **Desconto de 20%** sobre o valor mensal
  - 12 × R$ 49,90 = R$ 598,80 (preço cheio)
  - Desconto: R$ 479,00 - R$ 598,80 = **-R$ 119,80 economizados**
- Renovação após 1 ano

**Modelo de cobrança:**
- Pagamento único via Pix no ato da contratação
- Acesso liberado por 365 dias
- Suporte prioritário incluído
- Renovação automática se ativar essa opção

**Benefício:** Cliente economiza ~2,4 meses de uso + vantagens extras

---

## 🔄 Modelo de Renovação Automática

Todos os planos possuem opção de renovação automática:

- **30 dias antes do vencimento:** Notificar cliente via email
- **Renovação automática:** Se ativada, cobra o Pix novamente
- **Renovação manual:** Cliente pode renovar manualmente ou deixar expirar
- **Acesso bloqueado:** Se não renovar, acesso é cancelado após expiração

---

## 💡 Estratégia de Vendas

### Recomendações por Perfil de Cliente

1. **Novo Cliente / Teste**
   - Oferecer: **Plano Mensal (R$ 49,90)**
   - Objetivo: Conhecer a plataforma, sem compromisso

2. **Cliente em Fase de Crescimento**
   - Oferecer: **Plano Semestral (R$ 229,90) - 10% OFF**
   - Pitch: "Aproveite 6 meses com R$ 70 de economia!"

3. **Cliente Enterprise / High Volume**
   - Oferecer: **Plano Anual (R$ 479,00) - 20% OFF**
   - Pitch: "1 ano de acesso por menos de R$ 40/mês + suporte VIP!"
   - Extra: Oferecer desconto adicional para pagamentos anuais múltiplos

---

## 📈 Projeção Financeira

### Cenário 1: 100 Clientes Pagantes

| Plano | Qtd Clientes | Faturamento | Observação |
|-------|-------------|-------------|------------|
| Mensal | 40 | R$ 1.996,00/mês | Flexível, alto churn |
| Semestral | 40 | R$ 9.196,00/semestre | Médio churn |
| Anual | 20 | R$ 9.580,00/ano | Baixo churn, VIP |
| **TOTAL** | **100** | **~R$ 21.000/semestre** | **~R$ 42.000/ano** |

### Cenário 2: 500 Clientes Pagantes

| Plano | Qtd Clientes | Faturamento | Observação |
|-------|-------------|-------------|------------|
| Mensal | 200 | R$ 9.980,00/mês | Totalizando ~R$ 119.760/ano |
| Semestral | 200 | R$ 45.980,00/semestre | Totalizando ~R$ 91.960/ano |
| Anual | 100 | R$ 47.900,00/ano | Faturamento constante |
| **TOTAL** | **500** | **~R$ 250.000/ano** | **MRR médio: ~R$ 20.800** |

---

## 🎁 Estratégias de Promoção Futura

### Promoção para Novas Contas
- **Primeiro mês 50% OFF**: R$ 24,95
- **Invite 3 amigos, ganhe 1 mês grátis**

### Promoção para Black Friday
- **Semestral:** R$ 179,90 (40% OFF)
- **Anual:** R$ 349,00 (42% OFF)

### Promoção por Volume
- **5 + planos anuais:** 25% OFF adicional
- **10 + planos anuais:** 30% OFF adicional

---

## 📋 Implementação Backend

### Model de Subscription (Banco de Dados)

```javascript
// Campos adicionais no Payment Model ou novo Subscription Model
{
  clientId: ObjectId,
  planType: enum['monthly', 'semi-annual', 'annual'],
  basePrice: Number,        // R$ 49,90 (mensal base)
  appliedPrice: Number,     // R$ 49,90, R$ 229,90 ou R$ 479,00
  discount: Number,         // 0%, 10%, 20%
  durationDays: Number,     // 30, 180, 365
  autoRenew: Boolean,
  nextBillingDate: Date,
  status: enum['active', 'pending', 'expired', 'cancelled']
}
```

### API Endpoints Necessários

```bash
# Listar planos disponíveis
GET /api/plans

# Criar subscrição
POST /api/subscriptions
{
  clientId: "...",
  planType: "monthly" | "semi-annual" | "annual",
  autoRenew: true
}

# Renovar subscrição
PUT /api/subscriptions/:id/renew

# Cancelar subscrição
DELETE /api/subscriptions/:id

# Ver histórico de pagamentos
GET /api/subscriptions/:clientId/history
```

---

## ✅ Checklist de Implementação

- [ ] Criar modelo Subscription no banco de dados
- [ ] Implementar endpoints de subscrição (CRUD)
- [ ] Integrar com Pix para cobrança recorrente
- [ ] Dashboard de planos no frontend
- [ ] Email de notificação 30 dias antes do vencimento
- [ ] Sistema automático de renovação
- [ ] Sistema de cupons/promoções
- [ ] Relatório de revenue por plano
- [ ] Suporte a upgrade/downgrade de plano
- [ ] Testes de integração com gateway de pagamento

---

## 📞 Suporte & FAQ

**P: Posso trocar de plano no meio do mês?**
R: Sim, você paga a diferença (proporcional) ou recebe crédito.

**P: E se eu cancelar antes do vencimento?**
R: Reembolsamos a parte não utilizada (proporcional dos dias restantes).

**P: Vocês oferecem trial grátis?**
R: Futuramente sim, primeira semana grátis para novos clientes.

**P: Posso pagar com parcelamento?**
R: Atualmente apenas Pix à vista, futuramente avaliaremos parcelamento.
