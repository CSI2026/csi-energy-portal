// ─── CSI Energy Portal — Core App Logic ───────────────────────────────────────
// All data stored in localStorage (GitHub Pages = no backend)
// API key stored locally per device — never uploaded anywhere

const APP = {
  version: "1.0.0",

  // ── Auth ────────────────────────────────────────────────────────────────────
  OWNER_CREDS: { username: "calvin", password: "CSI@owner2025" },

  getAgents() {
    return JSON.parse(localStorage.getItem("csi_agents") || "[]");
  },
  saveAgents(agents) {
    localStorage.setItem("csi_agents", JSON.stringify(agents));
  },
  initDefaultAgents() {
    if (!localStorage.getItem("csi_agents")) {
      this.saveAgents([
        { id: "a1", username: "agent1", password: "agent123", name: "Agent 1", active: true },
        { id: "a2", username: "agent2", password: "agent123", name: "Agent 2", active: true },
      ]);
    }
  },

  login(username, password) {
    const u = username.trim().toLowerCase();
    const p = password.trim();
    if (u === this.OWNER_CREDS.username && p === this.OWNER_CREDS.password) {
      return { role: "owner", name: "Calvin", id: "owner" };
    }
    const agents = this.getAgents();
    const agent = agents.find(a => a.username.toLowerCase() === u && a.password === p && a.active);
    if (agent) return { role: "agent", name: agent.name, id: agent.id };
    return null;
  },

  getSession() {
    try { return JSON.parse(sessionStorage.getItem("csi_session")); } catch { return null; }
  },
  setSession(user) {
    sessionStorage.setItem("csi_session", JSON.stringify(user));
  },
  clearSession() {
    sessionStorage.removeItem("csi_session");
  },

  // ── API Key ─────────────────────────────────────────────────────────────────
  getApiKey() { return localStorage.getItem("csi_apikey") || ""; },
  setApiKey(k) { localStorage.setItem("csi_apikey", k.trim()); },

  // ── Daily Rates (owner sets each morning) ───────────────────────────────────
  PLAN_TEMPLATES: [
    { id: "secure24",      name: "Reliant Secure® 24",       term: 24 },
    { id: "apartment24",   name: "Reliant Apartment 24",      term: 24 },
    { id: "secure12",      name: "Reliant Secure® 12",        term: 12 },
    { id: "plainsimple24", name: "Reliant Plain & Simple 24", term: 24 },
  ],

  PLAN_DEFAULTS: {
    secure24:      { baseCharge:"0",    r1:"10.1201", r2:"",        tieredAt:"1000", avg500:"15.9", avg1000:"16.6", avg2000:"17.0", etf:"295" },
    apartment24:   { baseCharge:"5.00", r1:"9.9701",  r2:"11.9701", tieredAt:"1000", avg500:"",     avg1000:"17.4", avg2000:"22.9", etf:"10"  },
    secure12:      { baseCharge:"5.00", r1:"16.8701", r2:"",        tieredAt:"1000", avg500:"23.4", avg1000:"22.9", avg2000:"18.9", etf:"150" },
    plainsimple24: { baseCharge:"0",    r1:"18.9499", r2:"",        tieredAt:"1000", avg500:"18.9", avg1000:"18.9", avg2000:"18.9", etf:"295" },
  },

  todayKey() { return new Date().toISOString().slice(0,10); },

  getRates() {
    try {
      const saved = JSON.parse(localStorage.getItem("csi_rates") || "{}");
      if (saved.date === this.todayKey()) return saved.plans;
    } catch {}
    return this.PLAN_DEFAULTS;
  },

  saveRates(plans) {
    localStorage.setItem("csi_rates", JSON.stringify({ date: this.todayKey(), plans }));
  },

  buildActivePlans() {
    const rates = this.getRates();
    return this.PLAN_TEMPLATES.map(tmpl => {
      const v = rates[tmpl.id];
      if (!v || !v.r1) return null;
      const r1 = parseFloat(v.r1) / 100;
      const tiers = [];
      if (v.r2 && !isNaN(parseFloat(v.r2))) {
        const cap = parseFloat(v.tieredAt) || 1000;
        tiers.push({ min:0, max:cap, rate:r1 });
        tiers.push({ min:cap, max:null, rate:parseFloat(v.r2)/100 });
      } else {
        tiers.push({ min:0, max:null, rate:r1 });
      }
      return {
        id: tmpl.id, name: tmpl.name, term: tmpl.term,
        baseCharge: parseFloat(v.baseCharge) || 0,
        tiers,
        avg500:  v.avg500  ? parseFloat(v.avg500)  : null,
        avg1000: v.avg1000 ? parseFloat(v.avg1000) : null,
        avg2000: v.avg2000 ? parseFloat(v.avg2000) : null,
        etf: v.etf ? parseFloat(v.etf) : null,
      };
    }).filter(Boolean);
  },

  calcCost(plan, kwh) {
    let e = 0, rem = kwh;
    for (const t of plan.tiers) {
      const top = t.max == null ? Infinity : t.max;
      const use = Math.min(rem, top - t.min);
      if (use <= 0) break;
      e += use * t.rate; rem -= use;
    }
    return plan.baseCharge + e;
  },

  // ── Bill Analysis ───────────────────────────────────────────────────────────
  async scanBillImage(b64, mime) {
    const key = this.getApiKey();
    if (!key) throw new Error("No API key set. Owner must add it in Settings.");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            { type:"image", source:{ type:"base64", media_type:mime, data:b64 } },
            { type:"text", text:`Analyze this electricity bill image carefully. Extract all charges and return ONLY a raw JSON object, no markdown:
{"provider":"string","base":0,"energy":0,"tdu":0,"scrf":0,"gross":0,"tax":0,"misc":0,"credits":0,"total":0,"kwh":0,"advertisedRate":null}
provider=company name, base=customer/base charge, energy=energy charge dollars, tdu=TDU/delivery charges, scrf=SCRF or regulatory fees, gross=gross receipts reimbursement, tax=sales tax, misc=other charges, credits=ALL credits/discounts as positive number (PCRF etc), total=total electric charges only, kwh=kilowatt hours used, advertisedRate=advertised cents per kWh if shown else null. Use 0 for missing. Always make best guess.` }
          ]
        }]
      })
    });
    const data = await res.json();
    if (data.error) throw new Error("API: " + (data.error.message || data.error.type));
    const text = data.content?.[0]?.text || "";
    if (!text) throw new Error("Empty API response");
    try { return JSON.parse(text.trim()); } catch {}
    try { return JSON.parse(text.replace(/```json|```/g,"").trim()); } catch {}
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new Error("Could not parse bill data: " + text.slice(0,100));
  },

  analyzeBill(billData) {
    const plans = this.buildActivePlans();
    if (!plans.length) throw new Error("No rates loaded for today.");
    const { kwh } = billData;
    if (!kwh || kwh <= 0) throw new Error("Invalid kWh usage");
    const charges = (billData.base||0)+(billData.energy||0)+(billData.tdu||0)+(billData.scrf||0)+(billData.gross||0)+(billData.tax||0)+(billData.misc||0)-(billData.credits||0);
    const total = charges > 1 ? charges : (billData.total || 0);
    const trueRate = total / kwh;
    const ranked = plans.map(p => {
      const mo = this.calcCost(p, kwh);
      return { plan:p, mo, rate:mo/kwh, save:total-mo };
    }).sort((a,b) => b.save - a.save);
    return { billData, total, trueRate, ranked, kwh };
  },

  // ── Bill History / Data Collection ─────────────────────────────────────────
  getBillHistory() {
    try { return JSON.parse(localStorage.getItem("csi_bills") || "[]"); } catch { return []; }
  },

  saveBillRecord(result, agentId, agentName) {
    const history = this.getBillHistory();
    const record = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      agent: agentName,
      agentId,
      provider: result.billData.provider || "Unknown",
      kwh: result.kwh,
      theirTotal: result.total,
      trueRateCents: parseFloat((result.trueRate * 100).toFixed(4)),
      bestPlan: result.ranked[0].plan.name,
      savings: parseFloat(result.ranked[0].save.toFixed(2)),
      weWin: result.ranked[0].save > 0,
      breakdown: result.billData,
    };
    history.unshift(record);
    // Keep last 500 records
    if (history.length > 500) history.splice(500);
    localStorage.setItem("csi_bills", JSON.stringify(history));
    return record;
  },

  getStats() {
    const history = this.getBillHistory();
    const today = this.todayKey();
    const todayBills = history.filter(b => b.date.startsWith(today));
    const providers = {};
    history.forEach(b => {
      const p = b.provider;
      if (!providers[p]) providers[p] = { count:0, totalKwh:0, avgRate:0, wins:0 };
      providers[p].count++;
      providers[p].totalKwh += b.kwh;
      providers[p].avgRate = ((providers[p].avgRate * (providers[p].count-1)) + b.trueRateCents) / providers[p].count;
      if (b.weWin) providers[p].wins++;
    });
    return {
      totalBills: history.length,
      todayBills: todayBills.length,
      todayWins: todayBills.filter(b=>b.weWin).length,
      winRate: history.length ? Math.round(history.filter(b=>b.weWin).length/history.length*100) : 0,
      providers,
      recentBills: history.slice(0,20),
    };
  },
};
