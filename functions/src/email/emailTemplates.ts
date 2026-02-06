// Tipos de email disponíveis
export type EmailType =
  | "welcome"
  | "share_invite"
  | "invite_accepted"
  | "invite_rejected"
  | "premium_upgrade"
  | "premium_reminder"
  | "premium_expired"
  | "referral_bonus"
  | "referral_invite"
  | "monthly_report"
  | "support_request"
  | "password_reset";

// Dados que podem ser passados para os templates
export interface EmailData {
  userName?: string;
  userEmail?: string;
  inviterName?: string;
  inviterEmail?: string;
  invitedName?: string;
  invitedEmail?: string;
  budgetCount?: number;
  budgetNames?: string[];
  expirationDate?: string;
  daysRemaining?: number;
  referralCount?: number;
  bonusMonths?: number;
  referralCode?: string;
  customMessage?: string;
  totalSpent?: number;
  totalBudget?: number;
  categoryBreakdown?: { name: string; spent: number; budget: number }[];
  month?: string;
  year?: number;
  supportMessage?: string;
  supportSubject?: string;
  playStoreUrl?: string;
  appUrl?: string;
}

// Template base com estilos
const baseTemplate = (content: string, previewText: string = "") => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Budget System</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
    .button {padding: 12px 24px !important;}
  </style>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; -webkit-font-smoothing: antialiased;">
  <!-- Preview text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${previewText}
  </div>
  
  <!-- Email container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td style="padding: 24px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; max-width: 600px;">
          
          <!-- Header -->
          <tr>
            <td style="padding: 24px; text-align: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px 16px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                💰 Budget System
              </h1>
              <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 14px;">
                Controle financeiro inteligente
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px 24px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px; color: #71717a; font-size: 13px;">
                © ${new Date().getFullYear()} Budget System. Todos os direitos reservados.
              </p>
              <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                Este email foi enviado para você porque está cadastrado no Budget System.
              </p>
              <p style="margin: 16px 0 0;">
                <a href="https://play.google.com/store/apps/details?id=com.budgetsystem.app" style="display: inline-block; margin: 0 8px; color: #6366f1; text-decoration: none; font-size: 13px;">
                  📱 Baixar App
                </a>
                <a href="mailto:admin@budgetsystem.cloud" style="display: inline-block; margin: 0 8px; color: #6366f1; text-decoration: none; font-size: 13px;">
                  ✉️ Suporte
                </a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Componentes reutilizáveis
const button = (text: string, url: string, color: string = "#6366f1") => `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px auto;">
    <tr>
      <td style="border-radius: 8px; background-color: ${color};">
        <a href="${url}" target="_blank" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px;">
          ${text}
        </a>
      </td>
    </tr>
  </table>
`;

const infoBox = (content: string, bgColor: string = "#f0fdf4", borderColor: string = "#22c55e") => `
  <div style="margin: 20px 0; padding: 16px; background-color: ${bgColor}; border-left: 4px solid ${borderColor}; border-radius: 0 8px 8px 0;">
    ${content}
  </div>
`;

const divider = () => `
  <hr style="margin: 24px 0; border: none; border-top: 1px solid #e4e4e7;">
`;

// Templates de email
export const emailTemplates: Record<EmailType, (data: EmailData) => { subject: string; html: string }> = {

  // Email de boas-vindas
  welcome: (data) => ({
    subject: "🎉 Bem-vindo ao Budget System!",
    html: baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
        Olá${data.userName ? `, ${data.userName}` : ""}! 👋
      </h2>
      <p style="margin: 0 0 16px; color: #3f3f46; font-size: 15px; line-height: 1.6;">
        Seja bem-vindo ao <strong>Budget System</strong>! Estamos muito felizes em ter você conosco.
      </p>
      <p style="margin: 0 0 16px; color: #3f3f46; font-size: 15px; line-height: 1.6;">
        Com o Budget System, você pode:
      </p>
      <ul style="margin: 0 0 20px; padding-left: 20px; color: #3f3f46; font-size: 15px; line-height: 1.8;">
        <li>📊 Criar orçamentos personalizados</li>
        <li>💸 Registrar gastos rapidamente</li>
        <li>📈 Acompanhar seu progresso em tempo real</li>
        <li>👥 Compartilhar orçamentos com família e amigos</li>
        <li>🔔 Receber alertas de gastos automáticos</li>
      </ul>
      
      ${infoBox(`
        <p style="margin: 0; color: #166534; font-size: 14px;">
          <strong>💡 Dica:</strong> Comece criando seu primeiro orçamento no app!
        </p>
      `)}
      
      ${button("Abrir o App", "https://budgetsystem.cloud")}
      
      ${divider()}
      
      <p style="margin: 0; color: #71717a; font-size: 13px; text-align: center;">
        Tem alguma dúvida? Responda este email ou acesse nossa ajuda no app.
      </p>
    `, "Bem-vindo ao Budget System! Comece a controlar suas finanças hoje."),
  }),

  // Convite de compartilhamento
  share_invite: (data) => ({
    subject: `📬 ${data.inviterName || data.inviterEmail} convidou você para compartilhar orçamentos`,
    html: baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
        Você recebeu um convite! 🎉
      </h2>
      <p style="margin: 0 0 16px; color: #3f3f46; font-size: 15px; line-height: 1.6;">
        <strong>${data.inviterName || data.inviterEmail}</strong> quer compartilhar ${data.budgetCount === 1 ? "um orçamento" : `${data.budgetCount} orçamentos`} com você no Budget System.
      </p>
      
      ${data.budgetNames && data.budgetNames.length > 0 ? `
        <div style="margin: 20px 0; padding: 16px; background-color: #faf5ff; border-radius: 8px;">
          <p style="margin: 0 0 8px; color: #6b21a8; font-size: 13px; font-weight: 600; text-transform: uppercase;">
            Orçamentos compartilhados:
          </p>
          <ul style="margin: 0; padding-left: 20px; color: #581c87;">
            ${data.budgetNames.map((name) => `<li style="margin: 4px 0;">${name}</li>`).join("")}
          </ul>
        </div>
      ` : ""}
      
      ${infoBox(`
        <p style="margin: 0; color: #166534; font-size: 14px;">
          Ao aceitar, vocês poderão ver e editar os mesmos orçamentos em tempo real!
        </p>
      `)}
      
      <p style="margin: 24px 0 8px; color: #3f3f46; font-size: 15px; text-align: center;">
        <strong>Já tem o app instalado?</strong>
      </p>
      ${button("Abrir App e Aceitar Convite", "https://budgetsystem.cloud")}
      
      ${divider()}
      
      <p style="margin: 0 0 8px; color: #3f3f46; font-size: 15px; text-align: center;">
        <strong>Ainda não tem o app?</strong>
      </p>
      <p style="margin: 0 0 16px; color: #71717a; font-size: 14px; text-align: center;">
        Baixe gratuitamente na Play Store:
      </p>
      ${button("📱 Baixar na Play Store", "https://play.google.com/store/apps/details?id=com.budgetsystem.app", "#22c55e")}
      
      <p style="margin: 24px 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">
        O convite expira em 7 dias. Se você não conhece ${data.inviterEmail}, pode ignorar este email.
      </p>
    `, `${data.inviterName || data.inviterEmail} quer compartilhar orçamentos com você!`),
  }),

  // Convite aceito
  invite_accepted: (data) => ({
    subject: `✅ ${data.invitedName || data.invitedEmail} aceitou seu convite!`,
    html: baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
        Convite aceito! 🎉
      </h2>
      <p style="margin: 0 0 16px; color: #3f3f46; font-size: 15px; line-height: 1.6;">
        Ótima notícia! <strong>${data.invitedName || data.invitedEmail}</strong> aceitou seu convite de compartilhamento.
      </p>
      
      ${infoBox(`
        <p style="margin: 0; color: #166534; font-size: 14px;">
          ✨ Agora vocês podem gerenciar os orçamentos juntos em tempo real!
        </p>
      `)}
      
      ${button("Ver Orçamentos Compartilhados", "https://budgetsystem.cloud")}
    `, `${data.invitedName || data.invitedEmail} aceitou compartilhar orçamentos com você!`),
  }),

  // Convite rejeitado
  invite_rejected: (data) => ({
    subject: `❌ ${data.invitedName || data.invitedEmail} recusou o convite`,
    html: baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
        Convite recusado
      </h2>
      <p style="margin: 0 0 16px; color: #3f3f46; font-size: 15px; line-height: 1.6;">
        <strong>${data.invitedName || data.invitedEmail}</strong> recusou seu convite de compartilhamento.
      </p>
      <p style="margin: 0 0 16px; color: #71717a; font-size: 14px; line-height: 1.6;">
        Não se preocupe! Você pode enviar um novo convite a qualquer momento ou convidar outras pessoas.
      </p>
      
      ${button("Gerenciar Convites", "https://budgetsystem.cloud")}
    `, "Seu convite de compartilhamento foi recusado."),
  }),

  // Upgrade Premium
  premium_upgrade: (data) => ({
    subject: "🌟 Bem-vindo ao Budget System Premium!",
    html: baseTemplate(`
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; padding: 8px 16px; background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #78350f; font-size: 13px; font-weight: 600; border-radius: 20px;">
          ⭐ PREMIUM ATIVO
        </span>
      </div>
      
      <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600; text-align: center;">
        Parabéns pela assinatura Premium! 🎉
      </h2>
      <p style="margin: 0 0 24px; color: #3f3f46; font-size: 15px; line-height: 1.6; text-align: center;">
        Agora você tem acesso a todos os recursos exclusivos do Budget System.
      </p>
      
      <div style="margin: 24px 0; padding: 20px; background-color: #fffbeb; border-radius: 12px; border: 1px solid #fde68a;">
        <h3 style="margin: 0 0 16px; color: #92400e; font-size: 16px; font-weight: 600;">
          Seus benefícios Premium:
        </h3>
        <ul style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px; line-height: 2;">
          <li>👥 Compartilhar orçamentos com família e amigos</li>
          <li>🔔 Captura automática de notificações bancárias</li>
          <li>📊 Relatórios avançados</li>
          <li>🎨 Temas exclusivos</li>
          <li>💬 Suporte prioritário</li>
        </ul>
      </div>
      
      ${data.expirationDate ? `
        <p style="margin: 24px 0 0; color: #71717a; font-size: 13px; text-align: center;">
          Sua assinatura é válida até <strong>${data.expirationDate}</strong>
        </p>
      ` : ""}
      
      ${button("Aproveitar o Premium", "https://budgetsystem.cloud", "#f59e0b")}
    `, "Sua assinatura Premium está ativa! Aproveite todos os benefícios."),
  }),

  // Lembrete de expiração Premium
  premium_reminder: (data) => ({
    subject: `⏰ Seu Premium expira em ${data.daysRemaining} dias`,
    html: baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
        Sua assinatura está acabando ⏰
      </h2>
      <p style="margin: 0 0 16px; color: #3f3f46; font-size: 15px; line-height: 1.6;">
        Olá${data.userName ? `, ${data.userName}` : ""}! Sua assinatura Premium expira em <strong>${data.daysRemaining} dias</strong> (${data.expirationDate}).
      </p>
      
      ${infoBox(`
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>⚠️ Após a expiração:</strong> Você perderá acesso ao compartilhamento de orçamentos e à captura automática de notificações.
        </p>
      `, "#fffbeb", "#f59e0b")}
      
      <p style="margin: 20px 0; color: #3f3f46; font-size: 15px; line-height: 1.6;">
        Renove agora e continue aproveitando todos os benefícios Premium!
      </p>
      
      ${button("Renovar Premium", "https://budgetsystem.cloud", "#f59e0b")}
      
      ${divider()}
      
      <p style="margin: 0; color: #71717a; font-size: 13px; text-align: center;">
        💡 <strong>Dica:</strong> Indique amigos e ganhe meses grátis de Premium!
      </p>
    `, `Sua assinatura Premium expira em ${data.daysRemaining} dias. Renove agora!`),
  }),

  // Premium expirado
  premium_expired: (data) => ({
    subject: "😢 Seu Premium expirou - Sentimos sua falta!",
    html: baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
        Seu Premium expirou 😢
      </h2>
      <p style="margin: 0 0 16px; color: #3f3f46; font-size: 15px; line-height: 1.6;">
        Olá${data.userName ? `, ${data.userName}` : ""}! Sua assinatura Premium expirou e sentimos muito sua falta.
      </p>
      
      <div style="margin: 20px 0; padding: 16px; background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
        <p style="margin: 0 0 8px; color: #991b1b; font-size: 14px; font-weight: 600;">
          Recursos que você perdeu acesso:
        </p>
        <ul style="margin: 0; padding-left: 20px; color: #7f1d1d; font-size: 14px;">
          <li>Compartilhamento de orçamentos</li>
          <li>Captura automática de notificações</li>
          <li>Relatórios avançados</li>
        </ul>
      </div>
      
      <p style="margin: 20px 0; color: #3f3f46; font-size: 15px; line-height: 1.6;">
        Volte para o Premium por apenas <strong>R$ 19,90/mês</strong> e recupere todos os benefícios!
      </p>
      
      ${button("Reativar Premium", "https://budgetsystem.cloud", "#6366f1")}
      
      ${divider()}
      
      <p style="margin: 0; color: #71717a; font-size: 13px; text-align: center;">
        Ou indique amigos e ganhe meses grátis! 🎁
      </p>
    `, "Sua assinatura Premium expirou. Reative agora e continue aproveitando!"),
  }),

  // Bônus de indicação
  referral_bonus: (data) => ({
    subject: `🎁 Você ganhou ${data.bonusMonths} mês${data.bonusMonths && data.bonusMonths > 1 ? "es" : ""} grátis de Premium!`,
    html: baseTemplate(`
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; font-size: 48px;">🎁</span>
      </div>
      
      <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600; text-align: center;">
        Parabéns! Você ganhou Premium grátis!
      </h2>
      <p style="margin: 0 0 24px; color: #3f3f46; font-size: 15px; line-height: 1.6; text-align: center;">
        Suas indicações renderam <strong>${data.bonusMonths} mês${data.bonusMonths && data.bonusMonths > 1 ? "es" : ""} grátis</strong> de Premium!
      </p>
      
      <div style="margin: 24px 0; padding: 20px; background: linear-gradient(135deg, #ecfdf5, #d1fae5); border-radius: 12px; text-align: center;">
        <p style="margin: 0 0 8px; color: #065f46; font-size: 14px;">
          Indicações ativas este mês:
        </p>
        <p style="margin: 0; color: #047857; font-size: 36px; font-weight: 700;">
          ${data.referralCount || 0}
        </p>
      </div>
      
      ${infoBox(`
        <p style="margin: 0; color: #166534; font-size: 14px;">
          💡 Continue indicando! Cada pessoa ativa = +1 mês grátis por mês!
        </p>
      `)}
      
      ${button("Ver Minhas Indicações", "https://budgetsystem.cloud")}
    `, `Você ganhou ${data.bonusMonths} mês grátis de Premium com suas indicações!`),
  }),

  // Relatório mensal
  monthly_report: (data) => ({
    subject: `📊 Seu relatório de ${data.month}/${data.year}`,
    html: baseTemplate(`
      <h2 style="margin: 0 0 8px; color: #18181b; font-size: 22px; font-weight: 600;">
        Relatório Mensal 📊
      </h2>
      <p style="margin: 0 0 24px; color: #71717a; font-size: 14px;">
        ${data.month}/${data.year}
      </p>
      
      <div style="margin: 24px 0; padding: 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 12px; text-align: center;">
        <p style="margin: 0 0 8px; color: rgba(255,255,255,0.8); font-size: 14px;">
          Total gasto no mês:
        </p>
        <p style="margin: 0; color: #ffffff; font-size: 36px; font-weight: 700;">
          R$ ${data.totalSpent?.toFixed(2).replace(".", ",")}
        </p>
        ${data.totalBudget ? `
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.7); font-size: 13px;">
            de R$ ${data.totalBudget.toFixed(2).replace(".", ",")} orçados
          </p>
        ` : ""}
      </div>
      
      ${data.categoryBreakdown && data.categoryBreakdown.length > 0 ? `
        <h3 style="margin: 24px 0 16px; color: #18181b; font-size: 16px; font-weight: 600;">
          Gastos por categoria:
        </h3>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 24px;">
          ${data.categoryBreakdown.map((cat) => {
      const percentage = cat.budget > 0 ? Math.min((cat.spent / cat.budget) * 100, 100) : 0;
      const color = percentage >= 100 ? "#ef4444" : percentage >= 80 ? "#f59e0b" : "#22c55e";
      return `
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e4e4e7;">
                  <p style="margin: 0 0 4px; color: #18181b; font-size: 14px; font-weight: 500;">
                    ${cat.name}
                  </p>
                  <div style="background-color: #e4e4e7; border-radius: 4px; height: 8px; overflow: hidden;">
                    <div style="background-color: ${color}; height: 100%; width: ${percentage}%;"></div>
                  </div>
                  <p style="margin: 4px 0 0; color: #71717a; font-size: 12px;">
                    R$ ${cat.spent.toFixed(2).replace(".", ",")} / R$ ${cat.budget.toFixed(2).replace(".", ",")}
                  </p>
                </td>
              </tr>
            `;
    }).join("")}
        </table>
      ` : ""}
      
      ${button("Ver Detalhes no App", "https://budgetsystem.cloud")}
    `, `Seu resumo financeiro de ${data.month}: R$ ${data.totalSpent?.toFixed(2)} gastos`),
  }),

  // Solicitação de suporte
  support_request: (data) => ({
    subject: `[Suporte] ${data.supportSubject || "Nova solicitação"}`,
    html: baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
        Nova Solicitação de Suporte
      </h2>
      
      <div style="margin: 20px 0; padding: 16px; background-color: #f4f4f5; border-radius: 8px;">
        <p style="margin: 0 0 8px; color: #71717a; font-size: 12px; text-transform: uppercase; font-weight: 600;">
          De:
        </p>
        <p style="margin: 0 0 16px; color: #18181b; font-size: 15px;">
          ${data.userName || "Usuário"} (${data.userEmail})
        </p>
        
        <p style="margin: 0 0 8px; color: #71717a; font-size: 12px; text-transform: uppercase; font-weight: 600;">
          Assunto:
        </p>
        <p style="margin: 0 0 16px; color: #18181b; font-size: 15px;">
          ${data.supportSubject || "Dúvida geral"}
        </p>
        
        <p style="margin: 0 0 8px; color: #71717a; font-size: 12px; text-transform: uppercase; font-weight: 600;">
          Mensagem:
        </p>
        <p style="margin: 0; color: #18181b; font-size: 15px; white-space: pre-wrap; line-height: 1.6;">
${data.supportMessage}
        </p>
      </div>
      
      <p style="margin: 16px 0 0; color: #71717a; font-size: 13px;">
        Responda diretamente a este email para entrar em contato com o usuário.
      </p>
    `, `Nova solicitação de suporte de ${data.userEmail}`),
  }),

  // Convite de indicação
  referral_invite: (data) => ({
    subject: `🎁 ${data.inviterName || "Um amigo"} está convidando você para controlar suas finanças!`,
    html: baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
        Você foi convidado! 🎉
      </h2>
      <p style="margin: 0 0 16px; color: #3f3f46; font-size: 15px; line-height: 1.6;">
        <strong>${data.inviterName || "Um amigo"}</strong> está usando o <strong>Budget System</strong> para controlar as finanças e está te convidando para experimentar também!
      </p>
      
      ${data.customMessage ? `
        <div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border-radius: 12px; border-left: 4px solid #6366f1;">
          <p style="margin: 0 0 8px; color: #6366f1; font-size: 12px; font-weight: 600; text-transform: uppercase;">
            Mensagem de ${data.inviterName || "seu amigo"}:
          </p>
          <p style="margin: 0; color: #334155; font-size: 15px; line-height: 1.6; font-style: italic;">
            "${data.customMessage}"
          </p>
        </div>
      ` : ""}
      
      <p style="margin: 0 0 16px; color: #3f3f46; font-size: 15px; line-height: 1.6;">
        Com o Budget System você pode:
      </p>
      <ul style="margin: 0 0 20px; padding-left: 20px; color: #3f3f46; font-size: 15px; line-height: 1.8;">
        <li>📊 Criar orçamentos personalizados</li>
        <li>💸 Registrar gastos rapidamente</li>
        <li>📈 Acompanhar seu progresso em tempo real</li>
        <li>🔔 Receber alertas de gastos automáticos</li>
        <li>👥 Compartilhar orçamentos com família</li>
      </ul>
      
      ${infoBox(`
        <p style="margin: 0; color: #166534; font-size: 14px;">
          <strong>🎁 Bônus:</strong> Baixe o app e crie sua conta usando este mesmo email (<strong>${data.invitedEmail || ""}</strong>) para que seu amigo ganhe benefícios Premium!
        </p>
      `)}
      
      ${button("📱 Baixar o App", "https://play.google.com/store/apps/details?id=com.nickmenegussi.budgetsystem")}
      
      ${divider()}
      
      <p style="margin: 0; color: #71717a; font-size: 13px; text-align: center;">
        Ao criar sua conta com o email <strong>${data.invitedEmail || "que recebeu este convite"}</strong>, a indicação será validada automaticamente.
      </p>
    `, `${data.inviterName || "Um amigo"} quer que você controle suas finanças com o Budget System!`),
  }),

  // Reset de senha (template customizado)
  password_reset: (data) => ({
    subject: "🔐 Redefinir sua senha - Budget System",
    html: baseTemplate(`
      <h2 style="margin: 0 0 16px; color: #18181b; font-size: 22px; font-weight: 600;">
        Redefinição de Senha 🔐
      </h2>
      <p style="margin: 0 0 16px; color: #3f3f46; font-size: 15px; line-height: 1.6;">
        Recebemos uma solicitação para redefinir a senha da sua conta no Budget System.
      </p>
      
      ${infoBox(`
        <p style="margin: 0; color: #92400e; font-size: 14px;">
          <strong>⚠️ Importante:</strong> Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá a mesma.
        </p>
      `, "#fffbeb", "#f59e0b")}
      
      <p style="margin: 20px 0; color: #3f3f46; font-size: 15px; line-height: 1.6;">
        Clique no botão abaixo para criar uma nova senha:
      </p>
      
      ${button("Redefinir Senha", data.appUrl || "https://budgetsystem.cloud")}
      
      <p style="margin: 24px 0 0; color: #a1a1aa; font-size: 12px; text-align: center;">
        Este link expira em 1 hora por motivos de segurança.
      </p>
    `, "Redefina sua senha do Budget System"),
  }),
};
