// script.js - Modelo con infusión adaptativa (k * CC)
const ui = {
    ccLiquid: document.getElementById('liquid-cc'),
    acoLiquid: document.getElementById('liquid-aco'),
    ccVal: document.getElementById('val-cc'),
    acoVal: document.getElementById('val-aco'),
    cdrVal: document.getElementById('val-cdr'),
    acodrVal: document.getElementById('val-acodr'),
    infusionVal: document.getElementById('val-infusion'),
    dayVal: document.getElementById('val-day'),
    statusTxt: document.getElementById('estado-paciente'),
    eventLog: document.getElementById('event-log'),
    btnPlay: document.getElementById('btn-play'),
    btnReset: document.getElementById('btn-reset'),
    inpDosis: document.getElementById('input-dosis'),
    inpAcocf: document.getElementById('input-acocf'),
    inpInfusion: document.getElementById('input-infusion'),
    lblDosis: document.getElementById('lbl-dosis'),
    lblAcocf: document.getElementById('lbl-acocf'),
    lblInfusion: document.getElementById('lbl-infusion')
};

const CGF = 0.01;
const ACOGF = 0.2;
const ACODR_CF = 0.015;      // Mortalidad reducida
const DT = 0.1;
const MAX_DAYS = 200;
const CC_INICIAL = 1000.0;
const CC_DEATH_THRESHOLD = 1500;

let CC = CC_INICIAL;
let ACO = 1.0;
let CDR_CF;
let kInfusion;
let currentDay = 0.0;
let simulationInterval = null;
let chart = null;
let flags = { remision: false, pacienteMuerto: false };

document.addEventListener('DOMContentLoaded', () => {
    initChart();
    resetSimulation();
    attachEventListeners();
});

function attachEventListeners() {
    ui.btnPlay.addEventListener('click', playSimulation);
    ui.btnReset.addEventListener('click', resetSimulation);
    ui.inpDosis.addEventListener('input', (e) => { ui.lblDosis.innerText = e.target.value; resetSimulation(); });
    ui.inpAcocf.addEventListener('input', (e) => { ui.lblAcocf.innerText = e.target.value; resetSimulation(); });
    ui.inpInfusion.addEventListener('input', (e) => { ui.lblInfusion.innerText = e.target.value; resetSimulation(); });

    const btnInfo = document.getElementById('btn-info');
    const theorySection = document.getElementById('theory-section-content');
    if (btnInfo && theorySection) {
        btnInfo.addEventListener('click', () => {
            const hidden = theorySection.style.display === 'none';
            theorySection.style.display = hidden ? 'block' : 'none';
            btnInfo.classList.toggle('active');
        });
    }
}

function logEvent(msg, type = 'info') {
    const p = document.createElement('p');
    p.className = `log-entry ${type}`;
    p.innerText = msg;
    ui.eventLog.appendChild(p);
    ui.eventLog.scrollTop = ui.eventLog.scrollHeight;
}

function initChart() {
    const ctx = document.getElementById('graficoSimulacion');
    if (!ctx) return;
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'line',
        data: { labels: [], datasets: [
            { label: 'Cáncer (CC)', data: [], borderColor: '#f7768e', backgroundColor: 'rgba(247,118,142,0.1)', pointRadius: 0, borderWidth: 2, tension: 0.1 },
            { label: 'ACO', data: [], borderColor: '#7aa2f7', backgroundColor: 'rgba(122,162,247,0.1)', pointRadius: 0, borderWidth: 2, tension: 0.1 }
        ]},
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            plugins: { legend: { labels: { color: '#495057' } } },
            scales: {
                y: { ticks: { color: '#495057' }, grid: { color: '#dee2e6' } },
                x: { ticks: { color: '#495057' }, grid: { color: '#dee2e6' } }
            }
        }
    });
}

function simulationStep() {
    if (currentDay >= MAX_DAYS) {
        logEvent('Fin de simulación (día 60)', 'info');
        pauseSimulation();
        return;
    }
    const cgr = CC * CGF;
    const cdr = CC * ACO * CDR_CF;
    const acogr = ACO * ACOGF;
    const acodr = ACO * CC * ACODR_CF;
    const infusion = kInfusion * CC;

    CC = Math.max(0, CC + DT * (cgr - cdr));
    ACO = Math.max(0, ACO + DT * (acogr - acodr + infusion));
    currentDay += DT;

    if (CC > CC_DEATH_THRESHOLD && !flags.pacienteMuerto) {
        logEvent('FATAL: Sobrecarga tumoral (>1500)', 'danger');
        ui.statusTxt.innerText = 'PACIENTE FALLECIDO';
        ui.statusTxt.className = 'status-critical';
        flags.pacienteMuerto = true;
        pauseSimulation();
    }
    if (CC <= 0 && !flags.remision) {
        logEvent('ÉXITO: Remisión completa', 'success');
        ui.statusTxt.innerText = 'REMISIÓN COMPLETA';
        ui.statusTxt.className = 'status-remission';
        flags.remision = true;
        pauseSimulation();
    }
    actualizarDashboard(cdr, acodr, infusion);
}

function actualizarDashboard(cdr, acodr, infusion) {
    ui.ccVal.innerText = CC.toFixed(1);
    ui.acoVal.innerText = ACO.toFixed(2);
    ui.cdrVal.innerText = cdr.toFixed(2);
    ui.acodrVal.innerText = acodr.toFixed(2);
    ui.infusionVal.innerText = infusion.toFixed(2);
    ui.dayVal.innerText = currentDay.toFixed(1);
    ui.ccLiquid.style.height = Math.min(100, (CC / 1500) * 100) + '%';
    ui.acoLiquid.style.height = Math.min(100, (ACO / 10) * 100) + '%';
    if (chart) {
        chart.data.labels.push(currentDay.toFixed(1));
        chart.data.datasets[0].data.push(CC);
        chart.data.datasets[1].data.push(ACO);
        chart.update();
    }
}

function refrescarUIInicial() {
    ui.ccVal.innerText = CC.toFixed(1);
    ui.acoVal.innerText = ACO.toFixed(2);
    ui.cdrVal.innerText = '0.00';
    ui.acodrVal.innerText = '0.00';
    ui.infusionVal.innerText = (kInfusion * CC).toFixed(2);
    ui.dayVal.innerText = '0.0';
    ui.ccLiquid.style.height = Math.min(100, (CC / 1500) * 100) + '%';
    ui.acoLiquid.style.height = Math.min(100, (ACO / 10) * 100) + '%';
    if (chart) {
        chart.data.labels = ['0'];
        chart.data.datasets[0].data = [CC];
        chart.data.datasets[1].data = [ACO];
        chart.update();
    }
}

function playSimulation() {
    if (!simulationInterval && !flags.pacienteMuerto && !flags.remision) {
        simulationInterval = setInterval(simulationStep, 40);
        ui.btnPlay.innerText = 'Pausar';
        logEvent('Simulación iniciada', 'info');
    } else if (simulationInterval) {
        pauseSimulation();
    }
}

function pauseSimulation() {
    clearInterval(simulationInterval);
    simulationInterval = null;
    ui.btnPlay.innerText = 'Continuar';
}

function resetSimulation() {
    clearInterval(simulationInterval);
    simulationInterval = null;
    ACO = parseFloat(ui.inpDosis.value) || 1.0;
    CDR_CF = parseFloat(ui.inpAcocf.value) || 0.005;
    kInfusion = parseFloat(ui.inpInfusion.value) || 0.02;
    CC = CC_INICIAL;
    currentDay = 0.0;
    flags = { remision: false, pacienteMuerto: false };
    ui.eventLog.innerHTML = '';
    ui.statusTxt.innerText = 'ESTADO: INICIAL';
    ui.statusTxt.className = 'status-stable';
    ui.btnPlay.innerText = 'Ejecutar Simulación';
    refrescarUIInicial();
}