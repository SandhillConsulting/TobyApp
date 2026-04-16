# Toby's Quest -- deployment guide

## What you're deploying

Four files, two services:

| File | Where it goes | What it does |
|------|--------------|--------------|
| `index.html` | GitHub Pages | The entire app -- UI, logic, everything |
| `worker.js` | Cloudflare Workers | Tiny sync API (GET/PUT state as JSON) |
| `wrangler.toml` | Cloudflare Workers | Config for deploying the worker |
| `README.md` | GitHub repo | This file |

## Step 1: Deploy the Cloudflare Worker (the sync backend)

You need the Wrangler CLI. If you don't have it:

```bash
npm install -g wrangler
wrangler login
```

### 1a. Create the KV namespace

```bash
cd tobys-quest
wrangler kv namespace create QUEST_DATA
```

This will output something like:

```
{ binding = "QUEST_DATA", id = "abc123def456..." }
```

Copy the `id` value and paste it into `wrangler.toml`, replacing `PASTE_YOUR_KV_NAMESPACE_ID_HERE`.

### 1b. Set the PIN secret

Choose a PIN (4-6 digits) that Toby will use. Then:

```bash
wrangler secret put QUEST_PIN
```

It will prompt you to enter the value. Type your PIN (e.g. `4829`) and press Enter.

### 1c. Deploy the worker

```bash
wrangler deploy
```

This will output the worker URL, something like:

```
https://tobys-quest-api.yourname.workers.dev
```

Note this URL -- you need it for the next step.

### 1d. Test it

```bash
# Should return {} (empty state)
curl "https://tobys-quest-api.yourname.workers.dev/sync?pin=YOUR_PIN"

# Should return "Unauthorised"
curl "https://tobys-quest-api.yourname.workers.dev/sync?pin=wrong"
```

## Step 2: Configure the app

Open `index.html` and find this line near the top of the `<script>` block:

```javascript
const SYNC_URL = "PASTE_YOUR_WORKER_URL_HERE/sync";
```

Replace it with your actual worker URL:

```javascript
const SYNC_URL = "https://tobys-quest-api.yourname.workers.dev/sync";
```

## Step 3: Deploy to GitHub Pages

### 3a. Create a GitHub repo

Create a new repo (e.g. `tobys-quest`). It can be private -- GitHub Pages works with private repos on free accounts.

### 3b. Push the files

```bash
cd tobys-quest
git init
git add index.html README.md
git commit -m "Initial deploy"
git branch -M main
git remote add origin git@github.com:YOURUSERNAME/tobys-quest.git
git push -u origin main
```

Note: don't push `worker.js` or `wrangler.toml` to this repo -- they contain config you don't want public. Keep them locally or in a separate private repo.

### 3c. Enable GitHub Pages

1. Go to your repo on GitHub
2. Settings > Pages
3. Source: "Deploy from a branch"
4. Branch: `main`, folder: `/ (root)`
5. Save

After a minute or so, your app will be live at:

```
https://YOURUSERNAME.github.io/tobys-quest/
```

## Step 4: Set up Toby's devices

On each device (iPhone, Chromebook, Windows), open the URL in the browser. The app will ask for the PIN. Enter it once -- it's saved in the browser so he won't need to enter it again.

### iPhone -- add to home screen

1. Open the URL in Safari
2. Tap the share button (square with arrow)
3. Tap "Add to Home Screen"
4. It will appear as an app icon with the 🏅 favicon

### Chromebook

Bookmark the URL, or in Chrome: three dots menu > "Install page as app" (if available).

### Windows

Bookmark in whatever browser he uses. In Edge or Chrome, the three dots menu offers "Install this site as an app" which gives it its own window and taskbar icon.

## How the sync works

- Every time Toby logs an activity or cashes out, the app saves state in two places: locally in `localStorage` (instant, works offline) and remotely to Cloudflare KV via the Worker (cross-device sync).
- When the app loads, it fetches the latest state from the Worker. If the Worker is unreachable, it falls back to `localStorage`.
- The sync indicator dot in the header shows: green = synced, amber = syncing, red = offline/error.
- Last-write-wins. If Toby somehow uses two devices simultaneously, the last save will overwrite. In practice this won't happen -- he's one person using one device at a time.

## Changing settings

All configurable values are constants at the top of `index.html`:

| Setting | Current value | What it does |
|---------|--------------|--------------|
| `REWARD_RATE_PENCE` | `200` | Pence earned per badge (£2.00) |
| `BADGE_THRESHOLD` | `30` | Minutes of study per badge |
| `CATEGORIES` | 3 items | Task categories and their display settings |
| `MILESTONES` | 5 items | Badge count thresholds and titles |

Edit, commit, push -- GitHub Pages will redeploy automatically.

## Costs

- GitHub Pages: free
- Cloudflare Workers free tier: 100,000 requests/day, 1GB KV storage
- Realistic usage: maybe 10-20 requests/day

Total ongoing cost: £0.00.

## Security notes

- The PIN is not military-grade security. It prevents casual access and stops bots. It's sent as a query parameter over HTTPS, so it's encrypted in transit.
- The Worker has CORS set to `*` so the app works from any origin. If you want to lock it down, change `Access-Control-Allow-Origin` to your GitHub Pages URL.
- The KV data is plain JSON. Cloudflare encrypts at rest by default.
- For a teenager's pocket money tracker, this is more than adequate.
