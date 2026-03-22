# DDNS Worker

A lightweight Dynamic DNS worker built on [Cloudflare Workers](https://workers.cloudflare.com/). It receives update requests from your router and keeps your DNS A record pointed at your current public IP — no third-party DDNS service needed.

## How it works

1. Your router periodically sends an HTTPS request to the worker (Basic Auth)
2. The worker looks up the DNS record ID for the requested hostname via the Cloudflare API
3. It updates the A record with the router's public IP (read from the `CF-Connecting-IP` header)

## Prerequisites

- A Cloudflare account with your domain's DNS managed by Cloudflare
- [Node.js](https://nodejs.org/) and [Wrangler](https://developers.cloudflare.com/workers/wrangler/) installed
- A Cloudflare API token with **Zone > DNS > Edit** permission for your zone

## Setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/ddns-worker
cd ddns-worker
npm install
```

### 2. Configure `wrangler.toml`

Edit the route to match your custom domain:

```toml
[[routes]]
pattern = "ddns.yourdomain.com"
custom_domain = true
```

### 3. Set secrets

```bash
wrangler secret put DDNS_USERNAME   # username your router will use
wrangler secret put DDNS_PASSWORD   # password your router will use
wrangler secret put ZONE_ID         # Cloudflare Zone ID (found in the domain dashboard)
wrangler secret put CF_API_TOKEN    # Cloudflare API token with DNS Edit permission
```

### 4. Deploy

```bash
npm run deploy
```

## Router configuration

In your router's custom DDNS settings:

| Field | Value |
|-------|-------|
| Connection Type | `HTTPS` |
| URL Update | `ddns.yourdomain.com?hostname=home.yourdomain.com` |
| Hostname | `home.yourdomain.com` |
| Username | *(your `DDNS_USERNAME`)* |
| Password | *(your `DDNS_PASSWORD`)* |

## Local development

```bash
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run deploy` | Deploy to Cloudflare Workers |
| `npm run dev` | Start local dev server |
| `npm run type-check` | Run TypeScript type checking |
