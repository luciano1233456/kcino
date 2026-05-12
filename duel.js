// ========== SISTEMA 1VS1 CON APPS SCRIPT ==========
(function() {
    console.log("⚔️ Sistema de Duelos 1VS1 iniciado");
    
    let currentGame = null;
    let duelInterval = null;
    let isInQueue = false;
    let myStake = 0;
    
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
                <div style="color: #ffd700; margin-bottom: 10px;">👥 JUGADORES ESPERANDO (EN VIVO):</div>
                <div id="waitingPlayersList" style="min-height: 60px; color: #aaa; font-size: 14px;">Cargando...</div>
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
        
        isInQueue = true;
        myStake = stakeAmount;
        
        const success = await window.joinWaitingRoom(user, stakeAmount);
        if (!success) {
            showNotification("❌ Error al unirse a la sala", false);
            isInQueue = false;
            return;
        }
        
        document.getElementById('enterDuelQueueBtn').style.display = 'none';
        document.getElementById('leaveDuelQueueBtn').style.display = 'block';
        document.getElementById('duelQueueStatus').innerHTML = `✅ Buscando rival... (Apuesta: $${stakeAmount.toLocaleString()})`;
        
        showNotification(`✅ Buscando pelea con $${stakeAmount.toLocaleString()}`, true);
    }
    
    async function leaveDuelQueue() {
        const user = window.currentUser;
        if (!user) return;
        
        isInQueue = false;
        await window.leaveWaitingRoom(user);
        
        document.getElementById('enterDuelQueueBtn').style.display = 'block';
        document.getElementById('leaveDuelQueueBtn').style.display = 'none';
        document.getElementById('duelQueueStatus').innerHTML = '';
        showNotification("❌ Has salido de la sala", false);
    }
    
    async function updateWaitingRoomDisplay() {
        const container = document.getElementById('waitingPlayersList');
        if (!container) return;
        
        const user = window.currentUser;
        const players = await window.getWaitingRoom();
        
        if (players.length === 0) {
            container.innerHTML = 'No hay nadie esperando';
            return;
        }
        
        container.innerHTML = players.map(p => `
            <div style="display: inline-block; background: #1a1a1a; padding: 5px 12px; border-radius: 20px; margin: 5px; border: 1px solid ${p.username === user ? '#44ff44' : '#ff44ff'};">
                🎲 ${p.username} ${p.username === user ? '✨' : ''} - 💰 $${(p.stake || 0).toLocaleString()}
            </div>
        `).join('');
        
        await tryMatchDuel(players);
    }
    
    async function tryMatchDuel(players) {
        const user = window.currentUser;
        if (!user || !isInQueue) return;
        
        const currentPlayer = players.find(p => p.username === user);
        if (!currentPlayer) return;
        
        const rival = players.find(p => p.username !== user);
        
        if (rival) {
            console.log("🎯 Rival encontrado:", rival.username);
            
            await window.markDuelStarted(user, rival.username);
            
            isInQueue = false;
            await window.leaveWaitingRoom(user);
            
            document.getElementById('enterDuelQueueBtn').style.display = 'block';
            document.getElementById('leaveDuelQueueBtn').style.display = 'none';
            document.getElementById('duelQueueStatus').innerHTML = '';
            
            showDuelGame(rival.username, currentPlayer.stake);
        }
    }
    
    function getCardDisplay(num) {
        const faces = {1:'A',11:'J',12:'Q',13:'K'};
        return faces[num] || num;
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
        const user = window.currentUser;
        
        if (won) {
            const winAmount = stake * 2;
            const result = await window.transferMoney(opponent, user, stake);
            
            if (result.success) {
                window.money += stake;
                if (window.bestWin && winAmount > window.bestWin) window.bestWin = winAmount;
                if (window.totalWins) window.totalWins++;
                if (window.updateUI) window.updateUI();
                if (window.saveOnline) await window.saveOnline();
                
                modal.innerHTML = `
                    <div style="background: #1a1a1a; border-radius: 30px; padding: 30px; max-width: 450px; width: 90%; text-align: center; border: 3px solid #44ff44;">
                        <h2 style="color: #44ff44;">🎉 ¡VICTORIA! 🎉</h2>
                        <p style="color: #ffd700; font-size: 18px; margin: 15px;">Tu carta: ${getCardDisplay(currentGame.currentCard)}<br> Salió: ${getCardDisplay(nextCard)}</p>
                        <p style="color: #44ff44; font-size: 28px;">+$${winAmount.toLocaleString()}</p>
                        <button onclick="this.closest('#duelGameModal').remove()" style="margin-top: 20px; background: #ffd700; padding: 10px 30px; border-radius: 10px; cursor: pointer;">Cerrar</button>
                    </div>
                `;
                if (window.showNotification) window.showNotification(`🎉 ¡GANASTE EL DUELO! +$${winAmount.toLocaleString()}`, true);
                if (window.addHistory) window.addHistory(`⚔️ DUELO vs ${opponent}: GANASTE $${winAmount.toLocaleString()}`, 'win');
            } else {
                modal.innerHTML = `
                    <div style="background: #1a1a1a; border-radius: 30px; padding: 30px; max-width: 450px; width: 90%; text-align: center; border: 3px solid #ff4444;">
                        <h2 style="color: #ff4444;">⚠️ ERROR</h2>
                        <p>No se pudo completar la transferencia</p>
                        <button onclick="this.closest('#duelGameModal').remove()" style="margin-top: 20px; background: #ffd700; padding: 10px 30px; border-radius: 10px;">Cerrar</button>
                    </div>
                `;
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
            if (window.showNotification) window.showNotification(`💀 Perdiste el duelo contra ${opponent}`, false);
            if (window.addHistory) window.addHistory(`⚔️ DUELO vs ${opponent}: PERDISTE $${stake.toLocaleString()}`, 'loss');
            if (window.updateUI) window.updateUI();
            if (window.saveOnline) await window.saveOnline();
        }
        
        if (window.updateUI) window.updateUI();
        currentGame = null;
    }
    
    function startDuelUpdater() {
        if (duelInterval) clearInterval(duelInterval);
        duelInterval = setInterval(async () => {
            await updateWaitingRoomDisplay();
        }, 2000);
    }
    
    function waitForGame() {
        if (typeof window.currentUser !== 'undefined' && 
            typeof window.getWaitingRoom === 'function') {
            createDuelLobby();
            startDuelUpdater();
        } else {
            setTimeout(waitForGame, 500);
        }
    }
    
    waitForGame();
})();