import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import { onSchedule } from "firebase-functions/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

// Nodemailer for email notifications (optional - uncomment if needed)
// import * as nodemailer from 'nodemailer';
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASSWORD
//   }
// });

/**
 * Cloud Function que recebe notificações bancárias e envia via FCM
 * POST /sendExpenseNotification
 * Body: { userId, amount, bank, description, category }
 */
export const sendExpenseNotification = onRequest(async (req, res) => {
    // CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    try {
        const { userId, amount, bank, description, category } = req.body;

        logger.info("Received expense notification", {
            userId,
            amount,
            bank,
            description,
            category,
        });

        if (!userId || !amount) {
            res.status(400).send("Missing required fields: userId, amount");
            return;
        }

        // Get user's FCM token from Firestore
        const userDoc = await admin.firestore()
            .collection("users")
            .doc(userId)
            .get();

        const fcmToken = userDoc.data()?.fcmToken;

        if (!fcmToken) {
            logger.warn("FCM token not found for user", { userId });
            res.status(404).send("FCM token not found");
            return;
        }

        // Send notification via FCM
        const message = {
            token: fcmToken,
            notification: {
                title: `Nova despesa: R$ ${amount}`,
                body: `${bank} - ${description || "Sem descrição"}`,
            },
            data: {
                type: "expense",
                amount: amount.toString(),
                bank: bank || "",
                description: description || "",
                category: category || "",
            },
        };

        await admin.messaging().send(message);

        logger.info("Notification sent successfully", { userId, amount });
        res.status(200).json({
            success: true,
            message: "Notification sent successfully",
        });
    } catch (error) {
        logger.error("Error sending notification", error);
        res.status(500).send(`Error sending notification: ${error}`);
    }
});

/**
 * Cloud Function para enviar notificações de convites
 * POST /sendInviteNotification
 * Body: { inviteId, fromUserId, fromUserEmail, toUserEmail,
 *         type: 'new_invite' | 'invite_accepted' | 'invite_rejected' }
 */
export const sendInviteNotification = onRequest(async (req, res) => {
    // CORS headers
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight
    if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
    }

    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }

    try {
        const { inviteId, fromUserId, fromUserEmail, toUserEmail,
            toUserId, type, budgetCount } = req.body;

        logger.info("Received invite notification", {
            inviteId,
            fromUserEmail,
            toUserEmail,
            type,
        });

        if (!inviteId || !type || !fromUserEmail || !toUserEmail) {
            res.status(400).send("Missing required fields");
            return;
        }

        // Prepara mensagem baseada no tipo
        let notificationTitle = "";
        let notificationBody = "";
        const notificationData: { [key: string]: string } = {
            type: "invite",
            inviteId,
            fromUserEmail,
        };

        if (type === "new_invite") {
            notificationTitle = "📬 Novo convite de orçamento";
            notificationBody =
                `${fromUserEmail} convidou você para compartilhar ` +
                `${budgetCount || "um"} orçamento(s)`;
            notificationData.action = "view_invite";

            // Envia push notification se o destinatário tiver FCM token
            logger.info("Processing new_invite", { toUserId, toUserEmail });

            if (toUserId) {
                logger.info("toUserId found, fetching user document", { toUserId });
                const toUserDoc = await admin.firestore()
                    .collection("users")
                    .doc(toUserId)
                    .get();

                const userData = toUserDoc.data();
                const fcmToken = userData?.fcmToken;
                const notificationsEnabled = userData?.notificationsEnabled;

                logger.info("User document fetched", {
                    exists: toUserDoc.exists,
                    hasToken: !!fcmToken,
                    notificationsEnabled,
                    tokenPrefix: fcmToken ? fcmToken.substring(0, 20) + "..." : "none"
                });

                // Verifica se o usuário tem notificações habilitadas (default: true)
                if (notificationsEnabled === false) {
                    logger.info("User has notifications disabled, skipping push", {
                        toUserId,
                        toUserEmail
                    });
                } else if (fcmToken) {
                    const message = {
                        token: fcmToken,
                        notification: {
                            title: notificationTitle,
                            body: notificationBody,
                        },
                        data: notificationData,
                    };
                    try {
                        await admin.messaging().send(message);
                        logger.info("Push notification sent to recipient", { toUserId });
                    } catch (fcmError: any) {
                        logger.error("FCM send failed", {
                            error: fcmError.message,
                            code: fcmError.code,
                            toUserId
                        });
                    }
                } else {
                    logger.warn("No FCM token for recipient", { toUserId, toUserEmail });
                }
            } else {
                logger.warn("No toUserId provided, cannot send push", { toUserEmail });
            }

            // TODO: Enviar email para o destinatário
            // Descomente quando configurar nodemailer:
            /*
                  await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: toUserEmail,
                    subject: notificationTitle,
                    html: `
                      <h2>${notificationTitle}</h2>
                      <p>${notificationBody}</p>
                      <p>Abra o app Budget System.</p>
                    `
                  })
                  logger.info("Email sent to recipient", {toUserEmail})
                  */
        } else if (type === "invite_accepted") {
            notificationTitle = "✅ Convite aceito!";
            notificationBody =
                `${toUserEmail} aceitou seu convite de compartilhamento`;
            notificationData.action = "refresh_budgets";

            // Envia push notification para quem enviou o convite
            if (fromUserId) {
                const fromUserDoc = await admin.firestore()
                    .collection("users")
                    .doc(fromUserId)
                    .get();

                const userData = fromUserDoc.data();
                const fcmToken = userData?.fcmToken;
                const notificationsEnabled = userData?.notificationsEnabled;

                // Verifica se o usuário tem notificações habilitadas (default: true)
                if (notificationsEnabled === false) {
                    logger.info("User has notifications disabled, skipping push", {
                        fromUserId
                    });
                } else if (fcmToken) {
                    const message = {
                        token: fcmToken,
                        notification: {
                            title: notificationTitle,
                            body: notificationBody,
                        },
                        data: notificationData,
                    };
                    await admin.messaging().send(message);
                    logger.info("Push notification sent to sender", { fromUserId });
                }
            }

            // TODO: Email para quem enviou
            /*
                  await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: fromUserEmail,
                    subject: notificationTitle,
                    html: `
                      <h2>${notificationTitle}</h2>
                      <p>${notificationBody}</p>
                    `
                  })
                  */
        } else if (type === "invite_rejected") {
            notificationTitle = "❌ Convite recusado";
            notificationBody =
                `${toUserEmail} recusou seu convite de compartilhamento`;
            notificationData.action = "refresh_invites";

            // Envia push notification para quem enviou o convite
            if (fromUserId) {
                const fromUserDoc = await admin.firestore()
                    .collection("users")
                    .doc(fromUserId)
                    .get();

                const userData = fromUserDoc.data();
                const fcmToken = userData?.fcmToken;
                const notificationsEnabled = userData?.notificationsEnabled;

                // Verifica se o usuário tem notificações habilitadas (default: true)
                if (notificationsEnabled === false) {
                    logger.info("User has notifications disabled, skipping push", {
                        fromUserId
                    });
                } else if (fcmToken) {
                    const message = {
                        token: fcmToken,
                        notification: {
                            title: notificationTitle,
                            body: notificationBody,
                        },
                        data: notificationData,
                    };
                    await admin.messaging().send(message);
                    logger.info("Push notification sent to sender", { fromUserId });
                }
            }

            // TODO: Email para quem enviou
            /*
                  await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: fromUserEmail,
                    subject: notificationTitle,
                    html: `
                      <h2>${notificationTitle}</h2>
                      <p>${notificationBody}</p>
                    `
                  })
                  */
        }

        logger.info("Invite notification processed successfully", { type, inviteId });
        res.status(200).json({
            success: true,
            message: "Invite notification processed successfully",
        });
    } catch (error) {
        logger.error("Error sending invite notification", error);
        res.status(500).send(`Error sending invite notification: ${error}`);
    }
});

/**
 * Cloud Function schedulada para notificar usuários inativos com despesas pendentes
 * Executa diariamente às 10h (horário de Brasília = 13h UTC)
 */
export const checkInactiveUsersWithPendingExpenses = onSchedule({
    schedule: "0 13 * * *", // Todo dia às 13h UTC (10h BRT)
    timeZone: "America/Sao_Paulo",
    retryCount: 3,
}, async () => {
    logger.info("🔔 Iniciando verificação de usuários inativos...");

    try {
        const db = admin.firestore();
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        logger.info("📅 Buscando usuários inativos desde:", sevenDaysAgo.toISOString());

        // Busca todos os usuários
        const usersSnapshot = await db.collection("users").get();

        let notificationsSent = 0;
        let usersChecked = 0;

        for (const userDoc of usersSnapshot.docs) {
            usersChecked++;
            const userData = userDoc.data();
            const userId = userDoc.id;

            // Verifica se tem FCM token e notificações habilitadas
            if (!userData.fcmToken) {
                continue;
            }

            // Se notificações desabilitadas, pula
            if (userData.notificationsEnabled === false) {
                continue;
            }

            // Verifica se está inativo há mais de 7 dias
            const lastActiveAt = userData.lastActiveAt ?
                new Date(userData.lastActiveAt) : null;

            if (!lastActiveAt || lastActiveAt > sevenDaysAgo) {
                // Usuário ativo recentemente, pula
                continue;
            }

            // Verifica se tem despesas pendentes
            try {
                const pendingDoc = await db
                    .collection("users")
                    .doc(userId)
                    .collection("data")
                    .doc("pendingExpenses")
                    .get();

                if (!pendingDoc.exists) {
                    continue;
                }

                const pendingData = pendingDoc.data();
                const expenses = pendingData?.expenses || [];

                if (expenses.length === 0) {
                    continue;
                }

                // Usuário inativo com despesas pendentes - envia notificação!
                logger.info("📤 Enviando notificação para usuário inativo:", {
                    userId,
                    lastActiveAt: lastActiveAt.toISOString(),
                    pendingExpensesCount: expenses.length,
                });

                const message = {
                    token: userData.fcmToken,
                    notification: {
                        title: "💰 Você tem despesas pendentes!",
                        body: `Você tem ${expenses.length} despesa(s) aguardando aprovação. ` +
                            `Abra o app para categorizar seus gastos.`,
                    },
                    data: {
                        type: "pending_expenses_reminder",
                        count: expenses.length.toString(),
                    },
                };

                try {
                    await admin.messaging().send(message);
                    notificationsSent++;
                    logger.info("✅ Notificação enviada para:", userId);
                } catch (fcmError: any) {
                    logger.error("❌ Erro ao enviar FCM:", {
                        userId,
                        error: fcmError.message,
                    });
                }
            } catch (pendingError) {
                logger.error("Erro ao verificar pendingExpenses:", {
                    userId,
                    error: pendingError,
                });
            }
        }

        logger.info("🏁 Verificação concluída:", {
            usersChecked,
            notificationsSent,
        });
    } catch (error) {
        logger.error("❌ Erro na verificação de usuários inativos:", error);
        throw error;
    }
});
