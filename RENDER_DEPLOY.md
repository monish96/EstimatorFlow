# Render Deployment Guide for EstimateFlow

This guide will help you deploy EstimateFlow to Render using the provided `render.yaml` configuration.

## Prerequisites

1. A GitHub account with your EstimateFlow repository
2. A Render account (sign up at https://render.com)

## Deployment Steps

### Option 1: Using Blueprint (Recommended - Automatic)

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Add Render deployment configuration"
   git push origin main
   ```

2. **Go to Render Dashboard**:
   - Visit https://dashboard.render.com
   - Sign in or create an account

3. **Create Blueprint**:
   - Click "New +" → "Blueprint"
   - Connect your GitHub account if not already connected
   - Select your repository
   - Render will detect `render.yaml` automatically
   - Click "Apply"

4. **Configure Services**:
   - Render will create two services:
     - `estimateflow-server` (Web Service)
     - `estimateflow` (Static Site)
   - Review the configuration
   - Click "Create Blueprint"

5. **Update Environment Variables**:
   - After both services are deployed, go to `estimateflow-server`
   - Navigate to "Environment" tab
   - Update `CLIENT_ORIGIN` to your static site URL:
     ```
     https://estimateflow.onrender.com
     ```
   - Save changes (this will trigger a redeploy)

### Option 2: Manual Deployment

#### Deploy Server (Web Service)

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `estimateflow-server`
   - **Environment**: `Node`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Build Command**: `npm install && npm -w @pp/server run build`
   - **Start Command**: `npm -w @pp/server run start`
5. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=10000
   CLIENT_ORIGIN=https://estimateflow.onrender.com
   ```
   (Update CLIENT_ORIGIN after web app is deployed)
6. Click "Create Web Service"
7. Copy the service URL (e.g., `https://estimateflow-server.onrender.com`)

#### Deploy Web App (Static Site)

1. In Render dashboard, click "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `estimateflow`
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Build Command**: `npm install && npm -w @pp/web run build`
   - **Publish Directory**: `apps/web/dist`
4. **Environment Variables**:
   ```
   VITE_SERVER_URL=https://estimateflow-server.onrender.com
   ```
   (Use the server URL from above)
5. Click "Create Static Site"
6. Copy the static site URL (e.g., `https://estimateflow.onrender.com`)

#### Final Step: Update CORS

1. Go back to `estimateflow-server` service
2. Navigate to "Environment" tab
3. Update `CLIENT_ORIGIN` to your static site URL:
   ```
   CLIENT_ORIGIN=https://estimateflow.onrender.com
   ```
4. Save and wait for redeploy

## Post-Deployment Checklist

- [ ] Server is running and accessible at `/health` endpoint
- [ ] Web app is deployed and accessible
- [ ] `VITE_SERVER_URL` points to server URL
- [ ] `CLIENT_ORIGIN` includes web app URL
- [ ] Test creating a session
- [ ] Test joining a session from another browser
- [ ] Verify real-time updates work

## Testing Your Deployment

1. Visit your static site URL (e.g., `https://estimateflow.onrender.com`)
2. Create a new session
3. Copy the session link
4. Open it in an incognito window or different browser
5. Verify:
   - You can see other participants
   - You can add stories
   - You can vote
   - Votes are revealed in real-time

## Custom Domains

To use a custom domain:

1. In your static site settings, add your custom domain
2. Update `CLIENT_ORIGIN` in server to include your custom domain:
   ```
   CLIENT_ORIGIN=https://estimateflow.onrender.com,https://yourdomain.com
   ```
3. Update `VITE_SERVER_URL` in web app to your server URL

## Troubleshooting

### Server won't start
- Check build logs for errors
- Verify `PORT` environment variable is set
- Check that `npm -w @pp/server run start` works locally

### Web app can't connect to server
- Verify `VITE_SERVER_URL` is correct
- Check server is running (visit `/health` endpoint)
- Verify `CLIENT_ORIGIN` includes your web app URL

### CORS errors
- Make sure `CLIENT_ORIGIN` in server includes your web app URL
- Check browser console for specific CORS errors
- Verify both services are using HTTPS

### Services spin down (Free Tier)
- Render free tier services spin down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Consider upgrading to paid tier for production use

## Environment Variables Reference

### Server (`estimateflow-server`)
- `NODE_ENV`: `production`
- `PORT`: `10000` (Render sets this automatically, but we specify for clarity)
- `CLIENT_ORIGIN`: Your static site URL(s), comma-separated

### Web App (`estimateflow`)
- `VITE_SERVER_URL`: Your server URL (e.g., `https://estimateflow-server.onrender.com`)

## Support

If you encounter issues:
1. Check Render logs in the dashboard
2. Verify all environment variables are set correctly
3. Test locally first to ensure code works
4. Check Render status page for service issues

