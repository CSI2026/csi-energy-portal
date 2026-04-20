# CSI Energy Portal

**Circle Solutions Inc. — Field Sales Intelligence Platform**

A web app for Reliant Energy field agents to instantly compare customer electricity bills against your current Reliant rates.

---

## How to Deploy to GitHub Pages

### Step 1 — Create a GitHub repo
1. Go to [github.com](https://github.com) and sign in
2. Click **New repository**
3. Name it: `csi-energy-portal`
4. Set to **Public**
5. Click **Create repository**

### Step 2 — Upload the files
1. Click **uploading an existing file** on your new repo page
2. Drag and drop ALL files from this folder:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `main.js`
   - `README.md`
3. Click **Commit changes**

### Step 3 — Enable GitHub Pages
1. In your repo, click **Settings**
2. Scroll to **Pages** in the left menu
3. Under **Source**, select **Deploy from a branch**
4. Under **Branch**, select **main** and **/ (root)**
5. Click **Save**
6. Wait 1–2 minutes, then your app is live at:
   `https://YOUR-GITHUB-USERNAME.github.io/csi-energy-portal`

---

## First Time Setup (after deploy)

### 1. Add Your Anthropic API Key
- Log in as owner (see credentials below)
- Go to **⚙️ Settings** tab
- Paste your API key from [console.anthropic.com](https://console.anthropic.com)
- This enables AI photo scanning of customer bills

### 2. Set Your Daily Rates
- Go to **📊 Daily Rate Setup**
- Tap each plan card and fill in today's rates from your tablet
- Hit **Save & Push to Agents**

### 3. Create Agent Logins
- Go to **👥 Agents** tab
- Add each agent with their name, username, and password

---

## Login Credentials

### Owner (Calvin)
- **Username:** `calvin`
- **Password:** `CSI@owner2025`

### Default Agents (change these!)
- Agent 1: `agent1` / `agent123`
- Agent 2: `agent2` / `agent123`

> ⚠️ Change agent passwords after first login via the Agents tab.

---

## Daily Workflow

### Calvin (Owner) — Every Morning
1. Log in at your GitHub Pages URL
2. Go to **📊 Daily Rate Setup**
3. Fill in current rates from your Reliant tablet
4. Hit **Save** — agents instantly see the new rates

### Agents — All Day
1. Log in at the same URL
2. Today's rates are already loaded
3. Tap **📷 Photo Bill** and take a photo of the customer's bill
4. AI reads it automatically → instant 👍 or 👎 with savings amount
5. Or use **✏️ Manual Entry** to type in the numbers

---

## Data & Analytics

All analyzed bills are stored locally in the browser and sorted by:
- Provider (TXU, Green Mountain, Oncor, CoServ, etc.)
- Win/loss rate
- Average true cost per kWh
- Agent performance

Owner can export all data as CSV from the **📁 Bill Data** tab.

---

## Notes

- All data is stored in **browser localStorage** — this means data stays on the device used
- The API key is stored locally and never uploaded anywhere
- For team-wide data sync across devices, a backend upgrade would be needed (future phase)
- GitHub Pages is free and your app will stay live indefinitely
