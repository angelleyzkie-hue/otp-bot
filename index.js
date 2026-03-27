// =========================
// TELEGRAM OTP BOT (Node.js)
// Features:
// - Menu buttons
// - Manual payment (GCash/Maya/QRPH)
// - Balance system
// - Admin panel
// - Ready for deployment (Railway/Render)
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

const ADMIN_ID = process.env.ADMIN_ID;

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
                ["Balance"],
                ["Help"]
            ],
            resize_keyboard: true
        }
    });
});

// =========================
// MENU HANDLER
// =========================
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!users[chatId]) users[chatId] = { balance: 0 };

    if (text === "Buy OTP") {
        bot.sendMessage(chatId,
`Send payment first:\n\nGCash: 09XXXXXXXXX\nMaya: 09XXXXXXXXX\n\nThen send screenshot here.`);
    }

    if (text === "Balance") {
        bot.sendMessage(chatId, `Your balance: ${users[chatId].balance}`);
    }

    if (text === "Help") {
        bot.sendMessage(chatId, "Contact admin for support.");
    }

    // HANDLE SCREENSHOT (photo)
    if (msg.photo) {
        const fileId = msg.photo[msg.photo.length - 1].file_id;

        pendingPayments.push({
            userId: chatId,
            fileId
        });

        bot.sendMessage(chatId, "Payment sent for review.");

        // Send to admin
        bot.sendPhoto(ADMIN_ID, fileId, {
            caption: `Payment from ${chatId}`,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "Approve", callback_data: `approve_${chatId}` },
                        { text: "Reject", callback_data: `reject_${chatId}` }
                    ]
                ]
            }
        });
    }
});

// =========================
// ADMIN ACTIONS
// =========================
bot.on('callback_query', (query) => {
    const data = query.data;

    if (data.startsWith('approve_')) {
        const userId = data.split('_')[1];

        users[userId].balance += 10; // Add credits

        bot.sendMessage(userId, "Payment approved! +10 balance");
        bot.answerCallbackQuery(query.id, { text: "Approved" });
    }

    if (data.startsWith('reject_')) {
        const userId = data.split('_')[1];

        bot.sendMessage(userId, "Payment rejected.");
        bot.answerCallbackQuery(query.id, { text: "Rejected" });
    }
});

// =========================
// EXPRESS SERVER (for hosting)
// =========================
app.get('/', (req, res) => {
    res.send('Bot is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

// =========================
// PACKAGE.JSON
// =========================
/*
{
  "name": "otp-bot",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "dotenv": "^16.0.0",
    "express": "^4.18.2",
    "node-telegram-bot-api": "^0.61.0"
  }
}
*/

// =========================
// .ENV FILE
// =========================
/*
BOT_TOKEN=your_bot_token_here
ADMIN_ID=your_telegram_id_here
*/

// =========================
// DEPLOYMENT (Railway)
// =========================
/*
1. Install Git
2. Upload this project to GitHub
3. Go to Railway
4. New Project -> Deploy from GitHub
5. Add ENV variables:
   BOT_TOKEN
   ADMIN_ID
6. Deploy
*/
