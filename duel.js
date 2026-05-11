// ========== SISTEMA 1VS1 CON SALA DE ESPERA ==========
// Este script se ejecuta junto al principal y añade la funcionalidad de duelos

(function() {
    console.log("⚔️ Sistema de Duelos iniciado");
    
    // Variables del sistema de duelos
    let waitingPlayers = [];     // Lista de jugadores esperando duelo
    let currentDuel = null;
    let duelInterval = null;
    let isInDuel = false;
    let currentGame = null;
    
    // Obtener referencias seguras al juego principal
    function getMoney() {
        return typeof window.money !== 'undefined' ? window.money : 0;
    }
    
    function setMoney(value) {
        if (typeof window.money !== 'undefined') window.money = value;
    }
    
    function getCurrentUser() {
        return window.currentUser || null;
    }
    
    function showNotification(msg, isWin) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(msg, isWin);
        } else {
            alert(msg);
        }
    }
    
    function addHistoryLog(text, type) {
        if (typeof window.addHistory === 'function') {
            window.addHistory(text, type);
        }
    }
    
    function saveGame() {
        if (typeof window.saveOnline === 'function') {
            window.saveOnline();
        }
    }
    
    function updateGameUI() {
        if (typeof window.updateUI === 'function') {
            window.updateUI();
        }
        // También actualizar manualmente el display del dinero
        const moneyEl = document.getElementById('money');
        if (moneyEl && typeof window.money !== 'undefined') {
            moneyEl.innerHTML = `$${Math.floor(window.money).toLocaleString()}`;
        }
    }
    
    // Crear la interfaz de sala de espera
    function createDuelLobby() {
        // Verificar si ya existe
        if (document.getElementById('duelLobby')) return;
        
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;">
                <h3 style="color: #ff44ff; margin: 0;">⚔️ ARENA 1VS1 ⚔️</h3>
                <div>
                    <button id="enterDuelQueueBtn" style="background: #ff44ff; color: #000; padding: 10px 20px; border-radius: 10px; font-weight: bold; cursor: pointer;">🔍 ENTRAR A SALA</button>
                    <button id="leaveDuelQueueBtn" style="background: #ff4444; color: #fff; padding: 10px 20px; border-radius: 10px; display: none; cursor: pointer;">❌ SALIR DE SALA</button>
                </div>
            </div>
            <div id="waitingRoom" style="background: #0a0a0a; border-radius: 15px; padding: 15px;">
                <div style="color: #ffd700; margin-bottom: 10px;">👥 JUGADORES ESPERANDO PELEA:</div>
                <div id="waitingPlayersList" style="min-height: 60px; color: #aaa; font-size: 14px;">No hay nadie esperando</div>
                <div id="duelQueueStatus" style="color: #ff44ff; font-size: 12px; margin-top: 10px;"></div>
            </div>
        `;
        
        // Insertar después del auth-section
        const authSection = document.querySelector('.auth-section');
        const rankingSection = document.querySelector('.ranking');
        if (authSection && authSection.parentNode) {
            if (rankingSection) {
                authSection.parentNode.insertBefore(duelSection, rankingSection);
            } else {
                authSection.parentNode.insertBefore(duelSection, authSection.nextSibling);
            }
        } else {
            document.querySelector('.game-container')?.appendChild(duelSection);
        }
        
        // Eventos
        document.getElementById('enterDuelQueueBtn').onclick = enterDuelQueue;
        document.getElementById('leaveDuelQueueBtn').onclick = leaveDuelQueue;
    }
    
    // Entrar a la sala de espera
    async function enterDuelQueue() {
        const user = getCurrentUser();
        console.log("Usuario actual:", user);
        
        if (!user) {
            showNotification("❌ Inicia sesión para jugar 1vs1", false);
            return;
        }
        
        const currentMoney = getMoney();
        console.log("Dinero actual:", currentMoney);
        
        if (currentMoney < 5000) {
            showNotification("❌ Necesitas al menos $5000 para jugar 1vs1", false);
            return;
        }
        
        const stake = prompt("💰 ¿Cuánto quieres apostar? (Mínimo $500)\nTu dinero: $" + currentMoney.toLocaleString(), "1000");
        if (!stake) return;
        const stakeAmount = parseInt(stake);
        if (isNaN(stakeAmount) || stakeAmount < 500) {
            showNotification("❌ La apuesta mínima es $500", false);
            return;
        }
        if (stakeAmount > currentMoney) {
            showNotification("❌ No tienes suficiente dinero", false);
            return;
        }
        
        // Verificar si ya está en la lista
        if (waitingPlayers.find(p => p.username === user)) {
            showNotification("❌ Ya estás en la sala de espera", false);
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
        
        showNotification(`✅ Has entrado a la sala con apuesta de $${stakeAmount.toLocaleString()}`, true);
        
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
        showNotification("❌ Has salido de la sala de espera", false);
    }
    
    // Actualizar visualización de la sala
    function updateWaitingRoomDisplay() {
        const container = document.getElementById('waitingPlayersList');
        if (!container) return;
        
        const user = getCurrentUser();
        
        if (waitingPlayers.length === 0) {
            container.innerHTML = 'No hay nadie esperando';
            return;
        }
        
        container.innerHTML = waitingPlayers.map(p => `
            <div style="display: inline-block; background: #1a1a1a; padding: 5px 12px; border-radius: 20px; margin: 5px; border: 1px solid ${p.username === user ? '#44ff44' : '#ff44ff'};">
                🎲 ${p.username} ${p.username === user ? '✨' : ''} - 💰 $${p.stake.toLocaleString()}
            </div>
        `).join('');
    }
    
    // Intentar emparejar jugadores
    async function tryMatchDuel() {
        if (waitingPlayers.length < 2) return;
        
        const user = getCurrentUser();
        if (!user) return;
        
        // Buscar un rival diferente al usuario actual
        const currentPlayerIndex = waitingPlayers.findIndex(p => p.username === user);
        if (currentPlayerIndex === -1) return;
        
        const currentPlayer = waitingPlayers[currentPlayerIndex];
        
        // Buscar otro jugador (el primero que no sea el actual)
        const potentialRival = waitingPlayers.find(p => p.username !== user);
        
        if (potentialRival) {
            // Remover ambos de la sala
            waitingPlayers = waitingPlayers.filter(p => p.username !== user && p.username !== potentialRival.username);
            updateWaitingRoomDisplay();
            
            // El que inició el duelo es el que buscó primero
            const isChallenger = true;
            const myStake = currentPlayer.stake;
            const opponent = potentialRival.username;
            
            // Verificar que el jugador actual tiene suficiente dinero
            if (getMoney() < myStake) {
                showNotification(`❌ No tienes suficiente dinero para la apuesta de $${myStake.toLocaleString()}`, false);
                leaveDuelQueue();
                return;
            }
            
            // Descontar la apuesta
            window.money -= myStake;
            if (window.money < 0) window.money = 0;
            updateGameUI();
            await saveGame();
            
            isInDuel = true;
            
            // Mostrar modal de juego
            showDuelGame(opponent, myStake);
        }
    }
    
    // Mostrar el juego de Mayor o Menor
    function showDuelGame(opponent, stake) {
        // Remover modal existente si hay
        const oldModal = document.getElementById('duelGameModal');
        if (oldModal) oldModal.remove();
        
        // Crear modal
        const modal = document.createElement('div');
        modal.id = 'duelGameModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.98); display: flex; align-items: center;
            justify-content: center; z-index: 2000;
        `;
        
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
                        <button id="duelHigherBtn" style="background: #44ff44; color: #000; padding: 15px 35px; font-size: 20px; border-radius: 50px; cursor: pointer; border: none; font-weight: bold;">⬆️ MAYOR</button>
                        <button id="duelLowerBtn" style="background: #ff4444; color: #fff; padding: 15px 35px; font-size: 20px; border-radius: 50px; cursor: pointer; border: none; font-weight: bold;">⬇️ MENOR</button>
                    </div>
                </div>
                <button id="closeDuelModal" style="margin-top: 20px; background: #333; color: #fff; padding: 8px 20px; border-radius: 10px; cursor: pointer; border: none;">Cerrar</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('duelHigherBtn').onclick = () => makeDuelGuess('higher', modal);
        document.getElementById('duelLowerBtn').onclick = () => makeDuelGuess('lower', modal);
        document.getElementById('closeDuelModal').onclick = () => {
            modal.remove();
            isInDuel = false;
            currentGame = null;
            document.getElementById('enterDuelQueueBtn').style.display = 'block';
            document.getElementById('leaveDuelQueueBtn').style.display = 'none';
            document.getElementById('duelQueueStatus').innerHTML = '';
        };
    }
    
    function getCardDisplay(num) {
        const faces = {1:'A',11:'J',12:'Q',13:'K'};
        return faces[num] || num;
    }
    
    async function makeDuelGuess(guess, modal) {
        if (!currentGame || !currentGame.gameActive) return;
        
        currentGame.gameActive = false;
        const nextCard = Math.floor(Math.random() * 13) + 1;
        let won = false;
        
        if (guess === 'higher' && nextCard > currentGame.currentCard) won = true;
        if (guess === 'lower' && nextCard < currentGame.currentCard) won = true;
        
        const stake = currentGame.stake;
        
        if (won) {
            const winAmount = stake * 2;
            window.money += winAmount;
            if (window.bestWin && winAmount > window.bestWin) window.bestWin = winAmount;
            if (window.totalWins) window.totalWins++;
            updateGameUI();
            await saveGame();
            
            modal.innerHTML = `
                <div style="background: #1a1a1a; border-radius: 30px; padding: 30px; max-width: 450px; width: 90%; text-align: center; border: 3px solid #44ff44;">
                    <h2 style="color: #44ff44;">🎉 ¡VICTORIA! 🎉</h2>
                    <p style="color: #ffd700; font-size: 20px; margin: 20px;">Tu carta: ${getCardDisplay(currentGame.currentCard)}<br> Salió: ${getCardDisplay(nextCard)}</p>
                    <p style="color: #44ff44; font-size: 24px;">+$${winAmount.toLocaleString()}</p>
                    <button onclick="this.closest('#duelGameModal').remove()" style="margin-top: 20px; background: #ffd700; padding: 10px 30px; border-radius: 10px; cursor: pointer;">Cerrar</button>
                </div>
            `;
            showNotification(`🎉 ¡GANASTE EL DUELO! +$${winAmount.toLocaleString()}`, true);
            addHistoryLog(`⚔️ DUELO vs ${currentGame.opponent}: GANASTE $${winAmount.toLocaleString()}`, 'win');
        } else {
            modal.innerHTML = `
                <div style="background: #1a1a1a; border-radius: 30px; padding: 30px; max-width: 450px; width: 90%; text-align: center; border: 3px solid #ff4444;">
                    <h2 style="color: #ff4444;">💀 ¡DERROTA! 💀</h2>
                    <p style="color: #ffd700; font-size: 20px; margin: 20px;">Tu carta: ${getCardDisplay(currentGame.currentCard)}<br> Salió: ${getCardDisplay(nextCard)}</p>
                    <p style="color: #ff4444; font-size: 24px;">-$${stake.toLocaleString()}</p>
                    <button onclick="this.closest('#duelGameModal').remove()" style="margin-top: 20px; background: #ffd700; padding: 10px 30px; border-radius: 10px; cursor: pointer;">Cerrar</button>
                </div>
            `;
            showNotification(`💀 Perdiste el duelo contra ${currentGame.opponent}`, false);
            addHistoryLog(`⚔️ DUELO vs ${currentGame.opponent}: PERDISTE $${stake.toLocaleString()}`, 'loss');
        }
        
        updateGameUI();
        isInDuel = false;
        currentGame = null;
        
        document.getElementById('enterDuelQueueBtn').style.display = 'block';
        document.getElementById('leaveDuelQueueBtn').style.display = 'none';
        document.getElementById('duelQueueStatus').innerHTML = '';
    }
    
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