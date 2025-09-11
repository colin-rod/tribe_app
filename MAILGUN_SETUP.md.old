# Mailgun Setup Guide for Email-to-Leaf Integration

## Overview

This guide walks you through setting up Mailgun to receive emails and forward them to your Tribe App for automatic leaf creation.

## Prerequisites

- Mailgun account
- Domain name you control
- Access to DNS settings for your domain
- Deployed Tribe App with webhook endpoint

## Step 1: Create Mailgun Account

1. Go to [Mailgun.com](https://www.mailgun.com)
2. Sign up for a free account
3. Verify your email address

## Step 2: Add and Verify Your Domain

### 2.1 Add Domain to Mailgun

1. In Mailgun dashboard, go to **Sending** → **Domains**
2. Click **Add New Domain**
3. Enter your domain (e.g., `colinrodrigues.com` or subdomain like `mail.colinrodrigues.com`)
4. Choose **Receiving** as the domain type (we need to receive emails)
5. Select your region (US or EU)
6. Click **Add Domain**

### 2.2 Configure DNS Records

Mailgun will provide you with DNS records to add. You'll need to add these to your domain's DNS settings:

**Required DNS Records:**
```
Type: TXT
Name: @
Value: "v=spf1 include:mailgun.org ~all"

Type: TXT  
Name: _dmarc
Value: "v=DMARC1; p=none;"

Type: TXT
Name: k1._domainkey
Value: [Mailgun will provide this DKIM key]

Type: MX
Name: @
Priority: 10
Value: mxa.mailgun.org

Type: MX
Name: @  
Priority: 10
Value: mxb.mailgun.org
```

### 2.3 Verify Domain

1. After adding DNS records, wait 24-48 hours for propagation
2. In Mailgun dashboard, click **Verify DNS Settings**
3. All records should show as verified (green checkmarks)

## Step 3: Configure Environment Variables

Update your `.env.local` file with your Mailgun credentials:

```env
# Generate a secure random string for webhook authentication
WEBHOOK_API_KEY=mg_webhook_12345_your_secure_key_here

# Get this from Mailgun Dashboard → Settings → API Keys
MAILGUN_API_KEY=your-mailgun-private-api-key

# The domain you added to Mailgun
MAILGUN_DOMAIN=your-domain.com

# Get this from Mailgun Dashboard → Settings → Webhooks
MAILGUN_WEBHOOK_SIGNING_KEY=your-webhook-signing-key
```

### How to Find Your Keys:

**API Key:**
1. Go to **Settings** → **API Keys**
2. Copy the **Private API Key**

**Webhook Signing Key:**
1. Go to **Settings** → **Webhooks**
2. Copy the **HTTP webhook signing key**

## Step 4: Configure Mailgun Route (Free Plan - Single Route)

### 4.1 Create Catch-All Route (MVP Recommended)

Since the free plan allows only 1 inbound route, use a catch-all approach for maximum flexibility:

1. In Mailgun dashboard, go to **Receiving** → **Routes**
2. Click **Create Route**
3. Configure the single route:

```
Expression Type: Catch All
Priority: 1
Actions: 
  - forward("https://colinrodrigues.com/api/webhooks/email")
  - store(notify="https://colinrodrigues.com/api/webhooks/notify")
Description: Forward all emails to Tribe App
```

### Why Catch-All for MVP:

✅ **Maximum Coverage**: Captures ALL emails to any address at your domain  
✅ **Application Logic**: Handle user-specific routing in your code, not Mailgun routes  
✅ **Dual Processing**: Both immediate forward and stored backup  
✅ **Future-Proof**: Easy to add new email patterns without route changes  
✅ **Flexibility**: Can handle admin emails, support emails, etc. in the same endpoint  

### Email Handling Logic:

Your webhook can distinguish between email types:

```javascript
// In your webhook handler
const recipient = req.body.recipient;
if (recipient.startsWith('u-')) {
  // Handle user-specific emails (create leaves)
} else if (recipient.startsWith('admin@')) {
  // Handle admin emails
} else if (recipient.startsWith('support@')) {
  // Handle support emails
} else {
  // Log or ignore unknown patterns
}
```

## Step 5: Configure Webhook Settings

### 5.1 Add Webhook URL (MVP Configuration)

For your MVP using Store and Notify:

1. Go to **Settings** → **Webhooks**
2. Add notification webhook URL: `https://your-app.com/api/webhooks/notify`
3. Select events to track:
   - ✅ **delivered**
   - ✅ **failed**
   - ✅ **bounced**
   - ✅ **complained**

**Note:** The free plan webhook limit should be sufficient for MVP testing. You only need the notify endpoint since you're using store and notify routing.

### 5.2 Webhook Authentication

Mailgun will sign webhooks with your webhook signing key. Our endpoint validates this automatically.

## Step 6: Test the Integration

### 6.1 Send Test Email

1. Get a user ID from your Tribe App database
2. Send an email to: `u-{userID}@your-domain.com`
3. Include some text and optionally attach images

Example test email:
```
To: u-abc123-def4-5678-9101-112131415161@colinrodrigues.com
Subject: Test milestone photo
Body: Check out this amazing moment! #milestone #family

Attachments: family_photo.jpg
```

### 6.2 Verify Webhook Reception

**For Store and Notify setup:**
Check your application logs for:
```
INFO: Received message notification { to: 'u-abc123@colinrodrigues.com', from: 'test@example.com', subject: 'Test milestone photo', messageUrl: 'https://...' }
INFO: Successfully created leaf from stored message { leafId: 'leaf-id-here', userId: 'abc123', leafType: 'photo' }
```

**For Direct Forward setup:**
Check your application logs for:
```
INFO: Received email webhook { to: 'u-abc123@colinrodrigues.com', from: 'test@example.com', subject: 'Test milestone photo' }
INFO: Successfully created leaf from email { leafId: 'leaf-id-here', userId: 'abc123', leafType: 'photo' }
```

### 6.3 Check Dashboard

1. Log into your Tribe App
2. Go to Dashboard → Inbox tab
3. You should see the new unassigned leaf
4. Test assigning it to a branch

## Step 7: Production Deployment

### 7.1 Domain Configuration

For production, use a subdomain for cleaner email addresses:
- Set up `mail.colinrodrigues.com` as your Mailgun domain
- Users get emails like: `u-{userID}@mail.colinrodrigues.com`

### 7.2 Security Considerations

1. **Rate Limiting**: Mailgun has built-in rate limiting
2. **Webhook Validation**: Our endpoint validates Mailgun's signature
3. **User Validation**: Only creates leaves for valid user IDs
4. **File Storage**: Configure proper file storage for attachments

### 7.3 Monitoring

Monitor these metrics:
- Email delivery rates
- Webhook success rates  
- Leaf creation success rates
- User adoption of email feature

## Troubleshooting

### Common Issues

**Emails not being received:**
- Check DNS records are correctly configured
- Verify domain is verified in Mailgun
- Check route configuration matches your email pattern

**Webhook not firing:**
- Verify webhook URL is correct and accessible
- Check webhook signing key matches your environment variable
- Look for webhook logs in Mailgun dashboard

**Leaves not being created:**
- Check application logs for errors
- Verify user ID extraction from email address
- Ensure user exists in your database

### Useful Mailgun Resources

- **Logs**: Dashboard → Sending → Logs
- **Events**: Dashboard → Analytics → Events  
- **API Documentation**: [Mailgun Docs](https://documentation.mailgun.com)
- **Webhook Testing**: Use Mailgun's webhook test feature

## Email Address Format

The system supports these email formats:

1. **Direct User ID**: `u-{userID}@domain.com`
2. **Short User ID**: `u-{first8chars}@domain.com` 
3. **Full UUID**: `{full-uuid}@domain.com`

Choose the format that works best for your users and update the `extractUserIdFromEmail` function accordingly.

## Next Steps

After successful setup:

1. **User Onboarding**: Show users their unique email addresses
2. **Feature Promotion**: Add email feature to your app's marketing
3. **Analytics**: Track usage and optimize based on user behavior
4. **Expansion**: Consider adding SMS or other channels

## Cost Considerations

**Mailgun Pricing (as of 2024):**
- Free tier: 5,000 emails/month for 3 months
- Pay-as-you-go: $0.80 per 1,000 emails
- Monthly plans start at $35/month for 50,000 emails

For most family apps, the free tier or pay-as-you-go should be sufficient initially.