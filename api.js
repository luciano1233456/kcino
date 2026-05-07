// ========== CONFIGURACIÓN ==========
const SHEET_URL = "https://api.sheetbest.com/sheets/1e60ff71-2615-40e7-a51c-b20fd572a616";

// ========== VARIABLES GLOBALES ==========
window.currentUser = null;
window.money = 5000;
window.streak = 0;
window.bestWin = 0;
window.totalSpins = 0;
window.totalWins = 0;
window.investments = [];
window.duelMode = false;
window.activeDuel = null;
window.lastDiceRoll = 0;

// ========== API FUNCTIONS ==========
async function fetchAllPlayers() {
    try {
        const response = await fetch(SHEET_URL + "?t=" + Date.now());
        return await response.json();
    } catch(error) { return []; }
}

async function updatePlayer(username, updates) {
    try {
        await fetch(`${SHEET_URL}/username/${encodeURIComponent(username)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        return true;
    } catch(error) { return false; }
}

async function saveOnline() {
    if (!window.currentUser) return;
    await updatePlayer(window.currentUser, {
        money: window.money,
        bestWin: window.bestWin,
        totalSpins: window.totalSpins,
        totalWins: window.totalWins,
        level: Math.floor((window.bestWin + window.totalWins) / 5000) + 1,
        streak: window.streak,
        investments: JSON.stringify(window.investments)
    });
}

async function updateRankingUI() {
    const players = await fetchAllPlayers();
    const ranking = [...players].sort((a,b) => (b.money || 0) - (a.money || 0)).slice(0, 15);
    const rankingHTML = ranking.map((p, i) => `
        <div class="ranking-item">
            <span class="rank">${i===0?'👑':i===1?'🥈':i===2?'🥉':`#${i+1}`}</span>
            <span class="name">${p.avatar||'🎲'} ${p.username} ${p.username===window.currentUser?'✨':''}</span>
            <span class="score">💰 $${(p.money||0).toLocaleString()}</span>
            <span class="level">🎯 Nv.${p.level||1}</span>
        </div>
    `).join('');
    document.getElementById('rankingList').innerHTML = rankingHTML || '<div>Aún no hay jugadores</div>';
    document.getElementById('rankingStatus').innerHTML = `✅ ${players.length} jugadores activos`;
}

function showNotification(msg, isWin) {
    const n = document.createElement('div');
    n.className = 'notification';
    n.innerHTML = isWin ? `🎉 ${msg}` : `😰 ${msg}`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

function addHistory(text, type) {
    if (!window.historyList) window.historyList = [];
    window.historyList.unshift({ text, type, time: new Date().toLocaleTimeString() });
    if (window.historyList.length > 20) window.historyList.pop();
    const historyDiv = document.getElementById('history');
    if (historyDiv) {
        historyDiv.innerHTML = window.historyList.map(h => `<div class="history-item" style="border-left-color:${h.type==='win'?'#44ff44':h.type==='loss'?'#ff4444':'#ff44ff'}">[${h.time}] ${h.text}</div>`).join('');
    }
}

function showSaving() {
    const indicator = document.getElementById('savingIndicator');
    indicator.innerHTML = '💾 Guardando...';
    setTimeout(() => { if(indicator) indicator.innerHTML = '✅ Sincronizado'; }, 1000);
}