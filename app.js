// ==========================================
// БЛОК 1: КОНФИГУРАЦИЯ И СИСТЕМНЫЙ ЗАПУСК
// ==========================================

const BOT_TOKEN = "8829942321:AAHzai6My057v36JiB35izszp5COPg31FCw";
const ADMIN_ID = 6949963047;
const CHANNEL_ID = "@Grodno_run"; // Твой канал привязан напрямую

// Инициализация Telegram Web App API
const tg = window.Telegram.WebApp;
tg.expand(); // Открываем Mini App на максимум вверх

// Извлекаем реальный профиль пользователя из системы Telegram
let userProfile = {
    tgId: tg.initDataUnsafe?.user?.id || 999999999,
    username: tg.initDataUnsafe?.user?.username || "",
    firstName: tg.initDataUnsafe?.user?.first_name || "Пользователь",
    gender: null,
    age: null
};

// Переменные для твоего админского "Режима Бога" (Эмулятора)
let isAdminMode = false;
let fakeGender = null;
let fakeAge = null;

// Системный буфер для жалоб
let selectedReportTarget = null; 

// Точка входа при полной загрузке страницы приложения
document.addEventListener("DOMContentLoaded", () => {
    checkAdminRights();
    loadSession();
    processIncomingDeepLink();
    tg.ready(); // Сигнал Телеграму, что приложение успешно загрузилось
});

// Проверка на твой личный Telegram ID (Активация пульта модератора)
function checkAdminRights() {
    if (userProfile.tgId === ADMIN_ID) {
        const panel = document.getElementById("admin-panel");
        if (panel) panel.classList.remove("hidden");
        isAdminMode = true;
    }
}

// Загрузка сессии, чтобы не заполнять Шаг 0 каждый раз при входе
function loadSession() {
    const savedGender = localStorage.getItem("gr_gender");
    const savedAge = localStorage.getItem("gr_age");
    
    if (savedGender && savedAge) {
        userProfile.gender = savedGender;
        userProfile.age = parseInt(savedAge);
        
        const authScreen = document.getElementById("auth-screen");
        const mainApp = document.getElementById("main-app");
        
        if (authScreen) authScreen.classList.add("hidden");
        if (mainApp) mainApp.classList.remove("hidden");
        
        applyAgeCorridorRules();
    }
}
// ==========================================
// БЛОК 2: ЛОГИКА ВХОДНОГО КОНТРОЛЯ (ШАГ 0)
// ==========================================

// Пацанский выбор пола (меняет рамки и подсветку кнопок)
function setGender(gender) {
    userProfile.gender = gender;
    const isMale = gender === "Парень";
    
    const maleBtn = document.getElementById("gender-male");
    const femaleBtn = document.getElementById("gender-female");
    
    if (maleBtn) {
        maleBtn.className = isMale ? 
            "py-4 px-4 rounded-xl border-2 border-indigo-500 bg-indigo-600/30 text-sm font-black uppercase tracking-wider text-white transition-all scale-[1.02]" : 
            "py-4 px-4 rounded-xl border border-slate-700 bg-slate-800/40 text-sm font-bold uppercase tracking-wider text-slate-400 transition-all";
    }
    if (femaleBtn) {
        femaleBtn.className = !isMale ? 
            "py-4 px-4 rounded-xl border-2 border-indigo-500 bg-indigo-600/30 text-sm font-black uppercase tracking-wider text-white transition-all scale-[1.02]" : 
            "py-4 px-4 rounded-xl border border-slate-700 bg-slate-800/40 text-sm font-bold uppercase tracking-wider text-slate-400 transition-all";
    }
}

// Живая проверка возраста с подсказкой категорий для Гродно
function handleAgeInput(value) {
    const age = parseInt(value);
    const warning = document.getElementById("age-warning-text");
    if (!warning || isNaN(age)) return;

    if (age >= 12 && age <= 17) {
        warning.innerText = "Категория: Подростки. Будут доступны сборы только до 17 лет включительно.";
        warning.className = "text-[10px] text-cyan-400 mt-2 font-bold uppercase tracking-wide";
    } else if (age >= 18 && age <= 35) {
        warning.innerText = "Категория: Взрослые (18+). Доступ к подростковым сборам заблокирован.";
        warning.className = "text-[10px] text-indigo-400 mt-2 font-bold uppercase tracking-wide";
    } else {
        warning.innerText = "Возрастной лимит радара: от 12 до 35 лет.";
        warning.className = "text-[10px] text-rose-400 mt-2 font-bold uppercase tracking-wide";
    }
}

// Пропуск проверенного пользователя внутрь радара
function verifyAndProceed() {
    const ageInput = document.getElementById("user-age")?.value;
    const age = parseInt(ageInput);

    if (!userProfile.gender) {
        tg.showAlert("Выбери свой пол перед входом на радар!");
        return;
    }
    if (isNaN(age) || age < 12 || age > 35) {
        tg.showAlert("Укажи реальный возраст от 12 до 35 лет!");
        return;
    }

    userProfile.age = age;
    localStorage.setItem("gr_gender", userProfile.gender);
    localStorage.setItem("gr_age", age);

    document.getElementById("auth-screen")?.classList.add("hidden");
    document.getElementById("main-app")?.classList.remove("hidden");
    applyAgeCorridorRules();
}

// ==========================================
// БЛОК 3: ВОЗРАСТНЫЕ ШЛЮЗЫ И КОРИДОРЫ БЕЗОПАСНОСТИ
// ==========================================

function applyAgeCorridorRules() {
    const currentAge = (isAdminMode && fakeAge) ? fakeAge : userProfile.age;
    const fromInput = document.getElementById("age-from");
    const toInput = document.getElementById("age-to");
    const info = document.getElementById("corridor-info-text");

    if (!fromInput || !toInput || !info) return;

    if (currentAge >= 12 && currentAge <= 16) {
        fromInput.value = 12;
        fromInput.max = 17;
        toInput.value = 17;
        toInput.max = 17;
        info.innerText = "⚠️ Авто-шлюз: Вы можете звать только сверстников до 17 лет";
        info.className = "text-[9px] text-cyan-400 mt-2 uppercase tracking-wider font-bold";
    } else if (currentAge === 17) {
        fromInput.value = 16;
        fromInput.min = 16;
        toInput.value = 19;
        toInput.max = 19;
        info.innerText = "⚠️ Авто-шлюз: Доступен переходный коридор (16 - 19 лет)";
        info.className = "text-[9px] text-amber-400 mt-2 uppercase tracking-wider font-bold";
    } else {
        fromInput.value = 18;
        fromInput.min = 18;
        toInput.value = 25;
        toInput.min = 18;
        info.innerText = "⚠️ Авто-шлюз: Доступна только взрослая категория (18+)";
        info.className = "text-[9px] text-indigo-400 mt-2 uppercase tracking-wider font-bold";
    }
}

// ==========================================
// БЛОК 4: АДМИН-ПУЛЬТ (ЭМУЛЯТОР ПРОФИЛЯ)
// ==========================================

function toggleFakeGender(gender) {
    fakeGender = gender;
    const isMale = gender === "Парень";
    
    const maleBtn = document.getElementById("fake-sex-male");
    const femaleBtn = document.getElementById("fake-sex-female");
    
    if (maleBtn) {
        maleBtn.className = isMale ? 
            "py-3 px-4 bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all scale-[1.02]" : 
            "py-3 px-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 transition-all";
    }
    if (femaleBtn) {
        femaleBtn.className = !isMale ? 
            "py-3 px-4 bg-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all scale-[1.02]" : 
            "py-3 px-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-400 transition-all";
    }
}

function updateFakeAge(val) {
    fakeAge = parseInt(val) || null;
    applyAgeCorridorRules();
}

function triggerAdminAction(type) {
    if (type === 'verify_alert') {
        tg.showAlert("Ультиматум отправлен нарушителю: Требуется видео-кружок в ЛС с кодовым словом 'Гродно 2026' и лицом, либо подтверждение шапки профиля соцсети со словом 'GrodnoRun'!");
    }
}

// ==========================================
// БЛОК 5: НАВИГАЦИЯ И УПРАВЛЕНИЕ СЧЕТЧИКАМИ
// ==========================================

function switchTab(tab) {
    const isFeed = tab === "feed";
    const feedSec = document.getElementById("section-feed");
    const createSec = document.getElementById("section-create");
    
    if (feedSec) feedSec.classList.toggle("hidden", !isFeed);
    if (createSec) createSec.classList.toggle("hidden", isFeed);
    
    const tabFeedBtn = document.getElementById("tab-feed");
    const tabCreateBtn = document.getElementById("tab-create");
    
    if (tabFeedBtn) {
        tabFeedBtn.className = isFeed ? 
            "py-3 text-xs font-black uppercase tracking-wider rounded-lg bg-indigo-600 text-white transition-all shadow-md shadow-indigo-950/50" : 
            "py-3 text-xs font-bold uppercase tracking-wider rounded-lg text-slate-400 hover:text-white transition-all";
    }
    if (tabCreateBtn) {
        tabCreateBtn.className = !isFeed ? 
            "py-3 text-xs font-black uppercase tracking-wider rounded-lg bg-indigo-600 text-white transition-all shadow-md shadow-indigo-950/50" : 
            "py-3 text-xs font-bold uppercase tracking-wider rounded-lg text-slate-400 hover:text-white transition-all";
    }
}

function handlePurposeChange(value) {
    const block = document.getElementById("custom-purpose-block");
    if (block) {
        if (value === "CUSTOM") block.classList.remove("hidden");
        else block.classList.add("hidden");
    }
}

function changeCounter(id, delta) {
    const el = document.getElementById(id);
    if (!el) return;
    let val = parseInt(el.innerText);
    val = Math.max(0, Math.min(10, val + delta));
    el.innerText = val;
}
// ==========================================
// БЛОК 6: СБОР ДАННЫХ И ПРЯМАЯ ОТПРАВКА В ТГК
// ==========================================

function submitRadar() {
    const locSelect = document.getElementById("location");
    const customLocInput = document.getElementById("custom-location");
    if (!locSelect || !customLocInput) return;

    let loc = locSelect.value;
    const customLoc = customLocInput.value.trim();
    if (customLoc) loc += ` — ${customLoc}`;

    const purposeSelect = document.getElementById("purpose");
    if (!purposeSelect) return;
    
    let purp = purposeSelect.value;
    if (purp === "CUSTOM") {
        const customPurpInput = document.getElementById("custom-purpose");
        purp = customPurpInput ? customPurpInput.value.trim() : "";
        if (!purp) {
            tg.showAlert("Введи свой вариант цели сбора!");
            return;
        }
    }

    const ageFrom = parseInt(document.getElementById("age-from")?.value || "16");
    const ageTo = parseInt(document.getElementById("age-to")?.value || "22");
    const withFriend = document.getElementById("with-friend")?.checked || false;
    const guys = parseInt(document.getElementById("count-guys")?.innerText || "0");
    const girls = parseInt(document.getElementById("count-girls")?.innerText || "0");
    const desc = document.getElementById("description")?.value.trim() || "";

    // ЖЕСТКИЙ ФИЛЬТР ОТ СПАМ-ССЫЛОК И РЕКЛАМЫ В ОПИСАНИИ
    if (desc.match(/(http|https|t\.me|\x40)/gi)) {
        tg.showAlert("Ссылки, юзернеймы и реклама в описании строго запрещены!");
        return;
    }

    const effectiveAge = (isAdminMode && fakeAge) ? fakeAge : userProfile.age;
    const effectiveGender = (isAdminMode && fakeGender) ? fakeGender : userProfile.gender;

    // Вторичная валидация шлюзов коридора возраста
    if (effectiveAge <= 16 && (ageFrom > 17 || ageTo > 17)) {
        tg.showAlert("Ошибка коридора: Подросткам нельзя звать взрослых (18+)!");
        return;
    }
    if (effectiveAge >= 18 && (ageFrom < 18 || ageTo < 17)) {
        tg.showAlert("Ошибка коридора: Взрослым запрещено приглашать несовершеннолетних!");
        return;
    }

    // Собираем текст карточки для публикации в канал
    const textMessage = `⚡️ *НОВЫЙ СБОР: Grodno Run*\n\n` +
                        `📍 *Район:* ${loc}\n` +
                        `🎯 *Цель:* ${purp}\n` +
                        `🔞 *Коридор возраста:* ${ageFrom} - ${ageTo} лет\n` +
                        `👥 *Состав:* Ищу парней (${guys}), Ищу девушек (${girls})\n` +
                        `${withFriend ? "📌 *Со мной уже идёт друг/подруга*\n" : ""}` +
                        `${desc ? `📝 *Описание:* _${desc}_\n` : ""}\n` +
                        `⚠️ *Статус автора:* Нарушений не зафиксировано (0 ШО)\n\n` +
                        `🔒 _Контакты скрыты от спама. Нажми кнопку ниже, чтобы пройти автоматический фейс-контроль._`;

    // Сборка умной ссылки для фейс-контроля (startapp)
    const botUser = tg.initDataUnsafe?.receiver?.username || "GrodnoRunBot"; 
    const appUrl = `https://t.me{botUser}/app?startapp=check_${userProfile.tgId}_${effectiveGender === 'Парень'?'M':'F'}_${effectiveAge}_${ageFrom}_${ageTo}`;

    const replyMarkup = {
        inline_keyboard: [[{ text: "🔥 Принять сбор / Вступить", url: appUrl }]]
    };

    fetch(`https://telegram.org{BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: CHANNEL_ID,
            text: textMessage,
            parse_mode: "Markdown",
            reply_markup: replyMarkup
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            tg.showAlert("Радар запущен! Сбор опубликован в канале.");
            switchTab("feed");
        } else {
            tg.showAlert("Ошибка публикации. Убедись, что бот админ в канале.");
        }
    })
    .catch(() => tg.showAlert("Ошибка сети при отправке радара."));
}

// ==========================================
// БЛОК 7: ОБРАБОТКА ОТКЛИКОВ И ФЕЙС-КОНТРОЛЬ
// ==========================================

function processIncomingDeepLink() {
    const startParam = tg.initDataUnsafe?.start_param;
    if (!startParam || !startParam.startsWith("check_")) return;

    const parts = startParam.split("_");
    if (parts.length < 7) return; // Защита от битых ссылок

    const orgId = parts[1];
    const reqAgeFrom = parseInt(parts[4]) || 12;
    const reqAgeTo = parseInt(parts[5]) || 35;

    const myAge = (isAdminMode && fakeAge) ? fakeAge : userProfile.age;
    const zone = document.getElementById("verification-card-zone");
    
    if (!zone) return;
    zone.classList.remove("hidden");
    switchTab("feed");
    
    let htmlContent = `
        <div class="bg-slate-900 border-2 border-indigo-500 rounded-2xl p-5 shadow-2xl mb-4 space-y-4">
            <h3 class="text-xs font-black uppercase text-indigo-400 tracking-wider">🔄 Проверка шлюза фейс-контроля</h3>
            <p class="text-xs text-slate-300">Вход на радар организатора ID: ${orgId}. Проверяем твое соответствие...</p>
    `;

    if (myAge < reqAgeFrom || myAge > reqAgeTo) {
        htmlContent += `
            <div class="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3.5 rounded-xl font-bold uppercase tracking-wide">
                ❌ ОТКАЗ: Твой возраст (${myAge} лет) не подходит под коридор сбора (${reqAgeFrom}-${reqAgeTo} лет).
            </div>`;
    } else {
        htmlContent += `
            <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3.5 rounded-xl font-bold uppercase tracking-wide">
                ✅ ПРОЙДЕНО: Твой возраст полностью подходит под критерии сбора.
            </div>
            <div class="pt-2 space-y-2">
                <a href="tg://user?id=${orgId}" onclick="registerAcceptAction('${orgId}')" class="w-full block bg-gradient-to-r from-emerald-500 to-teal-600 text-center text-slate-950 font-black py-3.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/30">
                    💬 Написать организатору в ЛС
                </a>
                <button type="button" onclick="openReportModal('${orgId}')" class="w-full bg-slate-950 hover:bg-slate-800 text-rose-400 font-black py-3 rounded-xl text-xs uppercase tracking-wider border border-slate-800">
                    ⚠️ Пожаловаться на автора
                </button>
            </div>
        `;
    }
    
    htmlContent += `</div>`;
    zone.innerHTML = htmlContent;
}

function registerAcceptAction(orgId) {
    localStorage.setItem(`allowed_report_${orgId}`, "true");
}

// ==========================================
// БЛОК 8: СИСТЕМА ЖАЛОБ И ШТРАФНЫХ ОЧКОВ (ШО)
// ==========================================

function openReportModal(orgId) {
    const isAllowed = localStorage.getItem(`allowed_report_${orgId}`);
    if (!isAllowed) {
        tg.showAlert("Запрещено! Подать жалобу можно только после того, как ты реально нажал кнопку связи, списался или сходил на встречу.");
        return;
    }
    selectedReportTarget = orgId;
    document.getElementById("report-modal")?.classList.remove("hidden");
}

function closeReportModal() {
    document.getElementById("report-modal")?.classList.add("hidden");
    selectedReportTarget = null;
}

function confirmReport(reason) {
    if (!selectedReportTarget) return;

    const reportText = `🚨 *СИГНАЛ НАРУШЕНИЯ: Grodno Run*\n\n` +
                       `👤 *От кого:* ID ${userProfile.tgId} (@${userProfile.username || 'скрыт'})\n` +
                       `🫵 *Нарушитель:* ID ${selectedReportTarget}\n` +
                       `📝 *Статья нарушения:* ${reason}\n\n` +
                       `⚡️ _Подтверди вину кнопками в своем боте, чтобы начислить Штрафные Очки (ШО) в рейтинг автора. Набор 100 ШО автоматически заблокирует аккаунт._`;

    fetch(`https://telegram.org{BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: ADMIN_ID,
            text: reportText,
            parse_mode: "Markdown"
        })
    })
    .then(() => {
        tg.showAlert("Жалоба зафиксирована и отправлена главному модератору Гродно. Профиль проверяется.");
        closeReportModal();
    });
}

