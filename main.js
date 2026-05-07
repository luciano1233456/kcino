function init() {
    // Canvas
    canvas = document.getElementById('rouletteCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 400;
    window.canvas = canvas;
    window.ctx = ctx;
    
    // Botones de números
    const numbersGrid = document.getElementById('numbersGrid');
    for (let i = 0; i <= 36; i++) {
        const btn = document.createElement('button');
        btn.className = `num-btn ${getNumberColor(i)}`;
        btn.textContent = i;
        btn.setAttribute('data-num', i);
        btn.onclick = () => placeBet('number', i);
        numbersGrid.appendChild(btn);
    }
    
    // Apuestas especiales
    document.querySelectorAll('.special').forEach(btn => {
        btn.onclick = () => placeBet(btn.getAttribute('data-bet'));
    });
    
    // Botón girar
    document.getElementById('spinBtn').onclick = spinRoulette;
    
    // Inicializar variables
    window.investments = getDefaultInvestments();
    drawRoulette();
    updateUI();
    updateUserDisplay();
    updateRankingUI();
    setupDuelButtons();
    actualizarHistorialDuelos();
    
    // Timers
    setInterval(updateInvestments, 1000);
    setInterval(() => updateRankingUI(), 5000);
    setInterval(() => { if (window.currentUser && !window.activeDuel) updateOpponentList(); }, 10000);
    setInterval(() => checkInvitations(), 3000);
}

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}