// ─── CSI Portal — UI Controller ───────────────────────────────────────────────

let currentUser = null;
let currentMode = "photo";

// ── Boot ─────────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  APP.initDefaultAgents();
  const session = APP.getSession();
  if (session) {
    currentUser = session;
    showPortal(session);
  }
  // Set enter key on login
  ["login-user","login-pass"].forEach(id => {
    document.getElementById(id).addEventListener("keydown", e => {
      if (e.key === "Enter") doLogin();
    });
  });
});

// ── Auth ─────────────────────────────────────────────────────────────────────
function doLogin() {
  const u = document.getElementById("login-user").value;
  const p = document.getElementById("login-pass").value;
  const user = APP.login(u, p);
  if (!user) {
    document.getElementById("login-err").classList.remove("hidden");
    document.getElementById("login-pass").value = "";
    return;
  }
  document.getElementById("login-err").classList.add("hidden");
  currentUser = user;
  APP.setSession(user);
  showPortal(user);
}

function doLogout() {
  APP.clearSession();
  currentUser = null;
  showScreen("login");
  document.getElementById("login-user").value = "";
  document.getElementById("login-pass").value = "";
}

function showPortal(user) {
  if (user.role === "owner") {
    showScreen("owner");
    document.getElementById("owner-greeting").textContent = `Welcome, ${user.name}`;
    document.getElementById("rates-date").textContent = APP.todayKey();
    renderPlanCards();
    renderAgentList();
  } else {
    showScreen("agent");
    document.getElementById("agent-greeting").textContent = user.name;
    document.getElementById("agent-rates-date").textContent = APP.todayKey();
    const plans = APP.buildActivePlans();
    document.getElementById("agent-plans-loaded").textContent =
      plans.length ? `${plans.length} Reliant plans loaded for today` : "⚠️ No rates loaded — contact owner";
    renderAgentRates();
    renderAgentHistory();
  }
}

function showScreen(name) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(`screen-${name}`).classList.add("active");
}

// ── Owner — Tab nav ───────────────────────────────────────────────────────────
function ownerTab(btn, tab) {
  document.querySelectorAll(".onav-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".owner-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(`owner-${tab}`).classList.add("active");
  if (tab === "data") renderOwnerData();
  if (tab === "settings") {
    const key = APP.getApiKey();
    if (key) document.getElementById("api-key-input").value = key;
  }
}

// ── Owner — Plan Cards ────────────────────────────────────────────────────────
function renderPlanCards() {
  const rates = APP.getRates();
  const container = document.getElementById("plan-cards");
  container.innerHTML = APP.PLAN_TEMPLATES.map(tmpl => {
    const v = rates[tmpl.id] || { baseCharge:"", r1:"", r2:"", tieredAt:"1000", avg500:"", avg1000:"", avg2000:"", etf:"" };
    return `
    <div class="plan-card" id="pc-${tmpl.id}">
      <div class="plan-card-header" onclick="togglePlanCard('${tmpl.id}')">
        <div>
          <div class="plan-card-name">${tmpl.name}</div>
          <div class="plan-card-meta">${tmpl.term}-month term
            ${v.r1 ? `<span class="plan-ready">✓ ${v.avg1000||v.r1}¢ avg</span>` : '<span class="plan-empty">Not filled in</span>'}
          </div>
        </div>
        <span class="plan-card-arrow">▼</span>
      </div>
      <div class="plan-card-body" id="pcb-${tmpl.id}">
        <div class="field-row-2">
          <div class="field-group"><label class="field-label">Base Charge ($)</label>
            <input class="field-input" id="pv-${tmpl.id}-baseCharge" value="${v.baseCharge}" placeholder="0.00" type="number" step="0.01"></div>
          <div class="field-group"><label class="field-label">Termination Fee ($)</label>
            <input class="field-input" id="pv-${tmpl.id}-etf" value="${v.etf}" placeholder="e.g. 295" type="number"></div>
        </div>
        <div class="section-label">ENERGY RATE (¢ per kWh)</div>
        <div class="field-row-3">
          <div class="field-group"><label class="field-label">Tier 1 Rate (¢)</label>
            <input class="field-input" id="pv-${tmpl.id}-r1" value="${v.r1}" placeholder="e.g. 10.1201" type="number" step="0.0001"></div>
          <div class="field-group"><label class="field-label">Up to (kWh)</label>
            <input class="field-input" id="pv-${tmpl.id}-tieredAt" value="${v.tieredAt||1000}" placeholder="1000" type="number"></div>
          <div class="field-group"><label class="field-label">Tier 2 Rate (¢)</label>
            <input class="field-input" id="pv-${tmpl.id}-r2" value="${v.r2}" placeholder="optional" type="number" step="0.0001"></div>
        </div>
        <div class="section-label">AVG PRICE AS SHOWN ON TABLET (¢/kWh)</div>
        <div class="field-row-3">
          <div class="field-group"><label class="field-label">@ 500 kWh</label>
            <input class="field-input" id="pv-${tmpl.id}-avg500" value="${v.avg500}" placeholder="—" type="number" step="0.1"></div>
          <div class="field-group"><label class="field-label">@ 1000 kWh</label>
            <input class="field-input" id="pv-${tmpl.id}-avg1000" value="${v.avg1000}" placeholder="—" type="number" step="0.1"></div>
          <div class="field-group"><label class="field-label">@ 2000 kWh</label>
            <input class="field-input" id="pv-${tmpl.id}-avg2000" value="${v.avg2000}" placeholder="—" type="number" step="0.1"></div>
        </div>
      </div>
    </div>`;
  }).join("");
}

function togglePlanCard(id) {
  const body = document.getElementById(`pcb-${id}`);
  const arrow = document.querySelector(`#pc-${id} .plan-card-arrow`);
  body.classList.toggle("open");
  arrow.textContent = body.classList.contains("open") ? "▲" : "▼";
}

function saveAllRates() {
  const plans = {};
  APP.PLAN_TEMPLATES.forEach(tmpl => {
    const get = f => (document.getElementById(`pv-${tmpl.id}-${f}`)?.value || "");
    plans[tmpl.id] = {
      baseCharge: get("baseCharge"), r1: get("r1"), r2: get("r2"),
      tieredAt: get("tieredAt"), avg500: get("avg500"),
      avg1000: get("avg1000"), avg2000: get("avg2000"), etf: get("etf"),
    };
  });
  APP.saveRates(plans);
  const msg = document.getElementById("rates-saved");
  msg.classList.remove("hidden");
  setTimeout(() => msg.classList.add("hidden"), 3000);
  renderPlanCards();
}

// ── Owner — Agents ────────────────────────────────────────────────────────────
function renderAgentList() {
  const agents = APP.getAgents();
  document.getElementById("agent-list").innerHTML = agents.length ? agents.map(a => `
    <div class="agent-row">
      <div>
        <div class="agent-name">${a.name}</div>
        <div class="agent-meta">@${a.username} · ${a.active ? '<span style="color:#66ff44">Active</span>' : '<span style="color:#ff6666">Inactive</span>'}</div>
      </div>
      <div class="agent-actions">
        <button class="btn-tiny" onclick="toggleAgent('${a.id}')">${a.active ? "Deactivate" : "Activate"}</button>
        <button class="btn-tiny danger" onclick="deleteAgent('${a.id}')">Remove</button>
      </div>
    </div>`).join("") : '<div class="empty-state">No agents added yet.</div>';
}

function addAgent() {
  const name = document.getElementById("new-agent-name").value.trim();
  const username = document.getElementById("new-agent-user").value.trim().toLowerCase();
  const password = document.getElementById("new-agent-pass").value.trim();
  const msg = document.getElementById("agent-msg");
  if (!name || !username || !password) { showMsg(msg, "All fields required", true); return; }
  const agents = APP.getAgents();
  if (agents.find(a => a.username === username)) { showMsg(msg, "Username already taken", true); return; }
  agents.push({ id: Date.now().toString(), username, password, name, active: true });
  APP.saveAgents(agents);
  document.getElementById("new-agent-name").value = "";
  document.getElementById("new-agent-user").value = "";
  document.getElementById("new-agent-pass").value = "";
  showMsg(msg, `✅ Agent "${name}" added!`, false);
  renderAgentList();
}

function toggleAgent(id) {
  const agents = APP.getAgents();
  const a = agents.find(x => x.id === id);
  if (a) { a.active = !a.active; APP.saveAgents(agents); renderAgentList(); }
}

function deleteAgent(id) {
  if (!confirm("Remove this agent?")) return;
  APP.saveAgents(APP.getAgents().filter(a => a.id !== id));
  renderAgentList();
}

// ── Owner — Data ──────────────────────────────────────────────────────────────
function renderOwnerData() {
  const stats = APP.getStats();
  document.getElementById("stats-cards").innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-num">${stats.totalBills}</div><div class="stat-lbl">Total Bills</div></div>
      <div class="stat-card"><div class="stat-num">${stats.todayBills}</div><div class="stat-lbl">Today</div></div>
      <div class="stat-card win"><div class="stat-num">${stats.todayWins}</div><div class="stat-lbl">Today's Wins</div></div>
      <div class="stat-card"><div class="stat-num">${stats.winRate}%</div><div class="stat-lbl">Win Rate</div></div>
    </div>`;

  const providers = Object.entries(stats.providers).sort((a,b)=>b[1].count-a[1].count);
  document.getElementById("provider-breakdown").innerHTML = providers.length ? `
    <div class="section-label" style="margin:16px 0 8px">PROVIDER BREAKDOWN</div>
    ${providers.map(([name,d])=>`
    <div class="provider-row">
      <div class="provider-name">${name}</div>
      <div class="provider-stats">
        <span>${d.count} bills</span>
        <span>${d.avgRate.toFixed(2)}¢ avg</span>
        <span style="color:${d.wins/d.count>0.5?'#66ff44':'#ff9500'}">${Math.round(d.wins/d.count*100)}% win</span>
      </div>
    </div>`).join("")}` : "";

  document.getElementById("bill-history-list").innerHTML = stats.recentBills.length ? `
    <div class="section-label" style="margin:16px 0 8px">RECENT BILLS (LAST 20)</div>
    ${stats.recentBills.map(b=>`
    <div class="history-row ${b.weWin?'win':'loss'}">
      <div class="history-verdict">${b.weWin?'👍':'👎'}</div>
      <div class="history-info">
        <div class="history-provider">${b.provider} · ${b.kwh.toLocaleString()} kWh</div>
        <div class="history-meta">${b.agent} · ${b.date.slice(0,10)}</div>
      </div>
      <div class="history-nums">
        <div class="history-rate">${b.trueRateCents}¢/kWh</div>
        <div class="history-save ${b.weWin?'save':'cost'}">${b.weWin?`-$${b.savings.toFixed(2)}`:`+$${Math.abs(b.savings).toFixed(2)}`}/mo</div>
      </div>
    </div>`).join("")}` : '<div class="empty-state">No bill data yet. Start analyzing!</div>';
}

function exportData() {
  const history = APP.getBillHistory();
  if (!history.length) { alert("No data to export."); return; }
  const headers = ["Date","Agent","Provider","kWh","Their Total","True Rate (¢)","Best Plan","Savings","We Win"];
  const rows = history.map(b => [
    b.date.slice(0,10), b.agent, b.provider, b.kwh,
    b.theirTotal.toFixed(2), b.trueRateCents, b.bestPlan,
    b.savings.toFixed(2), b.weWin ? "YES" : "NO"
  ]);
  const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
  const a = document.createElement("a");
  a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = `csi-bills-${APP.todayKey()}.csv`;
  a.click();
}

function clearData() {
  if (!confirm("Delete ALL bill history? This cannot be undone.")) return;
  localStorage.removeItem("csi_bills");
  renderOwnerData();
}

// ── Owner — Settings ──────────────────────────────────────────────────────────
function saveApiKey() {
  const key = document.getElementById("api-key-input").value.trim();
  if (!key) { showMsg(document.getElementById("api-key-msg"), "Enter your API key first", true); return; }
  APP.setApiKey(key);
  showMsg(document.getElementById("api-key-msg"), "✅ API key saved!", false);
}

// ── Agent — Tab nav ───────────────────────────────────────────────────────────
function agentTab(btn, tab) {
  document.querySelectorAll(".anav-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".agent-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(`agent-${tab}`).classList.add("active");
  if (tab === "history") renderAgentHistory();
  if (tab === "rates") renderAgentRates();
}

// ── Agent — Mode toggle ───────────────────────────────────────────────────────
function setMode(mode) {
  currentMode = mode;
  document.getElementById("mode-photo").style.display = mode === "photo" ? "block" : "none";
  document.getElementById("mode-manual").style.display = mode === "manual" ? "block" : "none";
  document.getElementById("mode-photo-btn").classList.toggle("active", mode === "photo");
  document.getElementById("mode-manual-btn").classList.toggle("active", mode === "manual");
  document.getElementById("agent-result").classList.add("hidden");
}

// ── Agent — Photo scan ────────────────────────────────────────────────────────
async function handleBillPhoto(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  event.target.value = "";

  const zone = document.getElementById("upload-zone");
  const status = document.getElementById("scan-status");
  const thumb = URL.createObjectURL(file);

  zone.innerHTML = `<img src="${thumb}" style="max-width:100%;max-height:220px;border-radius:8px;object-fit:contain">`;
  status.className = "scan-status";
  status.innerHTML = `<div class="scanning-anim"><div class="scan-spinner"></div><span>Reading bill with AI...</span></div>`;

  try {
    const b64 = await fileToB64(file);
    const mime = getMime(file);
    const billData = await APP.scanBillImage(b64, mime);
    const result = APP.analyzeBill(billData);
    const record = APP.saveBillRecord(result, currentUser.id, currentUser.name);
    status.innerHTML = `<span style="color:#66ff44">✅ Bill read successfully</span>`;
    showResult(result);
  } catch(err) {
    status.innerHTML = `<span style="color:#ff6666">❌ ${err.message}</span>`;
  }
}

// ── Agent — Manual analysis ───────────────────────────────────────────────────
function runManualAnalysis() {
  const err = document.getElementById("manual-err");
  err.classList.add("hidden");
  const kwh = parseFloat(document.getElementById("m-kwh").value);
  if (!kwh || kwh <= 0) { err.textContent = "kWh usage is required"; err.classList.remove("hidden"); return; }
  const billData = {
    provider: document.getElementById("m-provider").value || "Unknown",
    base:    parseFloat(document.getElementById("m-base").value)    || 0,
    energy:  parseFloat(document.getElementById("m-energy").value)  || 0,
    tdu:     parseFloat(document.getElementById("m-tdu").value)     || 0,
    scrf:    parseFloat(document.getElementById("m-scrf").value)    || 0,
    gross:   parseFloat(document.getElementById("m-gross").value)   || 0,
    tax:     parseFloat(document.getElementById("m-tax").value)     || 0,
    misc:    parseFloat(document.getElementById("m-misc").value)    || 0,
    credits: parseFloat(document.getElementById("m-credits").value) || 0,
    kwh,
  };
  try {
    const result = APP.analyzeBill(billData);
    APP.saveBillRecord(result, currentUser.id, currentUser.name);
    showResult(result);
    // Clear form
    ["m-base","m-energy","m-tdu","m-scrf","m-gross","m-tax","m-misc","m-credits","m-kwh","m-provider"].forEach(id => {
      document.getElementById(id).value = "";
    });
  } catch(e) {
    err.textContent = e.message; err.classList.remove("hidden");
  }
}

// ── Result renderer ───────────────────────────────────────────────────────────
function showResult(result) {
  const el = document.getElementById("agent-result");
  const best = result.ranked[0];
  const sav = best.save > 0;
  el.innerHTML = `
    <div class="result-verdict ${sav?'win':'loss'}">
      <div class="verdict-emoji">${sav?'👍':'👎'}</div>
      <div class="verdict-text">${sav?'WE SAVE THEM':'NO SAVINGS'}</div>
      ${sav ? `
        <div class="verdict-amount">$${best.save.toFixed(2)}<span class="verdict-mo">/mo</span></div>
        <div class="verdict-annual">$${(best.save*12).toFixed(2)} saved annually</div>
      ` : `
        <div class="verdict-nocost">Reliant costs $${Math.abs(best.save).toFixed(2)}/mo more</div>
      `}
      <div class="verdict-plan">
        <span class="verdict-plan-label">BEST PLAN:</span>
        <span class="verdict-plan-name">${best.plan.name}</span>
      </div>
      <div class="verdict-sub">${result.kwh.toLocaleString()} kWh · ${result.billData.provider||'Current Provider'}</div>
    </div>

    <div class="rate-compare">
      <div class="rate-box their">
        <div class="rate-lbl">THEIR TRUE RATE</div>
        <div class="rate-num">${(result.trueRate*100).toFixed(2)}¢</div>
        <div class="rate-unit">/kWh all-in</div>
        <div class="rate-total">$${result.total.toFixed(2)}/mo</div>
      </div>
      <div class="rate-box ${sav?'reliant-win':'reliant-loss'}">
        <div class="rate-lbl">RELIANT BEST</div>
        <div class="rate-num ${sav?'green':'red'}">${(best.rate*100).toFixed(2)}¢</div>
        <div class="rate-unit">/kWh all-in</div>
        <div class="rate-total">$${best.mo.toFixed(2)}/mo</div>
      </div>
    </div>

    <div class="plans-ranked">
      <div class="section-label">ALL PLANS RANKED</div>
      ${result.ranked.map((r,i)=>`
      <div class="ranked-row ${i===0?'top':''}">
        <div class="ranked-info">
          <div class="ranked-name">${i===0?'⭐ ':''}${r.plan.name}</div>
          <div class="ranked-meta">${r.plan.term}mo · $${r.mo.toFixed(2)}/mo · ${(r.rate*100).toFixed(2)}¢/kWh</div>
        </div>
        <div class="ranked-save ${r.save>0?'save':'cost'}">${r.save>0?`-$${r.save.toFixed(2)}`:`+$${Math.abs(r.save).toFixed(2)}`}</div>
      </div>`).join("")}
    </div>

    <div class="bill-breakdown">
      <div class="section-label">THEIR BILL BREAKDOWN</div>
      ${[["Base Charge",result.billData.base],["Energy Charge",result.billData.energy],["TDU Delivery",result.billData.tdu],["SCRF/Regulatory",result.billData.scrf],["Gross Receipts",result.billData.gross],["Sales Tax",result.billData.tax],["Misc Charges",result.billData.misc]].filter(([,v])=>v>0).map(([l,v])=>`
      <div class="breakdown-row"><span class="breakdown-lbl">${l}</span><span>$${Number(v).toFixed(2)}</span></div>`).join("")}
      ${result.billData.credits>0?`<div class="breakdown-row"><span class="breakdown-lbl">Credits/Discounts</span><span style="color:#66ff44">-$${result.billData.credits.toFixed(2)}</span></div>`:""}
      <div class="breakdown-total"><span>TOTAL</span><span>$${result.total.toFixed(2)}</span></div>
    </div>

    <button class="btn-primary" onclick="resetScan()" style="margin-top:16px">📄 Next Customer</button>
  `;
  el.classList.remove("hidden");
  el.scrollIntoView({ behavior:"smooth", block:"start" });
}

function resetScan() {
  document.getElementById("agent-result").classList.add("hidden");
  document.getElementById("upload-zone").innerHTML = `
    <div id="upload-inner">
      <div class="upload-icon">📄</div>
      <div class="upload-title">TAP TO PHOTO BILL</div>
      <div class="upload-sub">AI reads all charges automatically</div>
    </div>`;
  document.getElementById("scan-status").className = "scan-status hidden";
  window.scrollTo({ top:0, behavior:"smooth" });
}

// ── Agent — Rates view ────────────────────────────────────────────────────────
function renderAgentRates() {
  const plans = APP.buildActivePlans();
  document.getElementById("agent-rates-list").innerHTML = plans.length ? plans.map(p=>`
    <div class="plan-view-card">
      <div class="plan-view-header">
        <div class="plan-view-name">${p.name}</div>
        <div class="plan-view-avg">${p.avg1000??((p.tiers[0].rate*100).toFixed(1))}¢</div>
      </div>
      <div class="plan-view-detail">
        ${p.term}-month · $${p.baseCharge.toFixed(2)} base charge
        ${p.etf ? ` · ETF: $${p.etf}` : ""}
      </div>
      <div class="plan-view-tiers">
        ${p.tiers.map(t=>`${(t.rate*100).toFixed(4)}¢/kWh${t.max?` (0–${t.max} kWh)":""}`).join(" → ")}
      </div>
      <div class="plan-view-avgs">
        ${p.avg500!=null?`<span>500kWh: ${p.avg500}¢</span>`:""}
        ${p.avg1000!=null?`<span>1000kWh: ${p.avg1000}¢</span>`:""}
        ${p.avg2000!=null?`<span>2000kWh: ${p.avg2000}¢</span>`:""}
      </div>
    </div>`).join("") : '<div class="empty-state">⚠️ No rates loaded for today. Ask your owner to update rates.</div>';
}

// ── Agent — History ───────────────────────────────────────────────────────────
function renderAgentHistory() {
  const history = APP.getBillHistory().filter(b => b.agentId === currentUser?.id);
  const today = APP.todayKey();
  const todayOnly = history.filter(b => b.date.startsWith(today));
  document.getElementById("agent-history-list").innerHTML = todayOnly.length ? todayOnly.map(b=>`
    <div class="history-row ${b.weWin?'win':'loss'}">
      <div class="history-verdict">${b.weWin?'👍':'👎'}</div>
      <div class="history-info">
        <div class="history-provider">${b.provider} · ${b.kwh.toLocaleString()} kWh</div>
        <div class="history-meta">${b.date.slice(11,16)} · ${b.bestPlan}</div>
      </div>
      <div class="history-nums">
        <div class="history-rate">${b.trueRateCents}¢/kWh</div>
        <div class="history-save ${b.weWin?'save':'cost'}">${b.weWin?`-$${b.savings.toFixed(2)}`:`+$${Math.abs(b.savings).toFixed(2)}`}/mo</div>
      </div>
    </div>`).join("") : '<div class="empty-state">No comparisons yet today. Start analyzing!</div>';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fileToB64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function getMime(file) {
  if (file.type?.startsWith("image/")) return file.type;
  const e = (file.name||"").split(".").pop().toLowerCase();
  return {png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",heic:"image/jpeg"}[e]||"image/jpeg";
}

function showMsg(el, text, isError) {
  el.textContent = text;
  el.style.color = isError ? "#ff6666" : "#66ff44";
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}
