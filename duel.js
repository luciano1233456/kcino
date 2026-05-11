// ========== SISTEMA 1VS1 CON SALA DE ESPERA ==========
(function() {
    console.log("⚔️ Sistema de Duelos iniciado - Esperando a que el juego principal cargue...");
    
    let waitingPlayers = [];
    let currentGame = null;
    let duelInterval = null;
    
    // Función para esperar a que el juego principal esté listo
    function waitForGame() {
        if (typeof window.currentUser !== 'undefined' && typeof window.money !== 'undefined') {
            console.log("✅ Juego principal detectado, iniciando sistema de duelos");
            createDuelLobby();
            startDuelUpdater();
        } else {
            console.log("⏳ Esperando juego principal...");
            setTimeout(waitForGame, 500);
        }
    }
    
    function createDuelLobby() {
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
                <h3 style="color: #ff44ff; margin: 0;">⚔️ ARENA 1VS1 - MAYOR O MENOR ⚔️</h3>
                <div>
                    <button id="enterDuelQueueBtn" style="background: #ff44ff; color: #000; padding: 10px 20px; border-radius: 10px; font-weight: bold; cursor: pointer;">🔍 BUSCAR PELEA</button>
                    <button id="leaveDuelQueueBtn" style="background: #ff4444; color: #fff; padding: 10px 20px; border-radius: 10px; display: none; cursor: pointer;">❌ SALIR</button>
                </div>
            </div>
            <div id="waitingRoom" style="background: #0a0a0a; border-radius: 15px; padding: 15px;">
                <div style="color: #ffd700; margin-bottom: 10px;">👥 JUGADORES ESPERANDO:</div>
                <div id="waitingPlayersList" style="min-height: 60px; color: #aaa; font-size: 14px;">No hay nadie esperando</div>
                <div id="duelQueueStatus" style="color: #ff44ff; font-size: 12px; margin-top: 10px;"></div>
            </div>
        `;
        
        const rankingSection = document.querySelector('.ranking');
        if (rankingSection) {
            rankingSection.parentNode.insertBefore(duelSection, rankingSection);
        }
        
        document.getElementById('enterDuelQueueBtn').onclick = enterDuelQueue;
        document.getElementById('leaveDuelQueueBtn').onclick = leaveDuelQueue;
    }
    
    async function enterDuelQueue() {
        const user = window.currentUser;
        if (!user) {
            showNotification("❌ Inicia sesión para jugar 1vs1", false);
            return;
        }
        
        if (window.money < 5000) {
            showNotification("❌ Necesitas al menos $5000 para jugar 1vs1", false);
            return;
        }
        
        const stake = prompt("💰 ¿Cuánto quieres apostar? (Mínimo $500)\nTu dinero: $" + window.money.toLocaleString(), "1000");
        if (!stake) return;
        const stakeAmount = parseInt(stake);
        if (isNaN(stakeAmount) || stakeAmount < 500) {
            showNotification("❌ La apuesta mínima es $500", false);
            return;
        }
        if (stakeAmount > window.money) {
            showNotification("❌ No tienes suficiente dinero", false);
            return;
        }
        
        if (waitingPlayers.find(p => p.username === user)) {
            showNotification("❌ Ya estás en la sala", false);
            return;
        }
        
        waitingPlayers.push({
            username: user,
            stake: stakeAmount,
            timestamp: Date.now()
        });
        
        updateWaitingRoomDisplay();
        document.getElementById('enterDuelQueueBtn').style.display = 'none';
        document.getElementById('leaveDuelQueueBtn').style.display = 'block';
        document.getElementById('duelQueueStatus').innerHTML = `✅ Esperando rival... (Apuesta: $${stakeAmount.toLocaleString()})`;
        
        showNotification(`✅ Buscando pelea con $${stakeAmount.toLocaleString()}`, true);
        tryMatchDuel();
    }
    
    function leaveDuelQueue() {
        const user = window.currentUser;
        if (!user) return;
        
        waitingPlayers = waitingPlayers.filter(p => p.username !== user);
        updateWaitingRoomDisplay();
        document.getElementById('enterDuelQueueBtn').style.display = 'block';
        document.getElementById('leaveDuelQueueBtn').style.display = 'none';
        document.getElementById('duelQueueStatus').innerHTML = '';
        showNotification("❌ Has salido de la sala", false);
    }
    
    function updateWaitingRoomDisplay() {
        const container = document.getElementById('waitingPlayersList');
        if (!container) return;
        
        const user = window.currentUser;
        
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
    
    async function tryMatchDuel() {
        if (waitingPlayers.length < 2) return;
        
        const user = window.currentUser;
        if (!user) return;
        
        const currentPlayerIndex = waitingPlayers.findIndex(p => p.username === user);
        if (currentPlayerIndex === -1) return;
        
        const currentPlayer = waitingPlayers[currentPlayerIndex];
        const potentialRival = waitingPlayers.find(p => p.username !== user);
        
        if (potentialRival) {
            waitingPlayers = waitingPlayers.filter(p => p.username !== user && p.username !== potentialRival.username);
            updateWaitingRoomDisplay();
            
            if (window.money < currentPlayer.stake) {
                showNotification(`❌ No tienes suficiente dinero`, false);
                leaveDuelQueue();
                return;
            }
            
            // Descontar apuesta
            window.money -= currentPlayer.stake;
            if (window.money < 0) window.money = 0;
            if (typeof window.updateUI === 'function') window.updateUI();
            if (typeof window.saveOnline === 'function') await window.saveOnline();
            
            showDuelGame(potentialRival.username, currentPlayer.stake);
        }
    }
    
    function showDuelGame(opponent, stake) {
        const oldModal = document.getElementById('duelGameModal');
        if (oldModal) oldModal.remove();
        
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
            gameActive: true,
            modal: modal
        };
        
        modal.innerHTML = `
            <div style="background: #1a1a1a; border-radius: 30px; padding: 30px; max-width: 450px; width: 90%; text-align: center; border: 3px solid #ff44ff;">
                <h2 style="color: #ff44ff;">⚔️ DUELO VS ${opponent} ⚔️</h2>
                <p style="color: #ffd700; margin: 10px 0;">💰 Apuesta: $${stake.toLocaleString()}</p>
                <p style="color: #aaa; margin-bottom: 15px;">¡Adivina si la siguiente carta es MAYOR o MENOR!</p>
                <div style="background: #0a0a0a; border-radius: 20px; padding: 20px;">
                    <div style="color: #ffd700;">Tu carta actual:</div>
                    <div style="font-size: 80px; font-weight: bold; padding: 20px;">${getCardDisplay(currentCard)}</div>
                    <div style="display: flex; gap: 20px; justify-content: center;">
                        <button id="duelHigherBtn" style="background: #44ff44; color: #000; padding: 12px 30px; font-size: 18px; border-radius: 50px; cursor: pointer; border: none; font-weight: bold;">⬆️ MAYOR</button>
                        <button id="duelLowerBtn" style="background: #ff4444; color: #fff; padding: 12px 30px; font-size: 18px; border-radius: 50px; cursor: pointer; border: none; font-weight: bold;">⬇️ MENOR</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('duelHigherBtn').onclick = () => makeDuelGuess('higher');
        document.getElementById('duelLowerBtn').onclick = () => makeDuelGuess('lower');
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
        const modal = currentGame.modal;
        const opponent = currentGame.opponent;
        
        if (won) {
            const winAmount = stake * 2;
            window.money += winAmount;
            if (window.bestWin && winAmount > window.bestWin) window.bestWin = winAmount;
            if (window.totalWins) window.totalWins++;
            if (typeof window.updateUI === 'function') window.updateUI();
            if (typeof window.saveOnline === 'function') await window.saveOnline();
            
            modal.innerHTML = `
                <div style="background: #1a1a1a; border-radius: 30px; padding: 30px; max-width: 450px; width: 90%; text-align: center; border: 3px solid #44ff44;">
                    <h2 style="color: #44ff44;">🎉 ¡VICTORIA! 🎉</h2>
                    <p style="color: #ffd700; font-size: 18px; margin: 15px;">Tu carta: ${getCardDisplay(currentGame.currentCard)}<br> Salió: ${getCardDisplay(nextCard)}</p>
                    <p style="color: #44ff44; font-size: 28px;">+$${winAmount.toLocaleString()}</p>
                    <button onclick="this.closest('#duelGameModal').remove()" style="margin-top: 20px; background: #ffd700; padding: 10px 30px; border-radius: 10px; cursor: pointer;">Cerrar</button>
                </div>
            `;
            if (typeof window.showNotification === 'function') {
                window.showNotification(`🎉 ¡GANASTE EL DUELO! +$${winAmount.toLocaleString()}`, true);
            }
            if (typeof window.addHistory === 'function') {
                window.addHistory(`⚔️ DUELO vs ${opponent}: GANASTE $${winAmount.toLocaleString()}`, 'win');
            }
        } else {
            modal.innerHTML = `
                <div style="background: #1a1a1a; border-radius: 30px; padding: 30px; max-width: 450px; width: 90%; text-align: center; border: 3px solid #ff4444;">
                    <h2 style="color: #ff4444;">💀 ¡DERROTA! 💀</h2>
                    <p style="color: #ffd700; font-size: 18px; margin: 15px;">Tu carta: ${getCardDisplay(currentGame.currentCard)}<br> Salió: ${getCardDisplay(nextCard)}</p>
                    <p style="color: #ff4444; font-size: 28px;">-$${stake.toLocaleString()}</p>
                    <button onclick="this.closest('#duelGameModal').remove()" style="margin-top: 20px; background: #ffd700; padding: 10px 30px; border-radius: 10px; cursor: pointer;">Cerrar</button>
                </div>
            `;
            if (typeof window.showNotification === 'function') {
                window.showNotification(`💀 Perdiste el duelo contra ${opponent}`, false);
            }
            if (typeof window.addHistory === 'function') {
                window.addHistory(`⚔️ DUELO vs ${opponent}: PERDISTE $${stake.toLocaleString()}`, 'loss');
            }
        }
        
        if (typeof window.updateUI === 'function') window.updateUI();
        currentGame = null;
        
        document.getElementById('enterDuelQueueBtn').style.display = 'block';
        document.getElementById('leaveDuelQueueBtn').style.display = 'none';
        document.getElementById('duelQueueStatus').innerHTML = '';
    }
    
    function startDuelUpdater() {
        if (duelInterval) clearInterval(duelInterval);
        duelInterval = setInterval(() => {
            updateWaitingRoomDisplay();
            const now = Date.now();
            waitingPlayers = waitingPlayers.filter(p => now - p.timestamp < 120000);
            tryMatchDuel();
        }, 3000);
    }
    
    function showNotification(msg, isWin) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(msg, isWin);
        } else {
            alert(msg);
        }
    }
    
    // Iniciar
    waitForGame();
})();