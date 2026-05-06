// ========== CONFIGURACIÓN DE GOOGLE SHEETS ==========
// IMPORTANTE: Reemplaza con tu ID de Google Sheet
// Tu ID está en la URL: https://docs.google.com/spreadsheets/d/ AQUÍ_EL_ID /edit
const SPREADSHEET_ID = '1BUWJwoKry6U2l7_1IHsJmisdGKHWXYGqh3kW1NcNieU';

// URL de la API de Google Sheets (pública)
const SHEETS_API = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json`;

// URL para escribir datos (usando Google Apps Script - ver instrucciones)
let SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwBqMIuheXP9kpCh2cnSSvO73WFYWbrYm1qxOQaP11ARmYXGnYhY3k5oJaDeNgeaWE/exec'; // La pondremos después

// ========== FUNCIONES DE BASE DE DATOS ==========
async function fetchAllPlayers() {
    try {
        const response = await fetch(SHEETS_API);
        const text = await response.text();
        const jsonText = text.substring(47, text.length - 2);
        const data = JSON.parse(jsonText);
        
        const players = {};
        const rows = data.table.rows;
        
        for (let i = 1; i < rows.length; i++) { // Saltar cabecera
            const row = rows[i].c;
            if (row && row[0] && row[0].v) {
                players[row[0].v] = {
                    username: row[0].v,
                    password: row[1]?.v || '',
                    money: parseFloat(row[2]?.v) || 5000,
                    bestWin: parseFloat(row[3]?.v) || 0,
                    totalSpins: parseInt(row[4]?.v) || 0,
                    totalWins: parseInt(row[5]?.v) || 0,
                    level: parseInt(row[6]?.v) || 1,
                    avatar: row[7]?.v || '🎲'
                };
            }
        }
        return players;
    } catch (error) {
        console.error('Error al cargar datos:', error);
        return {};
    }
}

async function savePlayerToCloud(player) {
    // Esta función requiere un Google Apps Script desplegado
    // Por ahora guardamos localmente y mostramos mensaje
    console.log('Datos a guardar:', player);
    showNotification('💾 Progreso guardado localmente. Para guardar online, configura Google Apps Script.', true);
    
    // Guardar en localStorage como respaldo
    localStorage.setItem(`casino_backup_${player.username}`, JSON.stringify(player));
}

async function updateRankingUI() {
    const players = await fetchAllPlayers();
    const ranking = Object.values(players)
        .sort((a, b) => (b.bestWin || 0) - (a.bestWin || 0))
        .slice(0, 15);
    
    const rankingHTML = ranking.map((player, idx) => `
        <div class="ranking-item ${idx === 0 ? 'top-1' : idx === 1 ? 'top-2' : idx === 2 ? 'top-3' : ''}">
            <span class="rank">${idx === 0 ? '👑' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx+1}`}</span>
            <span class="name">${player.avatar || '🎲'} ${player.username}</span>
            <span class="score">💰 $${(player.bestWin || 0).toLocaleString()}</span>
            <span class="score">🎯 Nv.${player.level || 1}</span>
        </div>
    `).join('');
    
    document.getElementById('rankingList').innerHTML = rankingHTML || '<div style="text-align:center;padding:20px;">Cargando ranking...</div>';
    document.getElementById('rankingStatus').innerHTML = `✅ ${ranking.length} jugadores registrados`;
}

// Auto-actualizar ranking cada 10 segundos
setInterval(() => {
    if (document.getElementById('rankingList')) {
        updateRankingUI();
    }
}, 10000);