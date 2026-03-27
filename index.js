```js
// =========================
// TELEGRAM OTP BOT (RAILWAY FIXED VERSION)
// =========================

require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.ADMIN_ID;

if (!BOT_TOKEN || !ADMIN_ID) {
    console.error("❌ Missing BOT_TOKEN or ADMIN_ID in .env");
    process.exit(1);
}

// ⚠️ FIX: Use polling safely
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const app = express();
app.use(express.json());

// =========================
// DATABASE (in-memory)
// =========================
let users = {};
let pendingPayments = [];
let userStates = {};

// =========================
// SERVICES
// =========================
const services = [
    "Foodpanda","Telegram","WhatsApp","Tara777",
    "MoveIt","Joyride","Shein","Grab","Facebook","Nike"
];

// =========================
// HELPER
// =========================
function chunkArray(array, size) {
    let result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
}

// =========================
// START
// =========================
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    if (!users[chatId]) users[chatId] = { balance: 0 };

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
bot.on('message', async (msg) => {
    try {
        const chatId = msg.chat.id;
        const text = msg.text || "";

        if (!users[chatId]) users[chatId] = { balance: 0 };

        // BUY OTP
        if (text === "Buy OTP") {
            const rows = chunkArray(services, 2);

            const keyboard = rows.map(row =>
                row.map(service => ({
                    text: service,
                    callback_data: `service_${service}`
                }))
            );

            return bot.sendMessage(chatId, "Which service?", {
                reply_markup: { inline_keyboard: keyboard }
            });
        }

        // BALANCE
        if (text === "Balance") {
            return bot.sendMessage(chatId, `💰 Balance: ${users[chatId].balance}`);
        }

        // HELP
        if (text === "Help") {
            return bot.sendMessage(chatId, "Contact admin.");
        }

        // TOP UP
        if (text === "Top Up") {
            userStates[chatId] = "WAITING_PAYMENT";

            return bot.sendMessage(chatId,
`💰 Top-up Credits:

GCash: 09625699439 (Non-Verified)
Maya: 09537330643

📸 Send screenshot after payment.`);
        }

        // HANDLE NUMBER INPUT
        if (userStates[chatId]?.step === "WAITING_NUMBER") {
            const paymentNumber = text;
            const fileId = userStates[chatId].fileId;

            pendingPayments.push({ chatId, fileId, paymentNumber });

            await bot.sendMessage(chatId, "✅ Sent for approval.");

            await bot.sendPhoto(ADMIN_ID, fileId, {
                caption: `Payment\nUser: ${chatId}\nNumber: ${paymentNumber}`,
                reply_markup: {
                    inline_keyboard: [[
                        { text: "Approve", callback_data: `approve_${chatId}` },
                        { text: "Reject", callback_data: `reject_${chatId}` }
                    ]]
                }
            });

            userStates[chatId] = null;
        }

        // HANDLE PHOTO
        if (msg.photo && userStates[chatId] === "WAITING_PAYMENT") {
            const fileId = msg.photo[msg.photo.length - 1].file_id;

            userStates[chatId] = {
                step: "WAITING_NUMBER",
                fileId
            };

            return bot.sendMessage(chatId, "📱 Enter payment number:");
        }

    } catch (err) {
        console.error("❌ Message error:", err);
    }
});

// =========================
// CALLBACK HANDLER
// =========================
bot.on('callback_query', async (query) => {
    try {
        const data = query.data;
        const userId = query.message.chat.id;

        if (!users[userId]) users[userId] = { balance: 0 };

        // SERVICE
        if (data.startsWith('service_')) {
            const service = data.replace('service_', '');
            const price = 10;

            if (users[userId].balance < price) {
                userStates[userId] = "WAITING_PAYMENT";

                await bot.sendMessage(userId,
`❌ Not enough balance.

GCash: 09625699439
Maya: 09537330643

Send screenshot.`);
            } else {
                users[userId].balance -= price;

                await bot.sendMessage(userId,
`✅ ${service} Number:
+639XXXXXXXXX

Waiting OTP...`);
            }

            return bot.answerCallbackQuery(query.id);
        }

        // APPROVE
        if (data.startsWith('approve_')) {
            const target = data.split('_')[1];

            if (!users[target]) users[target] = { balance: 0 };

            users[target].balance += 10;

            await bot.sendMessage(target, "✅ Approved +10");
            return bot.answerCallbackQuery(query.id);
        }

        // REJECT
        if (data.startsWith('reject_')) {
            const target = data.split('_')[1];

            await bot.sendMessage(target, "❌ Rejected");
            return bot.answerCallbackQuery(query.id);
        }

    } catch (err) {
        console.error("❌ Callback error:", err);
    }
});

// =========================
// ERROR HANDLING
// =========================
bot.on("polling_error", (err) => console.error("Polling error:", err));

// =========================
// EXPRESS SERVER
// =========================
app.get('/', (req, res) => res.send('Bot running'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running"));
```
