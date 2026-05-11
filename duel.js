// ========== SISTEMA 1VS1 CON SALA DE ESPERA ==========
// Este script se ejecuta junto al principal y añade la funcionalidad de duelos

(function() {
    // Variables del sistema de duelos
    let waitingPlayers = [];     // Lista de jugadores esperando duelo
    let currentDuel = null;      // Duelo activo del usuario actual
    let duelInterval = null;
    let isInDuel = false;
    let currentGame = null;
    
    // Referencias a variables globales del juego principal
    let getMoney = () => window.money || 0;
    let setMoney = (value) => { if (window.money !== undefined) window.money = value; };
    let saveGame = () => { if (window.saveOnline) window.saveOnline(); };
    let showNotif = (msg, isWin) => { if (window.showNotification) window.showNotification(msg, isWin); };
    let addHistoryLog = (text, type) => { if (window.addHistory) window.addHistory(text, type); };
    let updateUI = () => { if (window.updateUI) window.updateUI(); };
    let getCurrentUser = () => window.currentUser || null;
    
    // Crear la interfaz de sala de espera
    function createDuelLobby() {
        const duelSection = document.createElement('div');
        duelSection.id = 'duelLobby';
        duelSection.style.cssText = `
            background: linear-gradient(135deg, #1a0a2a, #0a051a);
            border-radius: 20px;
            padding: 20px;
            margin-bottom: 25px;
            border: 2px solid #ff44ff;
        `;
        duelSection.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="color: #ff44ff; margin: 0;">⚔️ ARENA 1VS1 ⚔️</h3>
                <button id="enterDuelQueueBtn" style="background: #ff44ff; color: #000; padding: 10px 20px; border-radius: 10px; font-weight: bold;">🔍 ENTRAR A SALA DE ESPERA</button>
                <button id="leaveDuelQueueBtn" style="background: #ff4444; color: #fff; padding: 10px 20px; border-radius: 10px; display: none;">❌ SALIR DE SALA</button>
            </div>
            <div id="waitingRoom" style="background: #0a0a0a; border-radius: 15px; padding: 15px;">
                <div style="color: #ffd700; margin-bottom: 10px;">👥 JUGADORES ESPERANDO PELEA:</div>
                <div id="waitingPlayersList" style="min-height: 60px; color: #aaa; font-size: 14px;">No hay nadie esperando</div>
                <div id="duelQueueStatus" style="color: #ff44ff; font-size: 12px; margin-top: 10px;"></div>
            </div>
            <div id="duelChallenge" style="display: none; background: #1a1a1a; border-radius: 15px; padding: 15px; margin-top: 15px; border: 1px solid #ffd700;">
                <div style="color: #ffd700; margin-bottom: 10px;">🎯 ¡TE HAN DESAFIADO!</div>
                <div id="challengeInfo"></div>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button id="acceptDuelBtn" style="background: #44ff44; color: #000;">✅ ACEPTAR</button>
                    <button id="rejectDuelBtn" style="background: #ff4444; color: #fff;">❌ RECHAZAR</button>
                </div>
            </div>
        `;
        
        // Insertar después del auth-section
        const authSection = document.querySelector('.auth-section');
        if (authSection && authSection.parentNode) {
            authSection.parentNode.insertBefore(duelSection, authSection.nextSibling);
        }
        
        // Eventos
        document.getElementById('enterDuelQueueBtn').onclick = enterDuelQueue;
        document.getElementById('leaveDuelQueueBtn').onclick = leaveDuelQueue;
        document.getElementById('acceptDuelBtn').onclick = acceptDuel;
        document.getElementById('rejectDuelBtn').onclick = rejectDuel;
    }
    
    // Entrar a la sala de espera
    async function enterDuelQueue() {
        const user = getCurrentUser();
        if (!user) {
            showNotif("❌ Inicia sesión para jugar 1vs1", false);
            return;
        }
        
        const currentMoney = getMoney();
        if (currentMoney < 5000) {
            showNotif("❌ Necesitas al menos $5000 para jugar 1vs1", false);
            return;
        }
        
        const stake = prompt("💰 ¿Cuánto quieres apostar? (Mínimo $500)", "1000");
        if (!stake) return;
        const stakeAmount = parseInt(stake);
        if (isNaN(stakeAmount) || stakeAmount < 500) {
            showNotif("❌ La apuesta mínima es $500", false);
            return;
        }
        if (stakeAmount > currentMoney) {
            showNotif("❌ No tienes suficiente dinero", false);
            return;
        }
        
        // Verificar si ya está en la lista
        if (waitingPlayers.find(p => p.username === user)) {
            showNotif("❌ Ya estás en la sala de espera", false);
            return;
        }
        
        // Añadir a la sala
        waitingPlayers.push({
            username: user,
            stake: stakeAmount,
            timestamp: Date.now()
        });
        
        updateWaitingRoomDisplay();
        document.getElementById('enterDuelQueueBtn').style.display = 'none';
        document.getElementById('leaveDuelQueueBtn').style.display = 'block';
        document.getElementById('duelQueueStatus').innerHTML = `✅ Esperando rival... (Apuesta: $${stakeAmount.toLocaleString()})`;
        
        showNotif(`✅ Has entrado a la sala con apuesta de $${stakeAmount.toLocaleString()}`, true);
        
        // Intentar emparejar
        tryMatchDuel();
    }
    
    // Salir de la sala
    function leaveDuelQueue() {
        const user = getCurrentUser();
        if (!user) return;
        
        waitingPlayers = waitingPlayers.filter(p => p.username !== user);
        updateWaitingRoomDisplay();
        document.getElementById('enterDuelQueueBtn').style.display = 'block';
        document.getElementById('leaveDuelQueueBtn').style.display = 'none';
        document.getElementById('duelQueueStatus').innerHTML = '';
        showNotif("❌ Has salido de la sala de espera", false);
    }
    
    // Actualizar visualización de la sala
    function updateWaitingRoomDisplay() {
        const container = document.getElementById('waitingPlayersList');
        if (!container) return;
        
        if (waitingPlayers.length === 0) {
            container.innerHTML = 'No hay nadie esperando';
            return;
        }
        
        container.innerHTML = waitingPlayers.map(p => `
            <div style="display: inline-block; background: #1a1a1a; padding: 5px 12px; border-radius: 20px; margin: 5px; border: 1px solid #ff44ff;">
                🎲 ${p.username} - 💰 $${p.stake.toLocaleString()}
            </div>
        `).join('');
    }
    
    // Intentar emparejar jugadores
    async function tryMatchDuel() {
        if (waitingPlayers.length < 2) return;
        
        const user = getCurrentUser();
        if (!user) return;
        
        // Buscar un rival diferente al usuario actual
        const currentPlayer = waitingPlayers.find(p => p.username === user);
        if (!currentPlayer) return;
        
        // Buscar otro jugador con apuesta similar (o la misma)
        const potentialRival = waitingPlayers.find(p => p.username !== user && Math.abs(p.stake - currentPlayer.stake) <= 500);
        
        if (potentialRival) {
            // Remover ambos de la sala
            waitingPlayers = waitingPlayers.filter(p => p.username !== user && p.username !== potentialRival.username);
            updateWaitingRoomDisplay();
            
            // Iniciar duelo
            startDuelMatch(currentPlayer, potentialRival);
        }
    }
    
    // Iniciar el duelo
    async function startDuelMatch(player1, player2) {
        const user = getCurrentUser();
        const isChallenger = (user === player1.username);
        const myStake = isChallenger ? player1.stake : player2.stake;
        const opponent = isChallenger ? player2.username : player1.username;
        const opponentStake = isChallenger ? player2.stake : player1.stake;
        
        // Verificar que el jugador actual tiene suficiente dinero
        if (getMoney() < myStake) {
            showNotif(`❌ No tienes suficiente dinero para la apuesta de $${myStake.toLocaleString()}`, false);
            leaveDuelQueue();
            return;
        }
        
        // Descontar la apuesta
        window.money -= myStake;
        if (window.money < 0) window.money = 0;
        updateUI();
        await saveGame();
        
        isInDuel = true;
        currentDuel = {
            opponent: opponent,
            stake: myStake,
            opponentStake: opponentStake,
            inProgress: true
        };
        
        // Mostrar modal de juego
        showDuelGame(opponent, myStake);
    }
    
    // Mostrar el juego de Mayor o Menor
    function showDuelGame(opponent, stake) {
        // Crear modal si no existe
        let modal = document.getElementById('duelGameModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'duelGameModal';
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.98); display: flex; align-items: center;
                justify-content: center; z-index: 2000;
            `;
            document.body.appendChild(modal);
        }
        
        const currentCard = Math.floor(Math.random() * 13) + 1;
        currentGame = {
            opponent: opponent,
            stake: stake,
            currentCard: currentCard,
            gameActive: true
        };
        
        modal.innerHTML = `
            <div style="background: #1a1a1a; border-radius: 30px; padding: 30px; max-width: 450px; width: 90%; text-align: center; border: 3px solid #ff44ff;">
                <h2 style="color: #ff44ff; margin-bottom: 10px;">⚔️ DUELO VS ${opponent} ⚔️</h2>
                <p style="color: #ffd700; margin-bottom: 20px;">💰 Apuesta: $${stake.toLocaleString()}</p>
                <div style="background: #0a0a0a; border-radius: 20px; padding: 30px;">
                    <div style="color: #aaa; margin-bottom: 10px;">Tu carta actual:</div>
                    <div style="font-size: 80px; font-weight: bold; background: #1a1a1a; padding: 20px; border-radius: 20px; margin-bottom: 20px;" id="duelCard">${getCardDisplay(currentCard)}</div>
                    <div style="color: #ffd700; margin-bottom: 20px;">¿La siguiente carta será MAYOR o MENOR?</div>
                    <div style="display: flex; gap: 20px; justify-content: center;">
                        <button id="duelHigherBtn" style="background: #44ff44; color: #000; padding: 15px 35px; font-size: 20px; border-radius: 50px; cursor: pointer;">⬆️ MAYOR</button>
                        <button id="duelLowerBtn" style="background: #ff4444; color: #fff; padding: 15px 35px; font-size: 20px; border-radius: 50px; cursor: pointer;">⬇️ MENOR</button>
                    </div>
                </div>
                <button id="closeDuelModal" style="margin-top: 20px; background: #333; color: #fff; padding: 8px 20px; border-radius: 10px;">Cerrar</button>
            </div>
        `;
        
        modal.style.display = 'flex';
        
        document.getElementById('duelHigherBtn').onclick = () => makeDuelGuess('higher');
        document.getElementById('duelLowerBtn').onclick = () => makeDuelGuess('lower');
        document.getElementById('closeDuelModal').onclick = () => {
            modal.style.display = 'none';
            isInDuel = false;
            currentDuel = null;
            currentGame = null;
        };
    }
    
    function getCardDisplay(num) {
        const faces = {1:'A',11:'J',12:'Q',13:'K'};
        return faces[num] || num;
    }
    
    async function makeDuelGuess(guess) {
        if (!currentGame || !currentGame.gameActive) return;
        
        currentGame.gameActive = false;
        const nextCard = Math.floor(Math.random() * 13) + 1;
        let won = false;
        
        if (guess === 'higher' && nextCard > currentGame.currentCard) won = true;
        if (guess === 'lower' && nextCard < currentGame.currentCard) won = true;
        
        const stake = currentGame.stake;
        const modal = document.getElementById('duelGameModal');
        
        if (won) {
            const winAmount = stake * 2;
            window.money += winAmount;
            if (window.bestWin && winAmount > window.bestWin) window.bestWin = winAmount;
            if (window.totalWins) window.totalWins++;
            updateUI();
            await saveGame();
            
            modal.innerHTML = `
                <div style="background: #1a1a1a; border-radius: 30px; padding: 30px; max-width: 450px; width: 90%; text-align: center; border: 3px solid #44ff44;">
                    <h2 style="color: #44ff44;">🎉 ¡VICTORIA! 🎉</h2>
                    <p style="color: #ffd700; font-size: 20px; margin: 20px;">Tu carta: ${getCardDisplay(currentGame.currentCard)}<br> Salió: ${getCardDisplay(nextCard)}</p>
                    <p style="color: #44ff44; font-size: 24px;">+$${winAmount.toLocaleString()}</p>
                    <button onclick="document.getElementById('duelGameModal').style.display='none'" style="margin-top: 20px; background: #ffd700; padding: 10px 30px; border-radius: 10px;">Cerrar</button>
                </div>
            `;
            showNotif(`🎉 ¡GANASTE EL DUELO! +$${winAmount.toLocaleString()}`, true);
            if (window.addHistory) window.addHistory(`⚔️ DUELO vs ${currentGame.opponent}: GANASTE $${winAmount.toLocaleString()}`, 'win');
        } else {
            modal.innerHTML = `
                <div style="background: #1a1a1a; border-radius: 30px; padding: 30px; max-width: 450px; width: 90%; text-align: center; border: 3px solid #ff4444;">
                    <h2 style="color: #ff4444;">💀 ¡DERROTA! 💀</h2>
                    <p style="color: #ffd700; font-size: 20px; margin: 20px;">Tu carta: ${getCardDisplay(currentGame.currentCard)}<br> Salió: ${getCardDisplay(nextCard)}</p>
                    <p style="color: #ff4444; font-size: 24px;">-$${stake.toLocaleString()}</p>
                    <button onclick="document.getElementById('duelGameModal').style.display='none'" style="margin-top: 20px; background: #ffd700; padding: 10px 30px; border-radius: 10px;">Cerrar</button>
                </div>
            `;
            showNotif(`💀 Perdiste el duelo contra ${currentGame.opponent}`, false);
            if (window.addHistory) window.addHistory(`⚔️ DUELO vs ${currentGame.opponent}: PERDISTE $${stake.toLocaleString()}`, 'loss');
        }
        
        updateUI();
        isInDuel = false;
        currentDuel = null;
        currentGame = null;
        
        document.getElementById('enterDuelQueueBtn').style.display = 'block';
        document.getElementById('leaveDuelQueueBtn').style.display = 'none';
        document.getElementById('duelQueueStatus').innerHTML = '';
    }
    
    function acceptDuel() { /* Implementado en startDuelMatch */ }
    function rejectDuel() { /* Salir de la sala */ leaveDuelQueue(); document.getElementById('duelChallenge').style.display = 'none'; }
    
    // Actualizar la sala periódicamente
    function startDuelUpdater() {
        if (duelInterval) clearInterval(duelInterval);
        duelInterval = setInterval(() => {
            updateWaitingRoomDisplay();
            // Limpiar jugadores que llevan más de 2 minutos esperando
            const now = Date.now();
            waitingPlayers = waitingPlayers.filter(p => now - p.timestamp < 120000);
            tryMatchDuel();
        }, 3000);
    }
    
    // Inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            createDuelLobby();
            startDuelUpdater();
        });
    } else {
        createDuelLobby();
        startDuelUpdater();
    }
})();