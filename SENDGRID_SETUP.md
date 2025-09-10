# SendGrid Setup Guide

This guide walks you through setting up SendGrid to replace Mailgun for email webhook processing.

## Why Switch to SendGrid?

- ✅ **Better free tier**: 100 emails/day vs Mailgun's limitations
- ✅ **Full webhook access**: Complete email content without storage API restrictions  
- ✅ **Direct content delivery**: No need for additional API calls
- ✅ **Better attachment handling**: Files sent directly in webhook payload

## Step 1: Create SendGrid Account

1. Go to [SendGrid.com](https://sendgrid.com/)
2. Sign up for a free account
3. Verify your email address
4. Complete account setup

## Step 2: Get API Key

1. In SendGrid dashboard, go to **Settings** → **API Keys**
2. Click **Create API Key**  
3. Choose **Restricted Access**
4. Give it a name like "Webhook API Key"
5. Enable these permissions:
   - **Mail Send**: Full Access
   - **Suppressions**: Full Access (optional)
6. Copy the API key and save it securely

## Step 3: Configure Parse Webhook

1. Go to **Settings** → **Inbound Parse**
2. Click **Add Host & URL**
3. Configure:
   - **Hostname**: `colinrodrigues.com` (your domain)
   - **URL**: `https://www.colinrodrigues.com/api/webhooks/sendgrid`
   - **Check**: ✅ Send Raw (to get attachments)
   - **Check**: ✅ POST the raw, full MIME message

## Step 4: Update Environment Variables

Add to your Vercel environment variables:

```
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@colinrodrigues.com
```

## Step 5: Update DNS Records

Replace your current MX records with SendGrid's:

| Type | Name | Value | Priority |
|------|------|-------|----------|
| MX | @ or colinrodrigues.com | mx.sendgrid.net | 10 |

**Note**: This will replace your current Mailgun MX records.

## Step 6: Test Configuration

1. Deploy the new webhook endpoint
2. Send a test email to: `u-e4fb0e70-b278-4ae5-a13e-18803b1909fe@colinrodrigues.com`
3. Check your app for the new leaf with complete content

## Step 7: Verify Webhook

Check these work:
- ✅ Subject line appears in leaf content  
- ✅ Email body text is captured
- ✅ Attachments are noted (file upload coming in future update)
- ✅ Sender information is preserved

## SendGrid Webhook Format

SendGrid sends email data as form fields:
- `to`: Recipient email
- `from`: Sender email  
- `subject`: Email subject
- `text`: Plain text body
- `html`: HTML body (if available)
- `attachments`: Number of attachments
- `attachment1`, `attachment1_content_type`, `attachment1_content`: First attachment data

## Troubleshooting

### Webhook Not Receiving Emails
- Verify MX records have propagated (use `nslookup -type=MX colinrodrigues.com`)
- Check SendGrid logs in dashboard
- Ensure webhook URL is accessible publicly

### 500 Errors in Webhook
- Check Vercel function logs
- Verify environment variables are set
- Test with debug mode enabled

### Missing Email Content  
- Ensure "Send Raw" is enabled in Parse settings
- Check that webhook URL matches exactly
- Verify content-type handling in webhook

## Migration Checklist

- [ ] SendGrid account created
- [ ] API key generated and saved
- [ ] Parse webhook configured
- [ ] Environment variables updated in Vercel
- [ ] DNS MX records updated
- [ ] Test email sent and received
- [ ] Webhook processing confirmed working
- [ ] Mailgun configuration can be removed

## Rollback Plan

If issues occur:
1. Revert MX records to Mailgun
2. Re-enable Mailgun webhook endpoint  
3. Remove SendGrid environment variables
4. Keep SendGrid account for future retry

## Next Steps After Migration

1. Remove Mailgun API dependencies
2. Clean up debug endpoints
3. Implement attachment upload to Supabase Storage
4. Add SendGrid for outbound email sending (invitations)