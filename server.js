const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Конфигурация приложения
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN || "8829942321:AAHzai6My057v36JiB35izszp5COPg31FCw"; 
const ADMIN_ID = 6949963047; // Твой Telegram ID
const DB_FILE = path.join(__dirname, 'database.json');

// Инициализация Express и Telegram-бота
const app = express();
const bot = new Telegraf(BOT_TOKEN);

app.use(cors());
app.use(express.json());

// ВАЖНОЕ ИСПРАВЛЕНИЕ: Раздаем файлы интерфейса (index.html и app.js) как сайт
app.use(express.static(__dirname));

// Функция для чтения/записи временной БД (JSON файла)
function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ parties: [], reports: [], bannedUsers: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ==========================================
// 🛠 API ЭНДПОИНТЫ ДЛЯ MINI APP (ФРОНТЕНДА)
// ==========================================

// 1. Получить список всех активных гулянок
app.get('/api/parties', (req, res) => {
    const db = readDB();
    const activeParties = db.parties.filter(p => !db.bannedUsers.includes(p.creator.id));
    res.json(activeParties);
});

// 2. Создать новую гулянку
app.post('/api/parties', (req, res) => {
    const db = readDB();
    const newParty = {
        id: Math.random().toString(36).substr(2, 9),
        ...req.body,
        createdAt: new Date().toISOString()
    };
    
    if (db.bannedUsers.includes(newParty.creator.id)) {
        return res.status(403).json({ error: "Вы заблокированы за нарушения правил." });
    }

    db.parties.push(newParty);
    writeDB(db);
    res.status(201).json(newParty);
});

// 3. Отправить жалобу (ЖБ) на пользователя
app.post('/api/reports', (req, res) => {
    const db = readDB();
    const report = {
        id: Math.random().toString(36).substr(2, 9),
        ...req.body,
        status: 'pending'
    };
    db.reports.push(report);
    writeDB(db);

    bot.telegram.sendMessage(ADMIN_ID, `🚨 *Поступила новая ЖБ!*\n\nНарушитель: @${report.targetUsername}\nПричина: код [${report.reason}]\nКто пожаловался: ID ${report.reporterId}\n\nПроверь админку в Mini App!`, { parse_mode: 'Markdown' })
       .catch(err => console.error("Не удалось отправить уведомление админу:", err));

    res.status(201).json({ success: true });
});

// 4. Получить список всех жалоб (только для админа)
app.get('/api/reports', (req, res) => {
    const db = readDB();
    res.json(db.reports.filter(r => r.status === 'pending'));
});

// ==========================================
// 🤖 ЛОГИКА ТЕЛЕГРАМ-БОТА
// ==========================================

bot.start((ctx) => {
    ctx.reply(
        `Привет, ${ctx.from.first_name}! 📍 Добро пожаловать на Grodno Run.\n\nНадоело скучать дома? Жми кнопку ниже, создавай компанию для гулянок, футбола или каток прямо сейчас или присоединяйся к ребятам на районе!`,
        Markup.inlineKeyboard([
            [Markup.button.webApp('🚀 Открыть Радар Гулянок', 'https://onrender.com')]
        ])
    );
});

bot.action(/^verify_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return ctx.answerCbQuery("Доступ запрещен!");
    const targetId = ctx.match[1];
    
    bot.telegram.sendMessage(targetId, "⚠️ *Внимание! На ваш аккаунт поступили жалобы.*\n Чтобы восстановить доступ к радару гулянок, отправьте в этот чат *видео-кружочек* с кодовым словом 'ГРОДНО' или ссылку на открытый профиль Instagram/TikTok.", { parse_mode: 'Markdown' })
        .then(() => ctx.reply("Запрос на верификацию отправлен пользователю."))
        .catch(() => ctx.reply("Не удалось отправить сообщение. Возможно, бот заблокирован пользователем."));
});

bot.on(['video_note', 'voice', 'text'], (ctx) => {
    if (ctx.from.id !== ADMIN_ID) {
        ctx.reply("Спасибо. Ваши данные отправлены модератору @vqc_2 на проверку. Ожидайте разблокировки.");
        bot.telegram.sendMessage(ADMIN_ID, `📨 *Данные для проверки от юзера @${ctx.from.username || 'скрыт'} (ID: ${ctx.from.id}):*`);
        ctx.forwardMessage(ADMIN_ID);
    }
});

app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
bot.launch().then(() => console.log("Telegram-бот успешно запущен"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

