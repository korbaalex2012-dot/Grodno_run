// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand(); // Расширяем приложение на весь экран

// Твой ID для автоматического включения админки
const ADMIN_ID = 6949963047;

// Твоя реальная ссылка на сервер Render
const BACKEND_URL = "https://onrender.com"; 

// Данные текущего пользователя из Telegram
const user = tg.initDataUnsafe?.user || { id: 0, first_name: "Тест Юзер", username: "test" };

// Проверяем, админ ли зашел в приложение
if (user.id === ADMIN_ID) {
    document.getElementById('admin-nav-btn').classList.remove('hidden');
}

// Функция переключения экранов (вкладок)
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabId).classList.add('active');
}

// Логика счетчиков парней и девушек (плюс / минус)
function changeCount(elementId, amount) {
    const el = document.getElementById(elementId);
    let current = parseInt(el.innerText);
    current += amount;
    if (current < 0) current = 0; // Меньше нуля быть не может
    el.innerText = current;
}

// Загрузка всех гулянок с сервера и отрисовка на экране
async function loadParties() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/parties`);
        const parties = await response.json();
        
        const listContainer = document.getElementById('parties-list');
        listContainer.innerHTML = '';

        if (parties.length === 0) {
            listContainer.innerHTML = '<div class="text-center text-gray-500 py-8">Пока никто не собирается. Будь первым!</div>';
            return;
        }

        parties.forEach(party => {
            const card = document.createElement('div');
            card.className = "bg-gray-800 p-4 rounded-2xl border border-gray-700 shadow-md relative";
            
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <span class="bg-yellow-500/10 text-yellow-400 text-xs px-2.5 py-1 rounded-lg font-bold">${party.tag}</span>
                    <span class="text-gray-400 text-xs">Возраст: ${party.ageMin}-${party.ageMax}</span>
                </div>
                <h3 class="text-lg font-bold text-white mb-1">📍 ${party.location}</h3>
                <p class="text-sm text-gray-400 mb-3">Организатор: @${party.creator.username} ${party.withFriend ? '(с другом)' : ''}</p>
                
                <div class="flex gap-4 text-xs font-semibold text-gray-300 bg-gray-900/50 p-2.5 rounded-xl mb-4">
                    <div>Ищут парней: <span class="text-blue-400 text-sm font-bold">${party.needBoys}</span></div>
                    <div>Ищут девушек: <span class="text-pink-400 text-sm font-bold">${party.needGirls}</span></div>
                </div>

                <div class="flex gap-2">
                    <button onclick="joinParty('${party.id}')" class="w-2/3 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-xl text-xs transition">
                        Хочу пойти
                    </button>
                    <button onclick="reportUser('${party.creator.id}', '${party.creator.username}')" class="w-1/3 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-bold py-2 rounded-xl text-xs transition border border-red-500/30">
                        ЖБ
                    </button>
                </div>
            `;
            listContainer.appendChild(card);
        });
    } catch (error) {
        console.error("Ошибка загрузки гулянок:", error);
    }
}

// Обработка отправки формы создания гулянки
document.getElementById('create-party-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const partyData = {
        location: document.getElementById('party-location').value,
        tag: document.getElementById('party-tag').value,
        ageMin: parseInt(document.getElementById('age-min').value),
        ageMax: parseInt(document.getElementById('age-max').value),
        withFriend: document.getElementById('with-friend').checked,
        needBoys: parseInt(document.getElementById('need-boys').innerText),
        needGirls: parseInt(document.getElementById('need-girls').innerText),
        creator: {
            id: user.id,
            username: user.username || "anon",
            first_name: user.first_name
        }
    };

    try {
        const response = await fetch(`${BACKEND_URL}/api/parties`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partyData)
        });

        if (response.ok) {
            tg.showAlert("Радар запущен! Твоя компания создана.");
            switchTab('feed-screen');
            loadParties();
        }
    } catch (error) {
        tg.showAlert("Не удалось создать гулянку. Проверь сервер.");
    }
});

// Функция отправки ЖБ (Жалобы)
function reportUser(userId, username) {
    const reason = prompt(`Укажите причину жалобы на @${username}:\n1 - Фейк пол/возраст\n2 - Неадекват\n3 - Слив (не пришел)`);
    if (!reason) return;

    fetch(`${BACKEND_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            targetId: userId,
            targetUsername: username,
            reporterId: user.id,
            reason: reason
        })
    }).then(res => {
        if (res.ok) tg.showAlert("Жалоба отправлена на проверку @vqc_2. Спасибо!");
    });
}

// Загрузка жалоб в Админку (работает только у тебя)
async function loadReports() {
    if (user.id !== ADMIN_ID) return;
    try {
        const response = await fetch(`${BACKEND_URL}/api/reports`);
        const reports = await response.json();
        const reportsContainer = document.getElementById('reports-list');
        reportsContainer.innerHTML = '';

        if (reports.length === 0) {
            reportsContainer.innerHTML = '<div class="text-center text-gray-500 py-8">Жалоб пока нет. На районе всё спокойно!</div>';
            return;
        }

        reports.forEach(rep => {
            const block = document.createElement('div');
            block.className = "bg-gray-800 p-4 rounded-2xl border border-red-900/50 shadow-md";
            block.innerHTML = `
                <div class="text-sm font-bold text-red-400 mb-1">Нарушитель: @${rep.targetUsername}</div>
                <p class="text-xs text-gray-400 mb-3">Причина жалобы: код причины [${rep.reason}]</p>
                <div class="flex gap-2">
                    <button onclick="adminAction('${rep.targetId}', 'ban')" class="w-1/2 bg-red-600 text-white font-bold py-1.5 rounded-lg text-xs">Бан</button>
                    <button onclick="adminAction('${rep.targetId}', 'verify')" class="w-1/2 bg-yellow-500 text-gray-950 font-bold py-1.5 rounded-lg text-xs">Проверить</button>
                </div>
            `;
            reportsContainer.appendChild(block);
        });
    } catch (err) {
        console.error(err);
    }
}

// Первичный запуск при открытии приложения
loadParties();
if (user.id === ADMIN_ID) {
    loadReports();
}
