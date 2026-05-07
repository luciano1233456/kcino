// ========== AUTH FUNCTIONS ==========
function getDefaultInvestments() {
    return [
        { name: "🏪 Tienda Local", cost: 1000, invested: 0, earned: 0, rate: 0.02, lastCollect: Date.now() },
        { name: "🏭 Fábrica Digital", cost: 5000, invested: 0, earned: 0, rate: 0.05, lastCollect: Date.now() },
        { name: "🏢 Holding Corp", cost: 20000, invested: 0, earned: 0, rate: 0.12, lastCollect: Date.now() }
    ];
}

async function login(username, password) {
    const players = await fetchAllPlayers();
    const player = players.find(p => p.username === username && p.password === password);
    if (player) {
        window.currentUser = username;
        window.money = player.money || 5000;
        window.bestWin = player.bestWin || 0;
        window.totalSpins = player.totalSpins || 0;
        window.totalWins = player.totalWins || 0;
        window.streak = player.streak || 0;
        try { window.investments = JSON.parse(player.investments); } catch(e) { window.investments = getDefaultInvestments(); }
        if (!window.investments || window.investments.length !== 3) window.investments = getDefaultInvestments();
        
        updateUI();
        updateUserDisplay();
        showNotification(`🎉 ¡Bienvenido ${username}!`, true);
        if (window.updateOpponentList) window.updateOpponentList();
        return true;
    }
    showNotification("❌ Usuario o contraseña incorrectos", false);
    return false;
}

async function register(username, password) {
    if (username.length < 3) { showNotification("❌ Usuario mínimo 3 caracteres", false); return false; }
    if (password.length < 3) { showNotification("❌ Contraseña mínimo 3 caracteres", false); return false; }
    
    const players = await fetchAllPlayers();
    if (players.some(p => p.username === username)) { 
        showNotification("❌ El usuario ya existe", false); 
        return false; 
    }
    
    await fetch(SHEET_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ 
            username, password, 
            money: 5000, bestWin: 0, totalSpins: 0, totalWins: 0, level: 1, streak: 0, 
            avatar: '🎲', 
            investments: JSON.stringify(getDefaultInvestments()) 
        }])
    });
    showNotification("✅ ¡Registro exitoso! Ahora inicia sesión", true);
    return true;
}

function logout() {
    if (window.currentUser) saveOnline();
    window.currentUser = null;
    window.money = 5000; window.streak = 0; window.bestWin = 0; window.totalSpins = 0; window.totalWins = 0;
    window.investments = getDefaultInvestments();
    window.duelMode = false;
    window.activeDuel = null;
    updateUI(); updateUserDisplay();
    showNotification("👋 Has cerrado sesión", true);
    if (document.getElementById('duelActionsPanel')) document.getElementById('duelActionsPanel').style.display = 'none';
    if (document.getElementById('challengeBtn')) document.getElementById('challengeBtn').disabled = false;
}

function updateUserDisplay() {
    if (window.currentUser) {
        document.getElementById('username').innerHTML = `🎲 ${window.currentUser}`;
        document.getElementById('userStats').innerHTML = `🌍 ONLINE | Nivel: ${Math.floor((window.bestWin+window.totalWins)/5000)+1} | 🎯 Victorias: ${window.totalWins}`;
        document.getElementById('avatar').innerHTML = '🎲';
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('registerBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'block';
    } else {
        document.getElementById('username').innerHTML = '🌐 Desconectado';
        document.getElementById('userStats').innerHTML = '🔐 Inicia sesión para jugar';
        document.getElementById('avatar').innerHTML = '🌐';
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('registerBtn').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'none';
    }
}

function showLogin() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>🔐 INICIAR SESIÓN</h2>
            <input type="text" id="loginUser" placeholder="Usuario">
            <input type="password" id="loginPass" placeholder="Contraseña">
            <button onclick="doLogin()">Ingresar</button>
            <button onclick="this.closest('.modal').remove()">Cancelar</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function showRegister() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>📝 REGISTRARSE</h2>
            <input type="text" id="regUser" placeholder="Usuario (mínimo 3)">
            <input type="password" id="regPass" placeholder="Contraseña (mínimo 3)">
            <input type="password" id="regConfirm" placeholder="Confirmar">
            <button onclick="doRegister()">Registrarse</button>
            <button onclick="this.closest('.modal').remove()">Cancelar</button>
        </div>
    `;
    document.body.appendChild(modal);
}

async function doLogin() {
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPass').value;
    if (await login(user, pass)) { 
        document.querySelector('.modal')?.remove(); 
        updateRankingUI(); 
    }
}

async function doRegister() {
    const user = document.getElementById('regUser').value.trim();
    const pass = document.getElementById('regPass').value;
    const confirm = document.getElementById('regConfirm').value;
    if (pass !== confirm) { showNotification("❌ Contraseñas no coinciden", false); return; }
    if (await register(user, pass)) document.querySelector('.modal')?.remove();
}

// Exponer funciones globalmente
window.showLogin = showLogin;
window.showRegister = showRegister;
window.logout = logout;