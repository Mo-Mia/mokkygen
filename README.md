# MokkyGen

MokkyGen is a lightweight static Vite app for testing OpenRouter image generation models with your own OpenRouter API key.

The app has no backend and no app-owned API key. Your OpenRouter key is stored in your browser only and requests are sent directly from the browser to OpenRouter.

## Features

- OpenRouter key validation and balance display via `/api/v1/key`
- Single-model image generation
- Compare Models mode for up to four image models
- Prompt Wizard using OpenRouter chat models
- Local gallery history capped at 50 entries
- Full-size image viewer with download, share, copy and open actions

## Local Development

Prerequisites:

- Node.js 20 or newer
- An OpenRouter API key

Install and run:

```bash
npm install
npm run dev
```

Then open the local Vite URL and paste your OpenRouter API key into the app.

Validation:

```bash
npm run lint
npm run build
```

## Vercel Deployment

MokkyGen deploys as a static Vite app.

- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: none required

Do not add OpenRouter API keys to Vercel. Users provide their own keys in the browser.

## GitHub

Intended remote:

```txt
https://github.com/Mo-Mia/mokkygen.git
```

Do not commit `.env`, `.env.local`, local secrets, or generated build output.
