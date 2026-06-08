# Alien Signal

Astro + Cloudflare Workers + D1 signal map.

## Deploy To Cloudflare

This project uses `@astrojs/cloudflare` v13, which targets **Cloudflare Workers**. Do not deploy it as a Cloudflare Pages project; Pages validates `ASSETS` as a reserved binding name and will reject the generated Worker config.

1. Create the D1 database:

```bash
pnpm wrangler d1 create alien-signal
```

2. Put the returned `database_id` in `wrangler.toml`.

3. Apply migrations:

```bash
pnpm wrangler d1 migrations apply alien-signal --remote
```

4. Deploy as a Worker:

```bash
pnpm deploy
```

The deploy script runs:

```bash
pnpm build && wrangler deploy --config dist/server/wrangler.json
```

For Cloudflare Git deployments, create a Workers project and use:

```bash
pnpm build && pnpm wrangler deploy --config dist/server/wrangler.json
```
