import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
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
            if (toUserId) {
                const toUserDoc = await admin.firestore()
                    .collection("users")
                    .doc(toUserId)
                    .get();

                const fcmToken = toUserDoc.data()?.fcmToken;
                if (fcmToken) {
                    const message = {
                        token: fcmToken,
                        notification: {
                            title: notificationTitle,
                            body: notificationBody,
                        },
                        data: notificationData,
                    };
                    await admin.messaging().send(message);
                    logger.info("Push notification sent to recipient", { toUserId });
                }
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

                const fcmToken = fromUserDoc.data()?.fcmToken;
                if (fcmToken) {
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

                const fcmToken = fromUserDoc.data()?.fcmToken;
                if (fcmToken) {
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
