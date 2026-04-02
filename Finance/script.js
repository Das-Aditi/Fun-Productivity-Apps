// State management
let state = {
    transactions: JSON.parse(localStorage.getItem('aditi_tx') || '[]'),
    goals: JSON.parse(localStorage.getItem('aditi_goals') || '[]'),
    // New structures
    accounts: JSON.parse(localStorage.getItem('aditi_accounts') || '[{"id":1, "name":"HDFC", "type":"Bank"}, {"id":2, "name":"Cash", "type":"Cash"}]'),
    fds: JSON.parse(localStorage.getItem('aditi_fds') || '[]'),
    notes: JSON.parse(localStorage.getItem('aditi_notes') || '{}')
};

let editingId = null;
let editingGoalId = null;
let charts = {};

function sync() {
    localStorage.setItem('aditi_tx', JSON.stringify(state.transactions));
    localStorage.setItem('aditi_goals', JSON.stringify(state.goals));
    updateUI();
}

function showPage(id, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(`page-${id}`).classList.add('active');
    el.classList.add('active');
    updateUI();
}

// Transactions Logic
function handleTransaction() {
    const data = {
        id: editingId || Date.now(),
        date: document.getElementById('f-date').value,
        desc: document.getElementById('f-desc').value,
        amt: parseFloat(document.getElementById('f-amt').value),
        cat: document.getElementById('f-cat').value,
        wallet: document.getElementById('f-wallet').value,
        type: document.getElementById('f-type').value
    };
    if (!data.date || !data.desc || isNaN(data.amt)) return alert("Check inputs!");

    if (editingId) {
        state.transactions = state.transactions.map(t => t.id === editingId ? data : t);
        editingId = null;
        document.getElementById('tx-form-title').innerText = "Add Transaction";
    } else {
        state.transactions.unshift(data);
    }
    resetTxForm();
    sync();
}

function resetTxForm() {
    document.getElementById('f-desc').value = '';
    document.getElementById('f-amt').value = '';
    document.getElementById('f-date').valueAsDate = new Date();
}

function editTx(id) {
    const t = state.transactions.find(x => x.id === id);
    document.getElementById('f-date').value = t.date;
    document.getElementById('f-desc').value = t.desc;
    document.getElementById('f-amt').value = t.amt;
    document.getElementById('f-cat').value = t.cat;
    document.getElementById('f-wallet').value = t.wallet;
    document.getElementById('f-type').value = t.type;
    editingId = id;
    document.getElementById('tx-form-title').innerText = "Edit Transaction ✏️";
    window.scrollTo(0, 0);
}

function deleteTx(id) {
    if(confirm("Delete transaction?")) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        sync();
    }
}

// Goals Logic
function handleGoal() {
    const name = document.getElementById('g-name').value;
    const target = parseFloat(document.getElementById('g-target').value);
    const saved = parseFloat(document.getElementById('g-saved').value) || 0;

    if (!name || isNaN(target)) return alert("Check inputs!");

    const goalData = { id: editingGoalId || Date.now(), name, target, current: saved };

    if (editingGoalId) {
        state.goals = state.goals.map(g => g.id === editingGoalId ? goalData : g);
        cancelGoalEdit();
    } else {
        state.goals.unshift(goalData);
    }
    
    document.getElementById('g-name').value = '';
    document.getElementById('g-target').value = '';
    document.getElementById('g-saved').value = '';
    sync();
}

function editGoal(id) {
    const g = state.goals.find(x => x.id === id);
    editingGoalId = id;
    document.getElementById('g-name').value = g.name;
    document.getElementById('g-target').value = g.target;
    document.getElementById('g-saved').value = g.current;
    document.getElementById('g-form-title').innerText = "Edit Goal Card ✏️";
    document.getElementById('g-save-btn').innerText = "Update Goal";
    document.getElementById('g-cancel-btn').classList.remove('hidden');
    window.scrollTo(0, 0);
}

function cancelGoalEdit() {
    editingGoalId = null;
    document.getElementById('g-form-title').innerText = "New Saving Goal";
    document.getElementById('g-save-btn').innerText = "Create Goal";
    document.getElementById('g-cancel-btn').classList.add('hidden');
    document.getElementById('g-name').value = '';
    document.getElementById('g-target').value = '';
    document.getElementById('g-saved').value = '';
}

function deleteGoal(id) {
    if(confirm("Delete goal?")) {
        state.goals = state.goals.filter(g => g.id !== id);
        sync();
    }
}

function updateGoal(id) {
    const amt = parseFloat(prompt("Add contribution (₹):"));
    if (isNaN(amt) || amt <= 0) return;
    state.goals = state.goals.map(g => g.id === id ? {...g, current: g.current + amt} : g);
    sync();
}

// UI Rendering
function updateUI() {
    renderOverview();
    renderTransactions();
    renderGoals();
}

function renderOverview() {
    const inc = state.transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amt, 0);
    const exp = state.transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amt, 0);
    
    const container = document.getElementById('overview-metrics');
    if (!container) return;

    container.innerHTML = `
        <div class="metric"><div class="metric-label">Total Balance</div><div class="metric-value">₹${(inc - exp).toLocaleString()}</div></div>
        <div class="metric"><div class="metric-label">Total Income</div><div class="metric-value text-green">₹${inc.toLocaleString()}</div></div>
        <div class="metric"><div class="metric-label">Total Expenses</div><div class="metric-value text-red">₹${exp.toLocaleString()}</div></div>
    `;
    initCharts();
}

function renderTransactions() {
    const list = document.getElementById('tx-list');
    const query = document.getElementById('tx-search').value.toLowerCase();
    let filtered = state.transactions.filter(t => t.desc.toLowerCase().includes(query) || t.cat.toLowerCase().includes(query));
    
    list.innerHTML = filtered.length ? "" : "<p style='color:var(--hint)'>No records found</p>";
    
    let lastDate = "";
    filtered.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(t => {
        if (t.date !== lastDate) { list.innerHTML += `<div class="tx-group-header">${t.date}</div>`; lastDate = t.date; }
        list.innerHTML += `
            <div class="tx-row">
                <div style="width: 40px; font-size: 20px;">${t.type === 'income' ? '💰' : '💸'}</div>
                <div class="tx-info"><div style="font-weight: 500">${t.desc}</div><div style="font-size: 11px; color: var(--muted)">${t.cat} • ${t.wallet}</div></div>
                <div class="tx-amt ${t.type === 'income' ? 'text-green' : 'text-red'}">${t.type === 'income' ? '+' : '-'} ₹${t.amt.toLocaleString()}</div>
                <button class="btn btn-ghost btn-sm" onclick="editTx(${t.id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteTx(${t.id})">✕</button>
            </div>`;
    });
}

function renderGoals() {
    const cont = document.getElementById('goal-container');
    const query = document.getElementById('goal-search').value.toLowerCase();
    const filtered = state.goals.filter(g => g.name.toLowerCase().includes(query));
    
    cont.innerHTML = filtered.length ? "" : "<p style='color:var(--hint); grid-column: span 3;'>No goals found</p>";
    cont.innerHTML += filtered.map(g => {
        const pct = Math.min(100, (g.current / g.target) * 100);
        return `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div class="metric-label">${g.name}</div>
                    <div style="display:flex; gap:6px;">
                        <button class="btn btn-ghost btn-sm" onclick="editGoal(${g.id})">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteGoal(${g.id})">✕</button>
                    </div>
                </div>
                <div class="metric-value" style="font-size: 18px">₹${g.current.toLocaleString()} / ₹${g.target.toLocaleString()}</div>
                <div style="height: 6px; background: var(--bg); border-radius: 3px; margin: 15px 0;">
                    <div style="width: ${pct}%; height: 100%; background: ${pct>=100?'var(--green)':'var(--blue)'}; border-radius: 3px; transition: width 0.4s ease;"></div>
                </div>
                <button class="btn btn-ghost" style="width: 100%" onclick="updateGoal(${g.id})">${pct>=100?'Completed! ✨':'Add Contribution'}</button>
            </div>`;
    }).join('');
}

function initCharts() {
    const summary = {};
    [...state.transactions].sort((a,b)=>new Date(a.date)-new Date(b.date)).forEach(t => {
        const k = t.date.slice(0, 7);
        if (!summary[k]) summary[k] = { label: new Date(t.date).toLocaleString('default', {month:'short', year:'2-digit'}), inc: 0, exp: 0 };
        t.type === 'income' ? summary[k].inc += t.amt : summary[k].exp += t.amt;
    });

    const labels = Object.values(summary).map(d => d.label);
    const incData = Object.values(summary).map(d => d.inc);
    const expData = Object.values(summary).map(d => d.exp);
    const savData = Object.values(summary).map(d => d.inc - d.exp);

    // Monthly Bar Chart
    if (charts.mix) charts.mix.destroy();
    const mixCtx = document.getElementById('chartMix');
    if (mixCtx) {
        charts.mix = new Chart(mixCtx.getContext('2d'), {
            type: 'bar', data: { labels, datasets: [{label:'Inc', data:incData, backgroundColor:'#2dd98f'}, {label:'Exp', data:expData, backgroundColor:'#ff5f57'}] },
            options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} }
        });
    }

    // Savings Trend Chart
    if (charts.trend) charts.trend.destroy();
    const trendCtx = document.getElementById('chartTrend');
    if (trendCtx) {
        charts.trend = new Chart(trendCtx.getContext('2d'), {
            type: 'line', data: { labels, datasets: [{label:'Savings', data:savData, borderColor:'#4f8ef7', fill:true, backgroundColor:'rgba(79,142,247,0.1)', tension:0.4}] },
            options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} }
        });
    }
}

// Data Persistence
function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const link = document.createElement('a');
    link.setAttribute("href", dataStr);
    link.setAttribute("download", "finance_backup.json");
    link.click();
}

function importData(e) {
    const r = new FileReader();
    r.onload = (ev) => {
        state = JSON.parse(ev.target.result);
        sync();
    };
    r.readAsText(e.target.files[0]);
}


// Add a new Bank or Wallet
function addAccount() {
    const name = document.getElementById('acc-name').value;
    const type = document.getElementById('acc-type').value;
    if(!name) return;

    state.accounts.push({ id: Date.now(), name, type });
    document.getElementById('acc-name').value = '';
    sync(); // This calls localStorage.setItem and updateUI()
}

// Fixed Deposit Logic
function showFDForm() {
    document.getElementById('fd-form').classList.toggle('hidden');
}

function saveFD() {
    const fd = {
        id: Date.now(),
        bank: document.getElementById('fd-bank').value,
        amount: parseFloat(document.getElementById('fd-amount').value),
        rate: parseFloat(document.getElementById('fd-rate').value),
        maturity: document.getElementById('fd-maturity').value
    };
    if(!fd.bank || isNaN(fd.amount)) return;
    
    state.fds.push(fd);
    document.getElementById('fd-form').classList.add('hidden');
    sync();
}

// Rendering the Bank Cards
function renderAccounts() {
    const container = document.getElementById('bank-cards-container');
    container.innerHTML = state.accounts.map(acc => {
        // Calculate balance for THIS specific account
        const balance = state.transactions
            .filter(t => t.wallet === acc.name)
            .reduce((s, t) => s + (t.type === 'income' ? t.amt : -t.amt), 0);

        return `
            <div class="card" style="border-top: 3px solid ${acc.type === 'Cash' ? 'var(--amber)' : 'var(--blue)'}">
                <div class="metric-label">${acc.type}</div>
                <div style="font-size: 18px; font-weight: 600; margin-bottom:10px;">${acc.name}</div>
                <div class="metric-value">₹${balance.toLocaleString()}</div>
                <textarea class="note-pad" style="height:80px; font-size:12px;" 
                    placeholder="Plan for ${acc.name}..." 
                    oninput="saveAccNote('${acc.name}', this.value)">${state.notes[acc.name] || ''}</textarea>
            </div>
        `;
    }).join('');
}

function renderFDs() {
    const list = document.getElementById('fd-list');
    if(state.fds.length === 0) {
        list.innerHTML = `<p style="color:var(--hint)">No active FDs tracked.</p>`;
        return;
    }

    list.innerHTML = `
        <table style="width:100%; border-collapse:collapse; margin-top:10px;">
            <thead style="text-align:left; color:var(--muted); font-size:11px; text-transform:uppercase;">
                <tr><th style="padding:10px">Bank</th><th>Amount</th><th>Interest</th><th>Maturity</th><th>Action</th></tr>
            </thead>
            <tbody>
                ${state.fds.map(fd => `
                    <tr style="border-top:1px solid var(--border)">
                        <td style="padding:12px">${fd.bank}</td>
                        <td style="font-weight:600">₹${fd.amount.toLocaleString()}</td>
                        <td class="text-green">${fd.rate}%</td>
                        <td style="color:var(--muted)">${fd.maturity}</td>
                        <td><button class="btn btn-danger btn-sm" onclick="deleteFD(${fd.id})">✕</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function deleteFD(id) {
    state.fds = state.fds.filter(f => f.id !== id);
    sync();
}

function saveAccNote(accName, val) {
    state.notes[accName] = val;
    localStorage.setItem('aditi_notes', JSON.stringify(state.notes));
}

// Initial Boot
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('f-date');
    if (dateInput) dateInput.valueAsDate = new Date();
    updateUI();
});