// ========== VARIABLES DEL JUEGO ==========
let spinning = false;
let currentBet = null;
let spinAngle = 0;
let canvas, ctx;

const rouletteNumbers = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];

function getNumberColor(num) {
    if (num === 0) return 'green';
    const reds = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    return reds.includes(num) ? 'red' : 'black';
}

function updateUI() {
    document.getElementById('money').innerHTML = `$${Math.floor(window.money).toLocaleString()}`;
    document.getElementById('streak').innerHTML = window.streak;
    document.getElementById('bestWin').innerHTML = `$${window.bestWin.toLocaleString()}`;
    document.getElementById('totalSpins').innerHTML = window.totalSpins;
    
    const investSection = document.getElementById('investmentsSection');
    if (investSection) investSection.style.display = window.duelMode ? 'none' : 'block';
    
    if (!window.duelMode) {
        const investDiv = document.getElementById('investments');
        if (investDiv && window.investments) {
            investDiv.innerHTML = window.investments.map((inv, i) => `
                <div class="investment-item">
                    <div><strong style="color:#44ff44">${inv.name}</strong><br><small style="color:#aaa;">💰 Invertido: $${Math.floor(inv.invested)} | 📈 Ganado: $${Math.floor(inv.earned)}</small></div>
                    <div><button onclick="investInBusiness(${i})">💸 INVERTIR $${inv.cost}</button><button onclick="collectBusiness(${i})" ${inv.earned<10?'disabled':''}>💵 COBRAR $${Math.floor(inv.earned)}</button></div>
                </div>
            `).join('');
        }
    }
}

function setBet(amount) { 
    document.getElementById('betAmount').value = Math.min(amount, window.money); 
}

function formatBetType(t, v) {
    const types = { 'number': `Número ${v}`, 'red': 'Rojo', 'black': 'Negro', 'even': 'Par', 'odd': 'Impar', 
                    '1-18': '1-18', '19-36': '19-36', 'dozen1': '1ra Docena', 'dozen2': '2da Docena', 'dozen3': '3ra Docena' };
    return types[t] || t;
}

function placeBet(t, v = null) {
    let a = parseInt(document.getElementById('betAmount').value);
    if (isNaN(a) || a <= 0) { showNotification("❌ Cantidad inválida", false); return; }
    if (a > window.money) { showNotification("❌ No tienes suficiente dinero", false); return; }
    currentBet = { type: t, value: v, amount: a };
    document.querySelectorAll('.num-btn, .special').forEach(btn => btn.classList.remove('selected'));
    if (t === 'number' && v !== null) document.querySelector(`.num-btn[data-num="${v}"]`)?.classList.add('selected');
    else document.querySelectorAll(`.special[data-bet="${t}"]`).forEach(btn => btn.classList.add('selected'));
    showNotification(`✅ Apuesta: ${formatBetType(t, v)} - $${a}`, true);
}

function calculateWin(bet, n) {
    const c = getNumberColor(n), isEven = n!==0 && n%2===0, isOdd = n!==0 && n%2===1;
    switch(bet.type) {
        case 'number': return bet.value === n ? bet.amount * 35 : -bet.amount;
        case 'red': return c === 'red' ? bet.amount : -bet.amount;
        case 'black': return c === 'black' ? bet.amount : -bet.amount;
        case 'even': return isEven ? bet.amount : -bet.amount;
        case 'odd': return isOdd ? bet.amount : -bet.amount;
        case '1-18': return (n>=1 && n<=18) ? bet.amount : -bet.amount;
        case '19-36': return (n>=19 && n<=36) ? bet.amount : -bet.amount;
        case 'dozen1': return (n>=1 && n<=12) ? bet.amount * 2 : -bet.amount;
        case 'dozen2': return (n>=13 && n<=24) ? bet.amount * 2 : -bet.amount;
        case 'dozen3': return (n>=25 && n<=36) ? bet.amount * 2 : -bet.amount;
        default: return -bet.amount;
    }
}

function drawRoulette(highlight = null) {
    if (!canvas || !ctx) return;
    const size = canvas.width, cx = size/2, cy = size/2, radius = size * 0.42;
    ctx.clearRect(0,0,size,size);
    ctx.beginPath(); ctx.arc(cx,cy,radius+15,0,Math.PI*2); ctx.fillStyle='#0a0a0a'; ctx.fill(); ctx.strokeStyle='#ffd700'; ctx.lineWidth=2; ctx.stroke();
    const angleStep = (Math.PI*2)/rouletteNumbers.length;
    for(let i=0;i<rouletteNumbers.length;i++){
        const num = rouletteNumbers[i], start = i*angleStep+spinAngle, end = start+angleStep, color = getNumberColor(num);
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,radius,start,end);
        ctx.fillStyle = color==='red'?'#cc0000':color==='green'?'#008800':'#2a2a2a'; ctx.fill();
        ctx.strokeStyle='#ffd700'; ctx.lineWidth=1; ctx.stroke();
        if(highlight===num){ ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,radius+8,start,end); ctx.fillStyle='rgba(255,215,0,0.3)'; ctx.fill(); }
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(start+angleStep/2); ctx.fillStyle='white'; ctx.font=`bold ${Math.floor(size*0.03)}px Arial`; ctx.fillText(num.toString(),radius-20,8); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(cx,cy,22,0,Math.PI*2); ctx.fillStyle='#ffd700'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx,cy,18,0,Math.PI*2); ctx.fillStyle='#1a1a1a'; ctx.fill();
    ctx.fillStyle='#ffd700'; ctx.font='bold 20px Arial'; ctx.fillText("🎰",cx-12,cy+7);
}

function updateLastNumberDisplay(number) {
    const color = getNumberColor(number);
    const bgColor = color==='red'?'#cc0000':color==='green'?'#008800':'#2a2a2a';
    const span = document.getElementById('lastNumber');
    span.style.backgroundColor = bgColor;
    span.style.color = 'white';
    span.innerHTML = number;
}

async function spinRoulette() {
    if (!currentBet) { showNotification("❌ ¡Primero haz una apuesta!", false); return; }
    if (spinning) { showNotification("⏳ Espera...", false); return; }
    if (window.money <= 0) { showNotification("💀 ¡No tienes dinero!", false); return; }
    spinning = true; document.getElementById('spinBtn').disabled = true;
    const result = rouletteNumbers[Math.floor(Math.random() * rouletteNumbers.length)];
    const winAmount = calculateWin(currentBet, result);
    const won = winAmount > 0;
    let giros = 0;
    const interval = setInterval(async () => {
        spinAngle += 0.25; drawRoulette(); giros++;
        if (giros > 25) {
            clearInterval(interval);
            window.totalSpins++;
            if (won) {
                window.money += winAmount; window.streak++; window.totalWins++;
                if (winAmount > window.bestWin) window.bestWin = winAmount;
                addHistory(`🎉 GANASTE $${winAmount.toLocaleString()} (Salió ${result})`, 'win');
                showNotification(`🎉 ¡GANASTE $${winAmount.toLocaleString()}! Número ${result}`, true);
            } else {
                window.money -= currentBet.amount; window.streak = 0;
                addHistory(`💔 PERDISTE $${currentBet.amount.toLocaleString()} (Salió ${result})`, 'loss');
                showNotification(`😰 Perdiste $${currentBet.amount.toLocaleString()}... Salió ${result}`, false);
            }
            if (window.money < 0) window.money = 0;
            updateLastNumberDisplay(result);
            drawRoulette(result);
            currentBet = null;
            updateUI();
            await saveOnline();
            document.querySelectorAll('.num-btn, .special').forEach(btn => btn.classList.remove('selected'));
            spinning = false; document.getElementById('spinBtn').disabled = false;
            if (window.money <= 0) { showNotification("💀 ¡BANCARROTA!", false); document.getElementById('spinBtn').disabled = true; }
            
            if (window.duelMode && window.activeDuel) {
                const profit = window.money - window.activeDuel.startMoney;
                document.getElementById('duelProfitInfo').innerHTML = `🎯 Tu ganancia: $${profit} | Objetivo: $20,000`;
                if (profit >= 20000) window.finalizarDuelo(window.currentUser);
            }
        }
    }, 40);
}

async function investInBusiness(i) {
    if (window.duelMode) { showNotification("❌ En modo duelo no hay inversiones", false); return; }
    const b = window.investments[i];
    if (window.money >= b.cost) {
        window.money -= b.cost; b.invested += b.cost; b.lastCollect = Date.now(); b.earned = 0;
        updateUI(); await saveOnline();
        addHistory(`📈 Invertiste $${b.cost.toLocaleString()} en ${b.name}`, 'event');
        showNotification(`✅ ¡Inversión realizada!`, true);
    } else showNotification(`❌ Necesitas $${b.cost.toLocaleString()}`, false);
}

async function collectBusiness(i) {
    if (window.duelMode) { showNotification("❌ En modo duelo no hay inversiones", false); return; }
    const b = window.investments[i];
    if (b.earned > 0) {
        const ganancia = Math.floor(b.earned);
        window.money += ganancia;
        addHistory(`💰 Recolectaste $${ganancia.toLocaleString()} de ${b.name}`, 'win');
        showNotification(`💰 ¡Ganaste $${ganancia.toLocaleString()}!`, true);
        b.earned = 0; b.lastCollect = Date.now();
        updateUI(); await saveOnline();
    }
}

function updateInvestments() {
    if (window.duelMode) return;
    const now = Date.now();
    window.investments.forEach(b => { if (b.invested > 0) b.earned = b.invested * b.rate * ((now - b.lastCollect) / 60000); });
    updateUI();
}

// Exponer funciones globalmente
window.setBet = setBet;
window.placeBet = placeBet;
window.updateUI = updateUI;
window.investInBusiness = investInBusiness;
window.collectBusiness = collectBusiness;