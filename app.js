const tg = window.Telegram.WebApp;
tg.expand();

const ADMIN_ID = 6949963047;
const BACKEND_URL = "https://onrender.com"; 

const user = tg.initDataUnsafe?.user || { id: 0, first_name: "Пользователь", username: "grodno_user" };

if (user.id === ADMIN_ID) {
    document.getElementById('admin-nav-btn').classList.remove('hidden');
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
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

        if (!parties || parties.length === 0) {
            listContainer.innerHTML = '<div class="text-center text-slate-500 py-16 text-sm font-medium bg-slate-900/40 rounded-2xl border border-slate-800/60 p-6">Никто сейчас не собирается.<br>Создай сбор первым на районе!</div>';
            return;
        }

        parties.forEach(party => {
            const card = document.createElement('div');
            card.className = "bg-slate-900/80 p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between";
            
            card.innerHTML = `
                <div class="mb-4">
                    <div class="flex justify-between items-center mb-3">
                        <span class="bg-indigo-500/10 text-indigo-400 text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-indigo-500/20">${party.tag}</span>
                        <span class="text-slate-400 text-xs font-semibold">Возраст: ${party.ageMin} - ${party.ageMax} лет</span>
                    </div>
                    <h3 class="text-xl font-black text-white tracking-tight mb-1">${party.location}</h3>
                    <p class="text-xs text-slate-400 font-medium">Организатор: @${party.creator.username} ${party.withFriend ? '<span class="text-amber-400 font-bold ml-1">(идет с другом)</span>' : ''}</p>
                </div>
                
                <div class="grid grid-cols-2 gap-3 text-center bg-slate-950/40 p-3 rounded-xl mb-4 border border-slate-800/40">
                    <div class="text-xs font-bold text-slate-400 uppercase tracking-wide">Нужно парней: <span class="text-indigo-400 block text-lg font-black mt-0.5">${party.needBoys}</span></div>
                    <div class="text-xs font-bold text-slate-400 uppercase tracking-wide">Нужно девушек: <span class="text-rose-400 block text-lg font-black mt-0.5">${party.needGirls}</span></div>
                </div>

                <div class="flex gap-2">
                    <button onclick="tg.showAlert('Вы отправили запрос на участие!')" class="w-3/4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl text-sm transition-all active:scale-95 shadow-md shadow-indigo-950">
                        Хочу пойти
                    </button>
                    <button onclick="reportUser('${party.creator.id}', '${party.creator.username}')" class="w-1/4 bg-rose-950/40 hover:bg-rose-900 text-rose-400 font-bold py-3.5 rounded-xl text-xs transition-all border border-rose-500/20">
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
        creator: {
            id: user.id,
            username: user.username || "grodno_anon",
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
            tg.showAlert("Радар запущен! Твой сбор создан в ленте.");
            switchTab('feed-screen');
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
        body: JSON.stringify({
            targetId: userId,
            targetUsername: username,
            reporterId: user.id,
            reason: reason
        })
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
            block.className = "bg-slate-900 p-4 rounded-xl border border-rose-950";
            block.innerHTML = `
                <div class="text-sm font-bold text-rose-400 mb-1">Нарушитель: @${rep.targetUsername}</div>
                <p class="text-xs text-slate-400 mb-4">Код нарушения: [${rep.reason}]</p>
                <div class="flex gap-2">
                    <button class="w-1/2 bg-rose-600 text-white font-bold py-2 rounded-lg text-xs">Бан</button>
                    <button class="w-1/2 bg-slate-700 text-slate-200 font-bold py-2 rounded-lg text-xs">Проверить</button>
                </div>
            `;
            reportsContainer.appendChild(block);
        });
    } catch (err) {
        console.error(err);
    }
}

loadParties();
