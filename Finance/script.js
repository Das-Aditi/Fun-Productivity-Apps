// --- 1. STATE MANAGEMENT ---
let state = {
    transactions: JSON.parse(localStorage.getItem('aditi_tx') || '[]'),
    goals: JSON.parse(localStorage.getItem('aditi_goals') || '[]'),
    accounts: JSON.parse(localStorage.getItem('aditi_accounts') || '[{"id":1, "name":"HDFC", "type":"Bank"}, {"id":2, "name":"Cash", "type":"Cash"}]'),
    fds: JSON.parse(localStorage.getItem('aditi_fds') || '[]'),
    notes: JSON.parse(localStorage.getItem('aditi_notes') || '{}')
};

let editingId = null;
let editingGoalId = null;
let editingAccountId = null;
let editingFDId = null;
let charts = {};

function sync() {
    localStorage.setItem('aditi_tx', JSON.stringify(state.transactions));
    localStorage.setItem('aditi_goals', JSON.stringify(state.goals));
    localStorage.setItem('aditi_accounts', JSON.stringify(state.accounts));
    localStorage.setItem('aditi_fds', JSON.stringify(state.fds));
    localStorage.setItem('aditi_notes', JSON.stringify(state.notes));
    updateUI();
}

function showPage(id, el) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const targetPage = document.getElementById(`page-${id}`);
    if (targetPage) targetPage.classList.add('active');
    if (el) el.classList.add('active');
    updateUI();
}

// --- 2. TRANSACTIONS LOGIC ---
function handleTransaction() {
    const data = {
        id: editingId || Date.now(),
        date: document.getElementById('f-date').value,
        desc: document.getElementById('f-desc').value.trim(),
        amt: parseFloat(document.getElementById('f-amt').value),
        cat: document.getElementById('f-cat').value,
        wallet: document.getElementById('f-wallet').value,
        type: document.getElementById('f-type').value
    };

    if (!data.date || !data.desc || isNaN(data.amt)) return alert("Fill all fields correctly.");

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
    editingId = null;
}

function editTx(id) {
    const t = state.transactions.find(x => x.id === id);
    if (!t) return;
    document.getElementById('f-date').value = t.date;
    document.getElementById('f-desc').value = t.desc;
    document.getElementById('f-amt').value = t.amt;
    document.getElementById('f-cat').value = t.cat;
    document.getElementById('f-wallet').value = t.wallet;
    document.getElementById('f-type').value = t.type;
    editingId = id;
    document.getElementById('tx-form-title').innerText = "Edit Transaction ✏️";
    showPage('transactions', document.querySelector('[onclick*="transactions"]'));
}

function deleteTx(id) {
    if (confirm("Delete this transaction?")) {
        state.transactions = state.transactions.filter(t => t.id !== id);
        sync();
    }
}

// --- 3. ACCOUNTS LOGIC (FIXED) ---
function handleAccountAction() {
    const name = document.getElementById('acc-name').value.trim();
    const type = document.getElementById('acc-type').value;
    const newBalanceInput = parseFloat(document.getElementById('acc-initial-amt').value) || 0;

    if (!name) return alert("Enter account name");

    if (editingAccountId) {
        const oldAcc = state.accounts.find(a => a.id === editingAccountId);
        
        // Calculate current balance based on transactions
        const currentCalculatedBal = state.transactions
            .filter(t => t.wallet === oldAcc.name)
            .reduce((s, t) => s + (t.type === 'income' ? t.amt : -t.amt), 0);

        // If amount was changed in the edit form, create an adjustment
        if (newBalanceInput !== currentCalculatedBal) {
            const diff = newBalanceInput - currentCalculatedBal;
            state.transactions.unshift({
                id: Date.now(),
                date: new Date().toISOString().split('T')[0],
                desc: `Balance Adjustment: ${name}`,
                amt: Math.abs(diff),
                cat: 'Other',
                wallet: name,
                type: diff > 0 ? 'income' : 'expense'
            });
        }

        // Handle rename: update all transactions linked to this wallet
        if (oldAcc.name !== name) {
            state.transactions = state.transactions.map(t => t.wallet === oldAcc.name ? { ...t, wallet: name } : t);
        }

        state.accounts = state.accounts.map(acc => acc.id === editingAccountId ? { ...acc, name, type } : acc);
    } else {
        // Create new account
        state.accounts.push({ id: Date.now(), name, type });
        if (newBalanceInput !== 0) {
            state.transactions.unshift({
                id: Date.now(),
                date: new Date().toISOString().split('T')[0],
                desc: `Opening Balance: ${name}`,
                amt: newBalanceInput,
                cat: 'Other',
                wallet: name,
                type: 'income'
            });
        }
    }
    
    cancelAccountEdit();
    sync();
}

function editAccount(id) {
    const acc = state.accounts.find(x => x.id === id);
    editingAccountId = id;

    const currentBal = state.transactions
        .filter(t => t.wallet === acc.name)
        .reduce((s, t) => s + (t.type === 'income' ? t.amt : -t.amt), 0);

    document.getElementById('acc-name').value = acc.name;
    document.getElementById('acc-type').value = acc.type;
    document.getElementById('acc-initial-amt').value = currentBal;

    document.getElementById('acc-form-title').innerText = "Edit Account & Balance ✏️";
    document.getElementById('acc-btn-main').innerText = "Update Details";
    document.getElementById('acc-btn-cancel').classList.remove('hidden');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelAccountEdit() {
    editingAccountId = null;
    document.getElementById('acc-name').value = '';
    document.getElementById('acc-initial-amt').value = '';
    document.getElementById('acc-form-title').innerText = "🏦 Register New Account";
    document.getElementById('acc-btn-main').innerText = "Add Account";
    document.getElementById('acc-btn-cancel').classList.add('hidden');
}

function deleteAccount(id) {
    const acc = state.accounts.find(x => x.id === id);
    if (state.transactions.some(t => t.wallet === acc.name)) return alert("Cannot delete. Linked transactions exist.");
    if (confirm(`Delete ${acc.name}?`)) {
        state.accounts = state.accounts.filter(a => a.id !== id);
        sync();
    }
}

// --- 4. FD LOGIC (FIXED) ---
function showFDForm() {
    document.getElementById('fd-form').classList.toggle('hidden');
}

function handleFDAction() {
    const fdData = {
        id: editingFDId || Date.now(),
        bank: document.getElementById('fd-bank').value.trim(),
        beneficiary: document.getElementById('fd-beneficiary').value.trim() || 'Self',
        amount: parseFloat(document.getElementById('fd-amount').value),
        rate: parseFloat(document.getElementById('fd-rate').value),
        created: document.getElementById('fd-created').value,
        maturity: document.getElementById('fd-maturity').value
    };

    if (!fdData.bank || isNaN(fdData.amount) || !fdData.maturity) return alert("Fill Bank, Amount and Maturity!");

    if (editingFDId) {
        state.fds = state.fds.map(f => f.id === editingFDId ? fdData : f);
    } else {
        state.fds.push(fdData);
    }
    cancelFDEdit();
    sync();
}

function editFD(id) {
    const fd = state.fds.find(x => x.id === id);
    editingFDId = id;
    document.getElementById('fd-bank').value = fd.bank;
    document.getElementById('fd-beneficiary').value = fd.beneficiary;
    document.getElementById('fd-amount').value = fd.amount;
    document.getElementById('fd-rate').value = fd.rate;
    document.getElementById('fd-created').value = fd.created;
    document.getElementById('fd-maturity').value = fd.maturity;
    document.getElementById('fd-form-title').innerText = "Edit FD Details ✏️";
    document.getElementById('fd-btn-save').innerText = "Update FD";
    document.getElementById('fd-form').classList.remove('hidden');
    document.getElementById('fd-form').scrollIntoView({ behavior: 'smooth' });
}

function cancelFDEdit() {
    editingFDId = null;
    document.getElementById('fd-form').classList.add('hidden');
    document.getElementById('fd-form-title').innerText = "Fixed Deposit (FD) Manager";
    document.getElementById('fd-btn-save').innerText = "Save Investment";
    ['fd-bank', 'fd-beneficiary', 'fd-amount', 'fd-rate', 'fd-created', 'fd-maturity'].forEach(i => {
        const el = document.getElementById(i);
        if(el) el.value = '';
    });
}

// --- 5. GOALS LOGIC ---
function handleGoal() {
    const name = document.getElementById('g-name').value.trim();
    const target = parseFloat(document.getElementById('g-target').value);
    const saved = parseFloat(document.getElementById('g-saved').value) || 0;

    if (!name || isNaN(target)) return alert("Check Goal Name and Target!");

    const goalData = { id: editingGoalId || Date.now(), name, target, current: saved };

    if (editingGoalId) {
        state.goals = state.goals.map(g => g.id === editingGoalId ? goalData : g);
        cancelGoalEdit();
    } else {
        state.goals.unshift(goalData);
    }
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelGoalEdit() {
    editingGoalId = null;
    document.getElementById('g-form-title').innerText = "New Saving Goal";
    document.getElementById('g-save-btn').innerText = "Create Goal";
    document.getElementById('g-cancel-btn').classList.add('hidden');
    ['g-name', 'g-target', 'g-saved'].forEach(i => {
        const el = document.getElementById(i);
        if(el) el.value = '';
    });
}

function updateGoal(id) {
    const amt = parseFloat(prompt("Add contribution (₹):"));
    if (isNaN(amt) || amt <= 0) return;
    state.goals = state.goals.map(g => g.id === id ? { ...g, current: g.current + amt } : g);
    sync();
}

// --- 6. RENDER ENGINE ---
function updateUI() {
    renderOverview();
    renderTransactions();
    renderGoals();
    renderAccounts();
    renderFDs();
    populateWalletSelect();
}

function renderOverview() {
    const inc = state.transactions.filter(t => t.type === 'income').reduce((a, b) => a + b.amt, 0);
    const exp = state.transactions.filter(t => t.type === 'expense').reduce((a, b) => a + b.amt, 0);
    const container = document.getElementById('overview-metrics');
    if (container) {
        container.innerHTML = `
            <div class="metric"><div class="metric-label">Total Liquid Balance</div><div class="metric-value">₹${(inc - exp).toLocaleString()}</div></div>
            <div class="metric"><div class="metric-label">Total Income</div><div class="metric-value text-green">₹${inc.toLocaleString()}</div></div>
            <div class="metric"><div class="metric-label">Total Expenses</div><div class="metric-value text-red">₹${exp.toLocaleString()}</div></div>
        `;
    }
    initCharts();
}

function renderTransactions() {
    const list = document.getElementById('tx-list');
    if (!list) return;
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
    if (!cont) return;
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

function renderAccounts() {
    const container = document.getElementById('bank-cards-container');
    if (!container) return;
    container.innerHTML = state.accounts.map(acc => {
        const bal = state.transactions.filter(t => t.wallet === acc.name)
            .reduce((s, t) => s + (t.type === 'income' ? t.amt : -t.amt), 0);
        return `
            <div class="card" style="border-top: 3px solid ${acc.type === 'Cash' ? 'var(--amber)' : 'var(--blue)'}">
                <div style="display:flex; justify-content:space-between;">
                    <div><label class="metric-label">${acc.type}</label><div style="font-size:18px; font-weight:600;">${acc.name}</div></div>
                    <div style="display:flex; gap:5px;">
                        <button class="btn btn-ghost btn-sm" onclick="editAccount(${acc.id})">Edit</button>
                        <button class="btn btn-danger btn-sm" onclick="deleteAccount(${acc.id})">✕</button>
                    </div>
                </div>
                <div class="metric-value">₹${bal.toLocaleString()}</div>
                <textarea class="note-pad" style="width:100%; margin-top:10px; height:60px; background:var(--bg); color:white; border:1px solid var(--border); border-radius:4px; padding:5px; font-family:inherit;" 
                    placeholder="Notes..." oninput="saveAccNote('${acc.name}', this.value)">${state.notes[acc.name] || ''}</textarea>
            </div>`;
    }).join('');
}

function renderFDs() {
    const list = document.getElementById('fd-list');
    if (!list) return;
    if (state.fds.length === 0) { list.innerHTML = `<p style="color:var(--hint); padding:20px 0;">No active FDs.</p>`; return; }

    list.innerHTML = `
        <table style="width:100%; border-collapse:collapse; min-width:600px;">
            <thead style="text-align:left; color:var(--muted); font-size:11px; text-transform:uppercase;">
                <tr><th style="padding:12px">Bank & Beneficiary</th><th>Principal</th><th>Rate</th><th>Maturity</th><th>Action</th></tr>
            </thead>
            <tbody>
                ${state.fds.map(fd => `
                    <tr style="border-top:1px solid var(--border)">
                        <td style="padding:12px;"><strong>${fd.bank}</strong><br><small>👤 ${fd.beneficiary}</small></td>
                        <td style="font-weight:600">₹${fd.amount.toLocaleString()}</td>
                        <td class="text-green">${fd.rate}%</td>
                        <td>${fd.maturity}</td>
                        <td style="text-align:right">
                            <button class="btn btn-ghost btn-sm" onclick="editFD(${fd.id})">Edit</button>
                            <button class="btn btn-danger btn-sm" onclick="state.fds=state.fds.filter(f=>f.id!==${fd.id});sync()">✕</button>
                        </td>
                    </tr>`).join('')}
            </tbody>
        </table>`;
}

function populateWalletSelect() {
    const sel = document.getElementById('f-wallet');
    if (!sel) return;
    sel.innerHTML = state.accounts.map(acc => `<option value="${acc.name}">${acc.name} (${acc.type})</option>`).join('');
}

function saveAccNote(accName, val) {
    state.notes[accName] = val;
    localStorage.setItem('aditi_notes', JSON.stringify(state.notes));
}

// --- 7. CHARTS ---
function initCharts() {
    const summary = {};
    const sorted = [...state.transactions].sort((a,b)=>new Date(a.date)-new Date(b.date));
    sorted.forEach(t => {
        const k = t.date.slice(0, 7);
        if (!summary[k]) summary[k] = { label: new Date(t.date).toLocaleString('default', {month:'short', year:'2-digit'}), inc: 0, exp: 0 };
        t.type === 'income' ? summary[k].inc += t.amt : summary[k].exp += t.amt;
    });

    const labels = Object.values(summary).map(d => d.label);
    const incData = Object.values(summary).map(d => d.inc);
    const expData = Object.values(summary).map(d => d.exp);
    const savData = Object.values(summary).map(d => d.inc - d.exp);

    const mixCtx = document.getElementById('chartMix');
    if (mixCtx) {
        if (charts.mix) charts.mix.destroy();
        charts.mix = new Chart(mixCtx.getContext('2d'), {
            type: 'bar', data: { labels, datasets: [{label:'Inc', data:incData, backgroundColor:'#2dd98f'}, {label:'Exp', data:expData, backgroundColor:'#ff5f57'}] },
            options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} }
        });
    }

    const trendCtx = document.getElementById('chartTrend');
    if (trendCtx) {
        if (charts.trend) charts.trend.destroy();
        charts.trend = new Chart(trendCtx.getContext('2d'), {
            type: 'line', data: { labels, datasets: [{label:'Savings', data:savData, borderColor:'#4f8ef7', fill:true, backgroundColor:'rgba(79,142,247,0.1)', tension:0.4}] },
            options: { responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} }
        });
    }
}

// --- 8. UTILS ---
function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const link = document.createElement('a');
    link.setAttribute("href", dataStr);
    link.setAttribute("download", "finance_backup.json");
    link.click();
}

function importData(e) {
    const r = new FileReader();
    r.onload = (ev) => { try { state = JSON.parse(ev.target.result); sync(); } catch(e) { alert("Invalid JSON file"); } };
    r.readAsText(e.target.files[0]);
}

document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('f-date');
    if (dateInput) dateInput.valueAsDate = new Date();
    updateUI();
});