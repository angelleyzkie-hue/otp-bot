```js
// =========================
// TELEGRAM OTP BOT (Node.js)
// FULL UPDATED VERSION (TOP-UP SYSTEM ADDED)
// =========================

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const app = express();
app.use(express.json());

// =========================
// DATABASE (simple in-memory)
// =========================
let users = {};
let pendingPayments = [];
let userStates = {}; // track user steps

const ADMIN_ID = process.env.ADMIN_ID;

// =========================
// SERVICES LIST
// =========================
const services = [
    "Foodpanda",
    "Telegram",
    "WhatsApp",
    "Tara777",
    "MoveIt",
    "Joyride",
    "Shein",
    "Grab",
    "Facebook",
    "Nike"
];

// =========================
// HELPER: 2 BUTTONS PER ROW
// =========================
function chunkArray(array, size) {
    let result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

// =========================
// START COMMAND
// =========================
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    if (!users[chatId]) {
        users[chatId] = { balance: 0 };
    }

    bot.sendMessage(chatId, "Welcome to OTP Bot", {
        reply_markup: {
            keyboard: [
                ["Buy OTP"],
                ["Balance", "Top Up"],
                ["Help"]
            ],
            resize_keyboard: true
        }
    });
});

// =========================
// MESSAGE HANDLER
// =========================
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!users[chatId]) users[chatId] = { balance: 0 };

    // =========================
    // BUY OTP → SHOW SERVICES
    // =========================
    if (text === "Buy OTP") {
        const rows = chunkArray(services, 2);

        const keyboard = rows.map(row =>
            row.map(service => ({
                text: service,
                callback_data: `service_${service}`
            }))
        );

        return bot.sendMessage(chatId, "Which service do you need a number for?", {
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
    }

    // =========================
    // BALANCE
    // =========================
    if (text === "Balance") {
        return bot.sendMessage(chatId, `💰 Your balance: ${users[chatId].balance}`);
    }

    // =========================
    // HELP
    // =========================
    if (text === "Help") {
        return bot.sendMessage(chatId, "Contact admin for support.");
    }

    // =========================
    // TOP UP BUTTON
    // =========================
    if (text === "Top Up") {
        userStates[chatId] = "WAITING_PAYMENT";

        return bot.sendMessage(chatId,
`💰 Top-up Credits:

GCash: 09625699439 (Non-Verified)
Maya: 09537330643

📸 Send your payment screenshot after sending.`);
    }

    // =========================
    // HANDLE PAYMENT NUMBER INPUT
    // =========================
    if (userStates[chatId] && userStates[chatId].step === "WAITING_NUMBER") {
        const paymentNumber = text;
        const fileId = userStates[chatId].fileId;

        pendingPayments.push({
            userId: chatId,
            fileId,
            paymentNumber
        });

        bot.sendMessage(chatId, "✅ Payment submitted! Waiting for admin approval.");

        // Send to admin
        bot.sendPhoto(ADMIN_ID, fileId, {
            caption: `💰 Payment Request

User: ${chatId}
Number Used: ${paymentNumber}`,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Approve", callback_data: `approve_${chatId}` },
                        { text: "Reject", callback_data: `reject_${chatId}` }
                    ]
                ]
            }
        });

        userStates[chatId] = null;
        return;
    }

    // =========================
    // HANDLE SCREENSHOT
    // =========================
    if (msg.photo && userStates[chatId] === "WAITING_PAYMENT") {
        const fileId = msg.photo[msg.photo.length - 1].file_id;

        userStates[chatId] = {
            step: "WAITING_NUMBER",
            fileId: fileId
        };

        return bot.sendMessage(chatId, "📱 Please enter the GCash/Maya number you used to send payment:");
    }
});

// =========================
// CALLBACK HANDLER
// =========================
bot.on('callback_query', (query) => {
    const data = query.data;
    const userId = query.message.chat.id;

    // =========================
    // SERVICE SELECTED
    // =========================
    if (data.startsWith('service_')) {
        const service = data.replace('service_', '');
        const price = 10;

        if (users[userId].balance < price) {
            userStates[userId] = "WAITING_PAYMENT";

            bot.sendMessage(userId,
`❌ Not enough balance.

💰 Top-up Credits:

GCash: 09625699439 (Non-Verified)
Maya: 09537330643

📸 Send your payment screenshot after sending.`);
        } else {
            users[userId].balance -= price;

            const number = "+639XXXXXXXXX";

            bot.sendMessage(userId,
`✅ Number for ${service}:
${number}

Waiting for OTP...`);
        }

        bot.answerCallbackQuery(query.id);
    }

    // =========================
    // APPROVE PAYMENT
    // =========================
    if (data.startsWith('approve_')) {
        const targetUser = data.split('_')[1];

        if (!users[targetUser]) users[targetUser] = { balance: 0 };

        users[targetUser].balance += 10;

        bot.sendMessage(targetUser, "✅ Payment approved! +10 balance");
        bot.answerCallbackQuery(query.id, { text: "Approved" });
    }

    // =========================
    // REJECT PAYMENT
    // =========================
    if (data.startsWith('reject_')) {
        const targetUser = data.split('_')[1];

        bot.sendMessage(targetUser, "❌ Payment rejected.");
        bot.answerCallbackQuery(query.id, { text: "Rejected" });
    }
});

// =========================
// EXPRESS SERVER
// =========================
app.get('/', (req, res) => {
    res.send('Bot is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
```
