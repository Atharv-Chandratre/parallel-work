This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load the Geist font family.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on zeroBox

This app deploys to [zeroBox](https://console.zerobox.doordash.team), DoorDash's internal app host. It runs as a Next.js **standalone** app (auto-detected — the `/api/*` routes need a server, so `export` mode is not used).

```bash
npm run deploy
# or directly:
zerobox deploy
```

`zerobox deploy` builds with `next build` (webpack, required for the standalone output on Next 16+), assembles the bundle, and uploads a new version. The deploy prints a console URL where you click **Promote** to flip live traffic.

Deploy config lives in [`zerobox.json`](./zerobox.json) (`{ "runtime": { "kind": "nextjs" } }`) — mode and image settings are resolved from `next.config` at deploy time; you don't edit `next.config` or write a Dockerfile.

**Storage note:** board data is localStorage-first on the client. The server `/api/boards` route persists to `cwd/data` only on a writable host; on zeroBox (and other non-durable bundle hosts) it returns `503 STORAGE_READONLY` and the client stays in localStorage-only mode, since the deployed bundle filesystem is not durable across promotes.

See the [zeroBox Next.js deploy guide](https://github.com/doordash/web-next/blob/master/packages/zerobox-functions-cli/docs/nextjs-deploy.md) for details.
