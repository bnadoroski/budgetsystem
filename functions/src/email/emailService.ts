import * as nodemailer from "nodemailer";
import * as logger from "firebase-functions/logger";
import { emailTemplates, EmailType, EmailData } from "./emailTemplates";

// Configuração do Zoho Mail SMTP
// Usa variáveis de ambiente do arquivo .env
const transporter = nodemailer.createTransport({
    host: "smtppro.zoho.com",
    port: 465,
    secure: true, // SSL
    auth: {
        user: process.env.ZOHO_EMAIL || "admin@budgetsystem.cloud",
        pass: process.env.ZOHO_PASSWORD,
    },
});

// Configurações do email
const EMAIL_CONFIG = {
    from: {
        name: "Budget System",
        address: "admin@budgetsystem.cloud",
    },
    replyTo: "admin@budgetsystem.cloud",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.budgetsystem.app",
    appUrl: "https://budgetsystem.cloud",
};

/**
 * Envia um email usando o template especificado
 */
export async function sendEmail(
    to: string,
    type: EmailType,
    data: EmailData
): Promise<boolean> {
    try {
        const template = emailTemplates[type];
        if (!template) {
            logger.error("Email template not found", { type });
            return false;
        }

        const { subject, html } = template(data);

        const mailOptions = {
            from: `"${EMAIL_CONFIG.from.name}" <${EMAIL_CONFIG.from.address}>`,
            replyTo: EMAIL_CONFIG.replyTo,
            to,
            subject,
            html,
        };

        const result = await transporter.sendMail(mailOptions);
        logger.info("Email sent successfully", {
            to,
            type,
            messageId: result.messageId,
        });
        return true;
    } catch (error) {
        logger.error("Failed to send email", { to, type, error });
        return false;
    }
}

/**
 * Verifica se a conexão SMTP está funcionando
 */
export async function verifyConnection(): Promise<boolean> {
    try {
        await transporter.verify();
        logger.info("SMTP connection verified successfully");
        return true;
    } catch (error) {
        logger.error("SMTP connection failed", { error });
        return false;
    }
}

export { EMAIL_CONFIG };
