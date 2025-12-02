# Vercel Deployment Guide

This guide covers deploying both the **frontend** and **backoffice** Next.js applications to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Vercel CLI installed (optional, for CLI deployment):
   ```bash
   npm install -g vercel
   ```

## Deployment Options

### Option 1: Deploy via Vercel Dashboard (Recommended)

#### Deploy Frontend

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Configure the project:
   - **Project Name**: `rave-frontend` (or your preferred name)
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (or leave default)
   - **Output Directory**: `.next` (or leave default)
   - **Install Command**: `npm install` (or leave default)

4. Add Environment Variables:
   - `NEXT_PUBLIC_POCKETBASE_URL`: Your PocketBase URL (e.g., `http://13.201.90.240:8092`)
   - `NEXT_PUBLIC_BACKEND_URL`: Your backend API URL (e.g., `http://13.201.90.240:3001`)
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`: Your Razorpay key ID (if needed)

5. Click **Deploy**

#### Deploy Backoffice

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the same Git repository
3. Configure the project:
   - **Project Name**: `rave-backoffice` (or your preferred name)
   - **Root Directory**: `backoffice`
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `npm run build` (or leave default)
   - **Output Directory**: `.next` (or leave default)
   - **Install Command**: `npm install` (or leave default)

4. Add Environment Variables:
   - `NEXT_PUBLIC_POCKETBASE_URL`: Your PocketBase URL
   - `NEXT_PUBLIC_BACKEND_URL`: Your backend API URL

5. Click **Deploy**

### Option 2: Deploy via Vercel CLI

#### Install Vercel CLI (if not already installed)

```bash
npm install -g vercel
```

#### Deploy Frontend

```bash
cd frontend
vercel
```

Follow the prompts:
- Login to Vercel (if not already logged in)
- Link to existing project or create new
- Confirm settings (should auto-detect Next.js)
- Add environment variables when prompted or via dashboard

#### Deploy Backoffice

```bash
cd backoffice
vercel
```

Follow the same prompts as above.

#### Production Deployment

After initial deployment, use:

```bash
vercel --prod
```

## Environment Variables

Set these in the Vercel dashboard for each project:

### Frontend Environment Variables

- `NEXT_PUBLIC_POCKETBASE_URL`: PocketBase instance URL
- `NEXT_PUBLIC_BACKEND_URL`: Backend API URL
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`: Razorpay public key (if using payments)

### Backoffice Environment Variables

- `NEXT_PUBLIC_POCKETBASE_URL`: PocketBase instance URL
- `NEXT_PUBLIC_BACKEND_URL`: Backend API URL

## Monorepo Configuration

Since this is a monorepo with npm workspaces, Vercel will:
- Automatically detect the workspace structure
- Install dependencies from the root `package.json`
- Build from the specified root directory (`frontend` or `backoffice`)

## Custom Domains

After deployment, you can add custom domains in the Vercel dashboard:
1. Go to your project settings
2. Navigate to **Domains**
3. Add your custom domain
4. Follow DNS configuration instructions

## Continuous Deployment

Vercel automatically deploys on every push to your connected Git branch:
- **Production**: Deploys from `main` or `master` branch
- **Preview**: Creates preview deployments for pull requests

## Troubleshooting

### Build Failures

1. Check build logs in Vercel dashboard
2. Ensure all environment variables are set
3. Verify `package.json` scripts are correct
4. Check that dependencies are properly installed

### Environment Variables Not Working

- Ensure variables are prefixed with `NEXT_PUBLIC_` for client-side access
- Redeploy after adding new environment variables
- Check variable names match exactly (case-sensitive)

### Monorepo Issues

- Ensure root directory is set correctly in project settings
- Verify workspace dependencies are installed
- Check that build commands reference the correct directory

## Notes

- Both apps use Next.js 13.5.7 with `output: 'standalone'` which works well with Vercel
- Vercel automatically handles serverless functions for Next.js API routes
- Image optimization is configured in `next.config.js`
- The apps will be deployed as separate Vercel projects

