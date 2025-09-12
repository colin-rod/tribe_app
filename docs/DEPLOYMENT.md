# Deployment Guide

This guide covers deploying the Tribe app to various platforms with proper configuration for production use.

## Prerequisites

Before deploying, ensure you have:

- ✅ **Node.js 18+** installed locally for build testing
- ✅ **Supabase project** set up with all migrations applied  
- ✅ **SendGrid account** configured with domain and webhooks
- ✅ **Domain ownership** for email routing setup
- ✅ **Git repository** with latest code
- ✅ **Environment variables** documented and ready

## Quick Deployment (Recommended)

### Deploy to Vercel

Vercel is the recommended platform for hosting the Tribe app due to optimal Next.js integration.

#### 1. Connect Repository

1. Push your code to GitHub, GitLab, or Bitbucket
2. Go to [vercel.com](https://vercel.com) and sign up/login
3. Click "New Project" and import your repository
4. Vercel will automatically detect Next.js configuration

#### 2. Configure Environment Variables

In your Vercel project dashboard, go to **Settings** → **Environment Variables** and add:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# SendGrid Email Integration
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Security
WEBHOOK_API_KEY=your_secure_webhook_key_here
NEXTAUTH_SECRET=your_nextauth_secret_here

# Optional: Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_analytics_id
```

#### 3. Deploy

1. Click **Deploy** in Vercel dashboard
2. Wait for build completion (typically 2-3 minutes)
3. Your app will be available at `https://your-project.vercel.app`

#### 4. Custom Domain (Optional)

1. In Vercel dashboard, go to **Settings** → **Domains**
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate is automatically provisioned

## Production Checklist

### Pre-Deployment Verification

- [ ] **Build succeeds locally**: Run `npm run build` without errors
- [ ] **Environment variables complete**: All required vars documented and configured
- [ ] **Database migrations applied**: Latest schema applied to production database
- [ ] **SendGrid webhook configured**: Points to production domain
- [ ] **DNS records configured**: MX records for email routing
- [ ] **Security audit complete**: No sensitive data in code or logs

### Post-Deployment Testing

- [ ] **Application loads**: Homepage accessible without errors
- [ ] **Authentication works**: User signup/login functional
- [ ] **Email integration**: Test email-to-memory feature
- [ ] **Media uploads**: Photo/video uploads working
- [ ] **Real-time features**: Live updates functioning
- [ ] **Cross-browser testing**: Chrome, Firefox, Safari compatibility
- [ ] **Mobile responsive**: Functionality on mobile devices
- [ ] **Performance check**: Page load times under 3 seconds

## Alternative Deployment Options

### Deploy to Netlify

Netlify provides good static site hosting with serverless functions.

#### Setup Steps

1. **Connect Repository**
   ```bash
   # In Netlify dashboard, connect your Git repository
   # Build command: npm run build
   # Publish directory: .next
   ```

2. **Configure Build Settings**
   ```toml
   # netlify.toml
   [build]
     command = "npm run build"
     publish = ".next"
   
   [build.environment]
     NODE_VERSION = "18"
   
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```

3. **Environment Variables**
   Add the same environment variables as listed for Vercel in the Netlify dashboard.

### Deploy to Railway

Railway offers full-stack deployment with database hosting.

#### Setup Steps

1. **Connect Repository**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway link
   railway up
   ```

2. **Configure Environment**
   ```bash
   # Set environment variables via CLI
   railway variables set NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   # ... (add all other variables)
   ```

### Self-Hosted with Docker

For full control, deploy using Docker containers.

#### Docker Setup

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine AS base
   
   # Install dependencies only when needed
   FROM base AS deps
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm ci --only=production
   
   # Build the app
   FROM base AS builder
   WORKDIR /app
   COPY . .
   COPY --from=deps /app/node_modules ./node_modules
   RUN npm run build
   
   # Production image
   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV=production
   
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs
   
   COPY --from=builder /app/public ./public
   COPY --from=builder /app/.next/standalone ./
   COPY --from=builder /app/.next/static ./.next/static
   
   USER nextjs
   EXPOSE 3000
   ENV PORT=3000
   
   CMD ["node", "server.js"]
   ```

2. **Docker Compose Configuration**
   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       environment:
         - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
         - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
         - SENDGRID_API_KEY=${SENDGRID_API_KEY}
         - WEBHOOK_API_KEY=${WEBHOOK_API_KEY}
       restart: unless-stopped
   ```

3. **Deploy**
   ```bash
   # Build and run
   docker-compose up -d
   
   # Check logs
   docker-compose logs -f app
   ```

## Email System Configuration

### SendGrid Webhook Setup

After deployment, configure SendGrid webhooks to point to your production domain.

#### Update Webhook URL

1. Go to SendGrid dashboard → **Settings** → **Inbound Parse**
2. Update webhook URL to: `https://yourdomain.com/api/webhooks/sendgrid`
3. Ensure "POST the raw, full MIME message" is checked
4. Test webhook with a sample email

#### DNS Configuration

Add these DNS records to your domain:

```bash
# MX Record for email routing
Type: MX
Name: mail (or your subdomain)
Value: mx.sendgrid.net
Priority: 10

# CNAME for subdomain
Type: CNAME
Name: mail
Value: sendgrid.net

# Optional: SPF record for better deliverability
Type: TXT
Name: @
Value: "v=spf1 include:sendgrid.net ~all"
```

### Email Testing

After deployment, test the email system:

```bash
# Test user email
echo "Test content" | mail -s "Test Subject" u-{userId}@yourdomain.com

# Test person-specific email  
echo "Test for Sarah" | mail -s "Sarah Update" person-{treeId}@yourdomain.com
```

## Performance Optimization

### Production Optimizations

```typescript
// next.config.ts
const nextConfig = {
  // Enable compression
  compress: true,
  
  // Image optimization
  images: {
    domains: ['your-supabase-project.supabase.co'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Bundle analysis (for optimization)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      config.plugins.push(new BundleAnalyzerPlugin())
      return config
    }
  }),
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options', 
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ]
  }
}

export default nextConfig
```

### Performance Monitoring

Set up monitoring to track application performance:

```bash
# Add Vercel Analytics (if using Vercel)
npm install @vercel/analytics

# Add to your app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

## Security Considerations

### Production Security Checklist

- [ ] **Environment variables secure**: No secrets in code or logs
- [ ] **HTTPS everywhere**: All communication encrypted
- [ ] **Webhook authentication**: API key validation for webhooks
- [ ] **Input validation**: All user inputs sanitized
- [ ] **File upload security**: Type and size validation for media
- [ ] **Rate limiting**: Protection against abuse (consider Vercel Pro)
- [ ] **Error handling**: No sensitive information in error messages
- [ ] **Database security**: RLS policies properly configured
- [ ] **CORS configuration**: Restricted to necessary domains
- [ ] **Security headers**: CSP, HSTS, and other security headers

### Security Headers Configuration

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  return response
}
```

## Troubleshooting

### Common Deployment Issues

**Build Failures**
```bash
# Check for TypeScript errors
npm run build

# Check for missing dependencies
npm install

# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
```

**Email Not Working**
```bash
# Check DNS propagation
dig MX mail.yourdomain.com

# Test webhook endpoint
curl -X POST https://yourdomain.com/api/webhooks/sendgrid \
  -H "Authorization: Bearer your_webhook_key" \
  -d "test=data"
```

**Database Connection Issues**
```bash
# Test Supabase connection
curl https://your-project.supabase.co/rest/v1/trees \
  -H "apikey: your_anon_key" \
  -H "Authorization: Bearer your_service_role_key"
```

### Monitoring and Logging

Set up proper monitoring for production:

```typescript
// lib/logger.ts
export function logError(error: Error, context?: string) {
  if (process.env.NODE_ENV === 'production') {
    // Send to monitoring service (Sentry, LogRocket, etc.)
    console.error(`[${context}]`, error)
  }
}
```

## Maintenance

### Regular Maintenance Tasks

- [ ] **Monitor performance metrics** weekly
- [ ] **Review error logs** daily  
- [ ] **Update dependencies** monthly
- [ ] **Database maintenance** (analyze, vacuum) monthly
- [ ] **Security updates** as needed
- [ ] **Backup verification** weekly
- [ ] **SSL certificate renewal** (automated with most providers)

### Scaling Considerations

As your family network grows:

- **Database optimization**: Add indexes for common queries
- **CDN setup**: Use Vercel Edge Network or CloudFront for global performance
- **Caching strategy**: Implement Redis for session management
- **Background jobs**: Move heavy processing to queue systems
- **Load balancing**: Multiple instances for high availability

---

This deployment guide ensures your Tribe app is production-ready with proper security, performance, and monitoring in place.