// ========== VARIABLES GLOBALES ==========
let currentUser = null;
let money = 5000;
let streak = 0;
let bestWin = 0;
let totalSpins = 0;
let totalWins = 0;
let spinning = false;
let currentBet = null;
let lastNumber = null;
let history = [];
let spinAngle = 0;
let canvas, ctx;

// Inversiones
let investments = [
    { name: "🏪 Tienda Local", cost: 1000, invested: 0, earned: 0, rate: 0.02, lastCollect: Date.now() },
    { name: "🏭 Fábrica Digital", cost: 5000, invested: 0, earned: 0, rate: 0.05, lastCollect: Date.now() },
    { name: "🏢 Holding Corp", cost: 20000, invested: 0, earned: 0, rate: 0.12, lastCollect: Date.now() }
];

let eventTimer = 15;

// Números de la ruleta realista
const rouletteNumbers = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

function getNumberColor(num) {
    if (num === 0) return 'green';
    const reds = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    return reds.includes(num) ? 'red' : 'black';
}

// ========== FUNCIONES DE UI ==========
function updateUI() {
    document.getElementById('money').innerHTML = `$${Math.floor(money).toLocaleString()}`;
    document.getElementById('streak').innerHTML = streak;
    document.getElementById('bestWin').innerHTML = `$${bestWin.toLocaleString()}`;
    document.getElementById('totalSpins').innerHTML = totalSpins;
    
    const investDiv = document.getElementById('investments');
    if (investDiv) {
        investDiv.innerHTML = investments.map((inv, i) => `
            <div class="investment-item">
                <div>
                    <strong style="color:#44ff44">${inv.name}</strong><br>
                    <small>Invertido: $${Math.floor(inv.invested)} | Ganado: $${Math.floor(inv.earned)}</small>
                </div>
                <div>
                    <button onclick="investInBusiness(${i})" style="background:#44ff44;border:none;padding:5px 15px;border-radius:5px;font-weight:bold;cursor:pointer">
                        INVERTIR $${inv.cost}
                    </button>
                    <button onclick="collectBusiness(${i})" style="background:#ffd700;border:none;padding:5px 15px;border-radius:5px;margin-left:5px;font-weight:bold;cursor:pointer" ${inv.earned < 10 ? 'disabled' : ''}>
                        COBRAR $${Math.floor(inv.earned)}
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    if (currentUser) {
        savePlayerToCloud({
            username: currentUser,
            money: money,
            bestWin: bestWin,
            totalSpins: totalSpins,
            totalWins: totalWins,
            level: Math.floor((bestWin + totalWins) / 5000) + 1,
            avatar: '🎲'
        });
    }
}

function addHistory(text, type) {
    history.unshift({ text, type, time: new Date().toLocaleTimeString() });
    if (history.length > 15) history.pop();
    const historyDiv = document.getElementById('history');
    if (historyDiv) {
        historyDiv.innerHTML = history.map(h => `
            <div class="history-item" style="border-left-color: ${h.type === 'win' ? '#44ff44' : h.type === 'loss' ? '#ff4444' : '#ff44ff'}">
                [${h.time}] ${h.text}
            </div>
        `).join('');
    }
}

function showNotification(msg, isWin) {
    const n = document.createElement('div');
    n.className = 'notification';
    n.innerHTML = isWin ? `🎉 ${msg} 🎉` : `😰 ${msg} 😰`;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

function setQuickBet(amount) {
    document.getElementById('betAmount').value = amount;
}

function formatBetType(t, v) {
    const types = {
        'number': `Número ${v}`,
        'red': 'Rojo',
        'black': 'Negro',
        'even': 'Par',
        'odd': 'Impar',
        '1-18': '1-18',
        '19-36': '19-36',
        'dozen1': '1ra Docena (1-12)',
        'dozen2': '2da Docena (13-24)',
        'dozen3': '3ra Docena (25-36)'
    };
    return types[t] || t;
}

function placeBet(t, v = null) {
    const a = parseInt(document.getElementById('betAmount').value);
    if (isNaN(a) || a <= 0) {
        showNotification("Cantidad inválida", false);
        return false;
    }
    if (a > money) {
        showNotification("No tienes suficiente dinero", false);
        return false;
    }
    
    currentBet = { type: t, value: v, amount: a };
    
    document.querySelectorAll('.special-btn, .number-btn').forEach(btn => btn.classList.remove('selected'));
    
    if (t === 'number' && v !== null) {
        const btn = document.querySelector(`.number-btn[data-num="${v}"]`);
        if (btn) btn.classList.add('selected');
    } else {
        document.querySelectorAll(`.special-btn[data-bet="${t}"]`).forEach(btn => btn.classList.add('selected'));
    }
    
    showNotification(`Apuesta: ${formatBetType(t, v)} - $${a}`, true);
    return true;
}

function calculateWin(bet, n) {
    const c = getNumberColor(n);
    const isEven = n !== 0 && n % 2 === 0;
    const isOdd = n !== 0 && n % 2 === 1;
    
    switch(bet.type) {
        case 'number': return bet.value === n ? bet.amount * 35 : -bet.amount;
        case 'red': return c === 'red' ? bet.amount : -bet.amount;
        case 'black': return c === 'black' ? bet.amount : -bet.amount;
        case 'even': return isEven ? bet.amount : -bet.amount;
        case 'odd': return isOdd ? bet.amount : -bet.amount;
        case '1-18': return (n >= 1 && n <= 18) ? bet.amount : -bet.amount;
        case '19-36': return (n >= 19 && n <= 36) ? bet.amount : -bet.amount;
        case 'dozen1': return (n >= 1 && n <= 12) ? bet.amount * 2 : -bet.amount;
        case 'dozen2': return (n >= 13 && n <= 24) ? bet.amount * 2 : -bet.amount;
        case 'dozen3': return (n >= 25 && n <= 36) ? bet.amount * 2 : -bet.amount;
        default: return -bet.amount;
    }
}

function drawRoulette(hn = null) {
    if (!canvas) return;
    const s = canvas.width;
    const cx = s / 2;
    const cy = s / 2;
    const r = s * 0.45;
    
    ctx.clearRect(0, 0, s, s);
    
    ctx.beginPath();
    ctx.arc(cx, cy, r + 10, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    const aS = (Math.PI * 2) / rouletteNumbers.length;
    
    rouletteNumbers.forEach((num, i) => {
        const sa = i * aS + spinAngle;
        const ea = sa + aS;
        const col = getNumberColor(num);
        
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, sa, ea);
        ctx.fillStyle = col === 'red' ? '#cc0000' : col === 'green' ? '#008800' : '#111111';
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        if (hn === num) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r + 5, sa, ea);
            ctx.fillStyle = 'rgba(255,215,0,0.3)';
            ctx.fill();
        }
        
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(sa + aS / 2);
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.floor(s * 0.035)}px Arial`;
        ctx.fillText(num.toString(), r - 25, 8);
        ctx.restore();
    });
    
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = `bold ${Math.floor(s * 0.04)}px Arial`;
    ctx.fillText("🎰", cx - 12, cy + 8);
}

function spinRoulette() {
    if (!currentBet) {
        showNotification("¡Primero haz una apuesta!", false);
        return;
    }
    if (spinning) {
        showNotification("Espera a que termine el giro", false);
        return;
    }
    
    spinning = true;
    document.getElementById('spinBtn').disabled = true;
    
    const targetIndex = Math.floor(Math.random() * rouletteNumbers.length);
    const resultNumber = rouletteNumbers[targetIndex];
    let giros = 0;
    const maxGiros = 150;
    
    const intervalo = setInterval(() => {
        spinAngle += 0.2;
        drawRoulette();
        giros++;
        
        if (giros > maxGiros) {
            clearInterval(intervalo);
            const ganancia = calculateWin(currentBet, resultNumber);
            const won = ganancia > 0;
            totalSpins++;
            
            if (won) {
                money += ganancia;
                streak++;
                totalWins++;
                if (ganancia > bestWin) bestWin = ganancia;
                addHistory(`🎉 GANASTE $${ganancia} apostando a ${formatBetType(currentBet.type, currentBet.value)} (Salió ${resultNumber})`, 'win');
                showNotification(`¡GANASTE $${ganancia}! Número ${resultNumber}`, true);
            } else {
                money -= currentBet.amount;
                streak = 0;
                addHistory(`💔 PERDISTE $${currentBet.amount} (Salió ${resultNumber})`, 'loss');
                showNotification(`Perdiste $${currentBet.amount}... Salió el ${resultNumber}`, false);
            }
            
            lastNumber = resultNumber;
            const bgColor = getNumberColor(resultNumber) === 'red' ? '#cc0000' : getNumberColor(resultNumber) === 'green' ? '#008800' : '#333';
            document.getElementById('lastNumber').innerHTML = `<span style="background:${bgColor};display:inline-block;width:60px;border-radius:30px;text-align:center;padding:5px;">${resultNumber}</span>`;
            
            drawRoulette(resultNumber);
            currentBet = null;
            updateUI();
            document.querySelectorAll('.special-btn, .number-btn').forEach(btn => btn.classList.remove('selected'));
            spinning = false;
            document.getElementById('spinBtn').disabled = false;
            
            if (money <= 0) {
                showNotification("💀 ¡BANCARROTA! Inicia sesión para recuperar o reinicia", false);
                document.getElementById('spinBtn').disabled = true;
            }
        }
    }, 15);
}

// ========== INVERSIONES ==========
function investInBusiness(i) {
    const b = investments[i];
    if (money >= b.cost) {
        money -= b.cost;
        b.invested += b.cost;
        b.lastCollect = Date.now();
        b.earned = 0;
        updateUI();
        addHistory(`📈 Invertiste $${b.cost} en ${b.name}`, 'event');
        showNotification(`¡Inversión realizada en ${b.name}!`, true);
    } else {
        showNotification(`Necesitas $${b.cost} para invertir`, false);
    }
}

function collectBusiness(i) {
    const b = investments[i];
    if (b.earned > 0) {
        money += b.earned;
        addHistory(`💰 Recolectaste $${Math.floor(b.earned)} de ${b.name}`, 'win');
        showNotification(`¡Ganaste $${Math.floor(b.earned)} de tu inversión!`, true);
        b.earned = 0;
        b.lastCollect = Date.now();
        updateUI();
    }
}

function updateInvestments() {
    const ahora = Date.now();
    investments.forEach(b => {
        if (b.invested > 0) {
            const minutos = (ahora - b.lastCollect) / 60000;
            b.earned = b.invested * b.rate * minutos;
        }
    });
    updateUI();
}

function triggerRandomEvent() {
    const eventos = [
        { text: "🍀 ¡Bono de suerte! +$500", efecto: () => money += 500, tipo: 'win' },
        { text: "💸 Carterista en el casino. -$300", efecto: () => money -= 300, tipo: 'loss' },
        { text: "🎰 ¡Mini jackpot! +$1000", efecto: () => money += 1000, tipo: 'win' },
        { text: "📉 Crisis en el mercado. -15% de dinero", efecto: () => money *= 0.85, tipo: 'loss' },
        { text: "🏦 Patrocinador misterioso. +$750", efecto: () => money += 750, tipo: 'win' }
    ];
    const e = eventos[Math.floor(Math.random() * eventos.length)];
    e.efecto();
    addHistory(`🎲 EVENTO: ${e.text}`, e.tipo);
    showNotification(e.text, e.tipo === 'win');
    updateUI();
    if (money < 0) money = 0;
}

// ========== SISTEMA DE LOGIN ==========
function showLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>🔐 INICIAR SESIÓN</h2>
            <p style="color:#aaa; font-size:12px; margin-bottom:10px;">🔒 Tu contraseña está segura. Solo tú la conoces.</p>
            <input type="text" id="loginUsername" placeholder="Usuario" autocomplete="off">
            <input type="password" id="loginPassword" placeholder="Contraseña">
            <button onclick="performLogin()">Ingresar</button>
            <button onclick="this.closest('.modal').remove()" style="background:#333;">Cancelar</button>
        </div>
    `;
    document.body.appendChild(modal);
}

function showRegisterModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>📝 REGISTRARSE</h2>
            <p style="color:#aaa; font-size:12px; margin-bottom:10px;">Crea tu cuenta para competir en el ranking global</p>
            <input type="text" id="regUsername" placeholder="Usuario" autocomplete="off">
            <input type="password" id="regPassword" placeholder="Contraseña">
            <input type="password" id="regConfirm" placeholder="Confirmar contraseña">
            <button onclick="performRegister()">Registrarse</button>
            <button onclick="this.closest('.modal').remove()" style="background:#333;">Cancelar</button>
        </div>
    `;
    document.body.appendChild(modal);
}

async function performLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    const players = await fetchAllPlayers();
    
    if (players[username] && players[username].password === password) {
        currentUser = username;
        const data = players[username];
        money = data.money;
        bestWin = data.bestWin;
        totalSpins = data.totalSpins;
        totalWins = data.totalWins;
        streak = 0;
        
        updateUI();
        document.getElementById('playerName').innerHTML = `${data.avatar || '🎲'} ${username}`;
        document.getElementById('playerLevel').innerHTML = `💰 Nivel: ${data.level || 1} | 🎯 Victorias: ${totalWins}`;
        document.getElementById('playerAvatar').innerHTML = data.avatar || '🎲';
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('registerBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'block';
        document.querySelector('.modal')?.remove();
        showNotification(`🎉 ¡Bienvenido ${username}!`, true);
        updateRankingUI();
    } else {
        showNotification("❌ Usuario o contraseña incorrectos", false);
    }
}

async function performRegister() {
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirm').value;
    
    if (password !== confirm) {
        showNotification("❌ Las contraseñas no coinciden", false);
        return;
    }
    
    const players = await fetchAllPlayers();
    
    if (players[username]) {
        showNotification("❌ El usuario ya existe", false);
        return;
    }
    
    showNotification("✅ Registro exitoso. Para guardar online, se necesita configurar Google Apps Script. Por ahora tu progreso es local.", true);
    document.querySelector('.modal')?.remove();
}

function logout() {
    currentUser = null;
    document.getElementById('loginBtn').style.display = 'block';
    document.getElementById('registerBtn').style.display = 'block';
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('playerName').innerHTML = 'Desconectado';
    document.getElementById('playerLevel').innerHTML = '🌐 Conectando al servidor...';
    document.getElementById('playerAvatar').innerHTML = '👤';
    showNotification("👋 Has cerrado sesión", true);
}

// ========== INICIALIZACIÓN ==========
function init() {
    canvas = document.getElementById('rouletteCanvas');
    ctx = canvas.getContext('2d');
    
    const grid = document.getElementById('numbersGrid');
    for (let i = 0; i <= 36; i++) {
        const btn = document.createElement('button');
        btn.className = `number-btn ${getNumberColor(i)}`;
        btn.textContent = i;
        btn.setAttribute('data-num', i);
        btn.onclick = () => placeBet('number', i);
        grid.appendChild(btn);
    }
    
    document.querySelectorAll('.special-btn').forEach(btn => {
        const bt = btn.getAttribute('data-bet');
        btn.onclick = () => placeBet(bt);
    });
    
    document.getElementById('spinBtn').onclick = spinRoulette;
    drawRoulette();
    updateUI();
    updateRankingUI();
    
    setInterval(() => {
        eventTimer--;
        document.getElementById('eventTimer').innerHTML = eventTimer;
        if (eventTimer <= 0) {
            triggerRandomEvent();
            eventTimer = 20 + Math.floor(Math.random() * 15);
        }
    }, 1000);
    
    setInterval(updateInvestments, 1000);
}

init();