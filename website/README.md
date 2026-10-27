# GoDM Landing Page & Website

Official landing page for [GoDM (Go Download Manager)](https://github.com/laradev/godm), built with React, Vite, TypeScript, and modern dark-mode responsive aesthetics.

## Deploying to Vercel

### Method 1: Vercel GitHub Integration (Recommended)
1. Push this repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import the `godm` repository.
4. **If setting Root Directory**: Set `Root Directory` to `website`.
   - Build Command: `pnpm run build`
   - Output Directory: `dist`
5. **If keeping root repository**: The root `vercel.json` will automatically configure Vercel to build `website/` and serve `website/dist`.
6. Click **Deploy**.

### Method 2: Vercel CLI
```bash
# Install Vercel CLI if needed
pnpm add -g vercel

# Navigate to website directory and deploy
cd website
vercel

# Deploy to production
vercel --prod
```

## Local Development
```bash
cd website
pnpm install
pnpm run dev
```

## Production Build
```bash
pnpm run build
```
Outputs static bundle to `website/dist`.
