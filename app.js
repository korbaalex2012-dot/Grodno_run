const tg = window.Telegram.WebApp;
tg.expand();

const ADMIN_ID = 6949963047;
const BACKEND_URL = "https://onrender.com"; 

const user = tg.initDataUnsafe?.user || { id: 0, first_name: "Пользователь", username: "grodno_user" };

let userGender = "";
let userAge = 0;

// Логика авторизационного экрана при самом первом входе
function setAuthGender(gender) {
    userGender = gender;
    document.getElementById('gender-male').classList.remove('bg-indigo-600');
    document.getElementById('gender-female').classList.remove('bg-indigo-600');
    if (gender === 'Парень') document.getElementById('gender-male').classList.add('bg-indigo-600');
    if (gender === 'Девушка') document.getElementById('gender-female').classList.add('bg-indigo-600');
}

function submitAuth() {
    const ageInput = document.getElementById('user-age').value;
    if (!userGender) {
        tg.showAlert("Выбери свой пол!");
        return;
    }
    if (!ageInput || ageInput < 12 || ageInput > 35) {
        tg.showAlert("Укажи реальный возраст (от 12 до 35)!");
        return;
    }

    userAge = parseInt(ageInput);
    
    // Прячем экран регистрации, показываем само приложение
    document.getElementById('auth-screen').classList.remove('active');
    document.getElementById('main-app').classList.remove('hidden');
    
    if (user.id === ADMIN_ID) {
        document.getElementById('admin-nav-btn').classList.remove('hidden');
    }

    switchTab('feed-screen');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const target = document.getElementById(tabId);
    if(target) target.classList.add('active');
    
    if (tabId === 'feed-screen') loadParties();
    if (tabId === 'admin-screen') loadReports();
}

function changeCount(elementId, amount) {
    const el = document.getElementById(elementId);
    let current = parseInt(el.innerText);
    current += amount;
    if (current < 0) current = 0;
    el.innerText = current;
}
async function loadParties() {
    try {
        const response = await fetch(`${BACKEND_URL}/api/parties`);
        const parties = await response.json();
        const listContainer = document.getElementById('parties-list');
        listContainer.innerHTML = '';

        // Подросткам (<18) показываем только подростков, взрослым (18+) — только взрослых
        const filteredParties = parties.filter(party => {
            const isOrganisatorAdult = party.creatorAge >= 18;
            const isUserAdult = userAge >= 18;
            return isUserAdult === isOrganisatorAdult;
        });

        if (!filteredParties || filteredParties.length === 0) {
            listContainer.innerHTML = '<div class="text-center text-gray-500 py-16 text-sm font-medium bg-gray-900 p-6 rounded-2xl border border-gray-800">Для твоего возраста сейчас нет сборов.<br>Создай свой первый сбор на районе!</div>';
            return;
        }

        filteredParties.forEach(party => {
            const card = document.createElement('div');
            card.className = "bg-gray-900 p-5 rounded-2xl border border-gray-800 shadow-xl flex flex-col justify-between mb-4";
            
            card.innerHTML = `
                <div class="mb-4">
                    <div class="flex justify-between items-center mb-3">
                        <span class="bg-indigo-500 bg-opacity-20 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider">${party.tag}</span>
                        <span class="text-gray-400 text-xs font-semibold">Возраст: ${party.ageMin} - ${party.ageMax} лет</span>
                    </div>
                    <h3 class="text-xl font-black text-white tracking-tight mb-1">${party.location}</h3>
                    <p class="text-xs text-gray-400 font-medium">Организатор: @${party.creator.username} (${party.creatorAge} лет) ${party.withFriend ? '<span class="text-yellow-400 font-bold ml-1">(идет с другом)</span>' : ''}</p>
                </div>
                
                <div class="grid grid-cols-2 gap-3 text-center bg-gray-950 p-3 rounded-xl mb-4 border border-gray-800">
                    <div class="text-xs font-bold text-gray-400 uppercase tracking-wide">Нужно парней: <span class="text-blue-400 block text-lg font-black mt-0.5">${party.needBoys}</span></div>
                    <div class="text-xs font-bold text-gray-400 uppercase tracking-wide">Нужно девушек: <span class="text-pink-400 block text-lg font-black mt-0.5">${party.needGirls}</span></div>
                </div>

                <div class="flex gap-2">
                    <button onclick="tg.showAlert('Запрос отправлен организатору!')" class="w-3/4 bg-indigo-600 text-white font-bold py-3.5 rounded-xl text-sm transition-all active:scale-95 shadow-md">
                        Хочу пойти
                    </button>
                    <button onclick="reportUser('${party.creator.id}', '${party.creator.username}')" class="w-1/4 bg-red-900 bg-opacity-20 text-red-400 font-bold py-3.5 rounded-xl text-xs border border-red-500/20">
                        ЖБ
                    </button>
                </div>
            `;
            listContainer.appendChild(card);
        });
    } catch (error) {
        console.error(error);
    }
}

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
        creatorAge: userAge,
        creator: { id: user.id, username: user.username || "grodno_anon", first_name: user.first_name }
    };

    try {
        const response = await fetch(`${BACKEND_URL}/api/parties`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partyData)
        });

        if (response.ok) {
            tg.showAlert("Радар запущен! Твой сбор создан в ленте.");
            switchTab('feed-screen');
        } else {
            tg.showAlert("Ошибка при публикации сбора.");
        }
    } catch (error) {
        tg.showAlert("Ошибка соединения с сервером.");
    }
});

function reportUser(userId, username) {
    const reason = prompt(`Причина жалобы на @${username}:\n1 - Не тот возраст/пол\n2 - Токсичность\n3 - Слив встречи`);
    if (!reason) return;

    fetch(`${BACKEND_URL}/api/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: userId, targetUsername: username, reporterId: user.id, reason: reason })
    }).then(res => {
        if (res.ok) tg.showAlert("Жалоба принята. Модератор проверит аккаунт.");
    });
}

async function loadReports() {
    if (user.id !== ADMIN_ID) return;
    try {
        const response = await fetch(`${BACKEND_URL}/api/reports`);
        const reports = await response.json();
        const reportsContainer = document.getElementById('reports-list');
        reportsContainer.innerHTML = '';

        if (!reports || reports.length === 0) {
            reportsContainer.innerHTML = '<div class="text-center text-slate-500 py-12 text-sm">Жалоб нет. На районе всё спокойно!</div>';
            return;
        }

        reports.forEach(rep => {
            const block = document.createElement('div');
            block.className = "bg-gray-900 p-4 rounded-xl border border-red-900";
            block.innerHTML = `
                <div class="text-sm font-bold text-red-400 mb-1">Нарушитель: @${rep.targetUsername}</div>
                <p class="text-xs text-slate-400 mb-4">Код нарушения: [${rep.reason}]</p>
                <div class="flex gap-2">
                    <button class="w-1/2 bg-red-600 text-white font-bold py-2 rounded-lg text-xs">Бан</button>
                    <button class="w-1/2 bg-slate-700 text-slate-200 font-bold py-2 rounded-lg text-xs">Проверить</button>
                </div>
            `;
            reportsContainer.appendChild(block);
        });
    } catch (err) {
        console.error(err);
    }
}
