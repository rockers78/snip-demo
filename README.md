# Snip Backend

Single-file Bun backend for a tiny URL shortener.

## Run

```bash
bun start
```

Env vars:
- `PORT` (default `3000`)
- `BASE_URL` (optional, used to build `shortUrl`)
- `RAILWAY_PUBLIC_DOMAIN` (used as `https://<domain>` when `BASE_URL` is unset)
- `PUBLIC_DIR` (optional static files directory; `/` serves `index.html`)

## API

- `POST /api/links` with `{ "url": "https://..." }` -> `201` link object
- `GET /api/links` -> `200` array of links
- `GET /:code` -> `302` redirect and increments hits, `404` if unknown
