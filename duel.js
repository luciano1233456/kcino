// ========== SISTEMA 1VS1 - TIRO AL BLANCO (Puntería) ==========
(function() {
    console.log("🎯 Sistema de Duelos 1VS1 - Tiro al Blanco iniciado");
    
    let currentGame = null;
    let duelInterval = null;
    let isInQueue = false;
    let myStake = 0;
    let gameActive = false;
    let hits = 0;
    let timeLeft = 0;
    let gameTimer = null;
    let targets = [];
    let targetCreationInterval = null;
    
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
    
    async function saveGame() {
        if (typeof window.saveOnline === 'function') {
            await window.saveOnline();
        }
    }
    
    function updateUI() {
        if (typeof window.updateUI === 'function') {
            window.updateUI();
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
                <h3 style="color: #ff44ff; margin: 0;">🎯 ARENA 1VS1 - TIRO AL BLANCO 🎯</h3>
                <div>
                    <button id="enterDuelQueueBtn" style="background: #ff44ff; color: #000; padding: 10px 20px; border-radius: 10px; font-weight: bold; cursor: pointer;">🔍 BUSCAR PELEA</button>
                    <button id="leaveDuelQueueBtn" style="background: #ff4444; color: #fff; padding: 10px 20px; border-radius: 10px; display: none; cursor: pointer;">❌ SALIR</button>
                </div>
            </div>
            <div id="waitingRoom" style="background: #0a0a0a; border-radius: 15px; padding: 15px;">
                <div style="color: #ffd700; margin-bottom: 10px;">👥 JUGADORES ESPERANDO PELEA:</div>
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
            
            // Descontar la apuesta del jugador
            window.money -= currentPlayer.stake;
            if (window.money < 0) window.money = 0;
            updateUI();
            await saveGame();
            
            showAimDuel(rival.username, currentPlayer.stake);
        }
    }
    
    // ========== JUEGO DE TIRO AL BLANCO ==========
    function showAimDuel(opponent, stake) {
        const oldModal = document.getElementById('duelGameModal');
        if (oldModal) oldModal.remove();
        
        const modal = document.createElement('div');
        modal.id = 'duelGameModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.98); display: flex; align-items: center;
            justify-content: center; z-index: 2000;
        `;
        
        modal.innerHTML = `
            <div style="background: #1a1a1a; border-radius: 30px; padding: 20px; max-width: 900px; width: 95%; height: 80vh; text-align: center; border: 3px solid #ff44ff; display: flex; flex-direction: column;">
                <h2 style="color: #ff44ff; margin-bottom: 10px;">🎯 TIRO AL BLANCO VS ${opponent} 🎯</h2>
                <p style="color: #ffd700; margin-bottom: 10px;">💰 Apuesta: $${stake.toLocaleString()}</p>
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px; padding: 0 20px;">
                    <div style="background: #0a0a0a; padding: 10px 20px; border-radius: 15px;">
                        <span style="color: #aaa;">🎯 ACIERTOS</span>
                        <span id="hitsCount" style="color: #44ff44; font-size: 32px; font-weight: bold; margin-left: 10px;">0</span>
                    </div>
                    <div style="background: #0a0a0a; padding: 10px 20px; border-radius: 15px;">
                        <span style="color: #aaa;">⏱️ TIEMPO</span>
                        <span id="timerCount" style="color: #ffd700; font-size: 32px; font-weight: bold; margin-left: 10px;">15</span>
                    </div>
                </div>
                <div id="targetArea" style="flex: 1; position: relative; background: linear-gradient(135deg, #0a2a0a, #051505); border-radius: 20px; overflow: hidden; cursor: crosshair; border: 2px solid #ffd700;"></div>
                <p style="color: #aaa; font-size: 12px; margin-top: 10px;">🎯 Haz clic en los objetivos rojos para sumar puntos. ¡Tienes 15 segundos!</p>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        gameActive = true;
        hits = 0;
        timeLeft = 15;
        
        document.getElementById('hitsCount').innerHTML = '0';
        document.getElementById('timerCount').innerHTML = '15';
        
        const targetArea = document.getElementById('targetArea');
        
        // Función para crear un objetivo
        function createTarget() {
            if (!gameActive) return;
            
            const target = document.createElement('div');
            const areaRect = targetArea.getBoundingClientRect();
            const margin = 50;
            const x = margin + Math.random() * (areaRect.width - margin * 2);
            const y = margin + Math.random() * (areaRect.height - margin * 2);
            
            target.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                width: 60px;
                height: 60px;
                background: radial-gradient(circle at 30% 30%, #ff6666, #cc0000);
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 30px;
                box-shadow: 0 0 15px rgba(255,0,0,0.8);
                transition: transform 0.1s ease;
                animation: float 0.5s ease-out;
                z-index: 100;
            `;
            target.innerHTML = '🎯';
            
            // Animación de flotación
            target.onmouseenter = () => { target.style.transform = 'scale(1.1)'; };
            target.onmouseleave = () => { target.style.transform = 'scale(1)'; };
            
            target.onclick = (e) => {
                e.stopPropagation();
                if (!gameActive) return;
                hits++;
                document.getElementById('hitsCount').innerHTML = hits;
                
                // Efecto de explosión
                target.style.transform = 'scale(0)';
                target.style.opacity = '0';
                setTimeout(() => target.remove(), 100);
                
                // Crear nuevo objetivo
                createTarget();
                
                // Feedback visual
                const hitEffect = document.createElement('div');
                hitEffect.style.cssText = `
                    position: absolute;
                    left: ${x}px;
                    top: ${y}px;
                    width: 60px;
                    height: 60px;
                    background: radial-gradient(circle, #ffff00, #ff8800);
                    border-radius: 50%;
                    pointer-events: none;
                    animation: explode 0.3s ease-out forwards;
                `;
                targetArea.appendChild(hitEffect);
                setTimeout(() => hitEffect.remove(), 300);
            };
            
            targetArea.appendChild(target);
            targets.push(target);
            
            // El objetivo desaparece después de 1.5 segundos si no se dispara
            setTimeout(() => {
                if (target.parentNode) {
                    target.remove();
                    createTarget(); // Crear otro en su lugar
                }
            }, 1500);
        }
        
        // Añadir animaciones CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes float {
                from { transform: scale(0) rotate(0deg); opacity: 0; }
                to { transform: scale(1) rotate(0deg); opacity: 1; }
            }
            @keyframes explode {
                0% { transform: scale(0); opacity: 1; }
                100% { transform: scale(2); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        // Iniciar creación de objetivos (3 activos al mismo tiempo)
        for (let i = 0; i < 3; i++) {
            setTimeout(() => createTarget(), i * 200);
        }
        
        // Temporizador
        gameTimer = setInterval(() => {
            if (!gameActive) return;
            timeLeft--;
            document.getElementById('timerCount').innerHTML = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(gameTimer);
                if (targetCreationInterval) clearInterval(targetCreationInterval);
                gameActive = false;
                
                // Limpiar todos los objetivos
                targets.forEach(t => { if (t.parentNode) t.remove(); });
                targets = [];
                
                // Determinar resultado
                const minHitsToWin = 8;
                const won = hits >= minHitsToWin;
                
                if (won) {
                    finalizarDuelo(true, stake, opponent, `${hits} aciertos en 15 segundos`);
                } else {
                    finalizarDuelo(false, stake, opponent, `${hits} aciertos (mínimo ${minHitsToWin} para ganar)`);
                }
            }
        }, 1000);
        
        window.duelModal = modal;
    }
    
    async function finalizarDuelo(won, stake, opponent, message) {
        const modal = document.getElementById('duelGameModal');
        if (!modal) return;
        
        // Limpiar intervalos si existen
        if (gameTimer) clearInterval(gameTimer);
        if (targetCreationInterval) clearInterval(targetCreationInterval);
        
        const user = window.currentUser;
        
        if (won) {
            const winAmount = stake * 2;
            
            // Transferir dinero del perdedor al ganador
            const result = await window.transferMoney(opponent, user, stake);
            
            if (result.success) {
                window.money += stake;
                if (window.bestWin && winAmount > window.bestWin) window.bestWin = winAmount;
                if (window.totalWins) window.totalWins++;
                updateUI();
                await saveGame();
                
                modal.innerHTML = `
                    <div style="background: #1a1a1a; border-radius: 30px; padding: 30px; max-width: 500px; width: 90%; text-align: center; border: 3px solid #44ff44;">
                        <h2 style="color: #44ff44;">🎉 ¡VICTORIA! 🎉</h2>
                        <div style="font-size: 64px; margin: 20px;">🏆</div>
                        <p style="color: #ffd700; font-size: 18px;">${message}</p>
                        <p style="color: #44ff44; font-size: 28px; margin: 15px;">+$${winAmount.toLocaleString()}</p>
                        <p style="color: #aaa;">Le ganaste a ${opponent}</p>
                        <button onclick="this.closest('#duelGameModal').remove()" style="margin-top: 20px; background: #ffd700; padding: 10px 30px; border-radius: 10px; cursor: pointer;">Cerrar</button>
                    </div>
                `;
                showNotification(`🎉 ¡GANASTE EL DUELO! +$${winAmount.toLocaleString()}`, true);
                addHistoryLog(`🎯 DUELO vs ${opponent}: GANASTE $${winAmount.toLocaleString()} (${message})`, 'win');
            } else {
                modal.innerHTML = `
                    <div style="background: #1a1a1a; border-radius: 30px; padding: 30px; max-width: 500px; width: 90%; text-align: center; border: 3px solid #ff4444;">
                        <h2 style="color: #ff4444;">⚠️ ERROR</h2>
                        <p>No se pudo completar la transferencia</p>
                        <button onclick="this.closest('#duelGameModal').remove()" style="margin-top: 20px; background: #ffd700; padding: 10px 30px; border-radius: 10px;">Cerrar</button>
                    </div>
                `;
            }
        } else {
            modal.innerHTML = `
                <div style="background: #1a1a1a; border-radius: 30px; padding: 30px; max-width: 500px; width: 90%; text-align: center; border: 3px solid #ff4444;">
                    <h2 style="color: #ff4444;">💀 ¡DERROTA! 💀</h2>
                    <div style="font-size: 64px; margin: 20px;">😭</div>
                    <p style="color: #ffd700; font-size: 18px;">${message}</p>
                    <p style="color: #ff4444; font-size: 28px; margin: 15px;">-$${stake.toLocaleString()}</p>
                    <p style="color: #aaa;">Perdiste contra ${opponent}</p>
                    <button onclick="this.closest('#duelGameModal').remove()" style="margin-top: 20px; background: #ffd700; padding: 10px 30px; border-radius: 10px; cursor: pointer;">Cerrar</button>
                </div>
            `;
            showNotification(`💀 Perdiste el duelo contra ${opponent}`, false);
            addHistoryLog(`🎯 DUELO vs ${opponent}: PERDISTE $${stake.toLocaleString()} (${message})`, 'loss');
            updateUI();
            await saveGame();
        }
        
        gameActive = false;
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