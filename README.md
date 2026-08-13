# Snip

Snip is a tiny URL shortener split across one backend and two clients, all living in the same repository as separate branches mounted on `main` with git submodules.

## Layout

| Path | Branch | Purpose |
| --- | --- | --- |
| `backend/` | `backend` | Bun API server with in-memory storage |
| `frontend/` | `frontend` | Angular 19 web UI |
| `cli/` | `cli` | Zero-dependency Node CLI |
| `bundle/` | `bundle` | Generated release output for the full app |

`main` is the superproject. It pins each layer to an exact commit through submodule links.

The `bundle` branch is generated output. Do not hand-edit it; rebuild it from `main` with `scripts/build-bundle.mjs`.

## API Contract

| Method | Path | Request | Response |
| --- | --- | --- | --- |
| `POST` | `/api/links` | `{ "url": "https://..." }` | `201` `{ code, url, shortUrl, hits, createdAt }` |
| `GET` | `/api/links` | none | `200` array of link objects |
| `GET` | `/:code` | none | `302` redirect to the original URL, `404` if unknown |

## Clone

Always clone with submodules so the checked-out tree includes all three layers:

```bash
git clone --recurse-submodules https://github.com/rockers78/snip-demo.git
```

Plain clones leave the submodule folders empty until you initialize them.

## Run

From the repository root after a recursive clone:

```bash
cd backend && bun start
cd frontend && npm install && npx ng serve
cd cli && node cli.js ls
```

## Update Workflow

Each layer is edited and pushed from inside its own submodule checkout first. After that, return to `main` and bump the gitlink pointer in the superproject.

```bash
cd backend
git add -A && git commit -m "..." && git push

cd ..
git submodule update --remote backend
git add backend
git commit -m "Bump backend submodule"
git push
```

Repeat the same pattern for `frontend` and `cli`.

## Bundle Release

`scripts/build-bundle.mjs` assembles the generated `bundle` submodule from the three source branches, commits inside `bundle/`, and then bumps the `main` pointers. Pass `--push` only when you want it to publish both `bundle` and `main`.