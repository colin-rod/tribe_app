# Email Integration System

## Overview

The Tree app features a comprehensive email-to-memory system that allows family members to create memories by sending emails with photos, videos, or audio directly to unique email addresses. Media files are automatically uploaded to secure cloud storage, and the system creates organized family memories.

## Features

### Supported Media Types
- **Photos**: JPG, PNG, HEIC, GIF, WebP → Creates `photo` leaf type
- **Videos**: MP4, MOV, AVI, WebM → Creates `video` leaf type  
- **Audio**: MP3, WAV, M4A, OGG → Creates `audio` leaf type
- **Text**: Plain text emails → Creates `text` leaf type

### Email Routing Options

#### Legacy User Email
```
Format: u-{userId}@yourdomain.com
Result: Creates leaf authored by user, unassigned to branches
```

#### Person-Specific Email (Recommended)
```
Format: person-{treeId}@yourdomain.com
Result: 
- Looks up tree and managing parent
- Creates leaf authored by managing parent
- Includes person context automatically
- Auto-routes to person's content collection
```

## SendGrid Setup Guide

### Step 1: Create SendGrid Account

1. Go to [SendGrid.com](https://sendgrid.com/)
2. Sign up for a free account (100 emails/day)
3. Verify your email address
4. Complete account setup

### Step 2: Get API Key

1. In SendGrid dashboard, go to **Settings** → **API Keys**
2. Click **Create API Key**  
3. Choose **Restricted Access**
4. Give it a name like "Tribe Email API Key"
5. Enable these permissions:
   - **Mail Send**: Full Access
   - **Suppressions**: Full Access (optional)
6. Copy the API key and save it securely

### Step 3: Configure Parse Webhook

1. Go to **Settings** → **Inbound Parse**
2. Click **Add Host & URL**
3. Configure:
   - **Subdomain**: Choose a subdomain (e.g., `mail`)
   - **Domain**: Your domain (e.g., `yourdomain.com`)
   - **Destination URL**: `https://yourapp.com/api/webhooks/sendgrid`
   - **Check** "POST the raw, full MIME message"
4. Click **Add**

### Step 4: DNS Configuration

Add these DNS records to your domain:

```
Type: MX
Name: mail (or your chosen subdomain)
Value: mx.sendgrid.net
Priority: 10

Type: CNAME  
Name: mail
Value: sendgrid.net
```

### Step 5: Environment Variables

Add to your `.env.local`:

```bash
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
WEBHOOK_API_KEY=your_secure_webhook_key_here
```

## API Reference

### Webhook Endpoint: `/api/webhooks/sendgrid`

**Method**: POST  
**Content-Type**: application/x-www-form-urlencoded

#### Request Format (from SendGrid)

```typescript
interface SendGridWebhookData {
  to: string                    // u-{userId}@domain.com or person-{treeId}@domain.com
  from: string                  // Sender email address
  subject: string               // Email subject line
  text: string                  // Plain text email body
  html?: string                 // HTML email body (optional)
  attachments?: string          // Number of attachments as string
  attachment1?: string          // First attachment filename
  attachment1_content_type?: string // MIME type of first attachment
  attachment1_content?: string  // Base64 encoded attachment data
  // Additional attachments follow pattern: attachment2, attachment3, etc.
}
```

#### Response Format

```typescript
interface WebhookResponse {
  success: boolean
  data?: {
    leafId: string              // Created leaf ID
    leafType: 'photo' | 'video' | 'audio' | 'text' | 'milestone'
    hasMedia: boolean           // Whether media was processed
    mediaCount: number          // Number of media files uploaded
    routingType?: 'user' | 'person' // How email was routed
    targetTreeId?: string       // For person emails
  }
  error?: string               // Error message if failed
}
```

#### Authentication

The webhook endpoint supports multiple authentication methods:

1. **Webhook API Key** (recommended):
   ```
   Authorization: Bearer your_webhook_api_key
   ```

2. **SendGrid Source Validation**:
   - Validates request comes from SendGrid servers
   - Checks sender IP against SendGrid IP ranges

### Leaves API: `/api/leaves`

#### Create Leaf (POST)

**Authentication**: Required (except for webhook calls)

```typescript
interface CreateLeafRequest {
  content: string               // Text content or email body
  media_urls?: string[]         // Array of media URLs
  leaf_type: 'photo' | 'video' | 'audio' | 'text' | 'milestone'
  tags?: string[]              // Extracted hashtags
  branch_id?: string           // Optional branch assignment
  is_milestone?: boolean       // Mark as milestone
  milestone_type?: string      // Type of milestone
  email_metadata?: {           // For email-originated content
    subject?: string
    sender_email?: string
    email_id?: string
  }
}
```

#### Get Leaves (GET)

**Query Parameters**:
- `tree_id`: Filter by tree
- `branch_id`: Filter by branch  
- `leaf_type`: Filter by content type
- `limit`: Number of results (default 20)
- `offset`: Pagination offset

## Media Processing Pipeline

### Attachment Processing Flow

1. **Email Received**: SendGrid forwards to webhook
2. **Parse Attachments**: Extract base64 content and metadata
3. **File Validation**: Check file type, size limits, security
4. **Upload to Storage**: Convert to binary and upload to Supabase Storage
5. **Generate URLs**: Create secure access URLs for media
6. **Create Leaf**: Store content with media references
7. **Notification**: Inform family members of new content

### Storage Organization

```
supabase-storage/
└── media/
    └── email-attachments/
        └── {userId}/
            └── {emailId}/
                ├── attachment1.jpg
                ├── attachment2.mp4
                └── attachment3.mp3
```

### Security Features

- **File Type Validation**: Only allowed MIME types accepted
- **Size Limits**: Configurable maximum file sizes
- **Virus Scanning**: Integration ready for antivirus checking
- **Access Control**: Media URLs respect tree/branch permissions

## Email Content Processing

### Smart Content Enhancement

- **Hashtag Extraction**: Automatically detect #hashtags in email content
- **Milestone Detection**: Recognize milestone keywords (first, birthday, etc.)
- **Person Context**: Include person information for person-specific emails
- **Email Formatting**: Clean HTML, preserve important formatting

### Content Examples

#### Photo Email
```
Subject: Sarah's first steps! #milestone
Body: Look at our little walker!
Attachments: video.mp4

Result:
- Leaf Type: video  
- Content: "Look at our little walker!"
- Tags: ["milestone"]
- Email context preserved
```

#### Multi-attachment Email
```
Subject: Beach day photos
Attachments: photo1.jpg, photo2.jpg, photo3.jpg

Result:
- Leaf Type: photo
- All images uploaded to storage
- Gallery view in LeafCard
- Batch processing indicators
```

## Testing the Email System

### 1. Run Test Scripts

```bash
# Test email parsing
node scripts/test-email-parsing.js

# Test person-specific routing  
node scripts/test-person-email.js
```

### 2. Manual Testing Steps

1. **Verify DNS Setup**: Check MX records are resolving
2. **Test SendGrid Webhook**: Use ngrok for local development
3. **Send Test Email**: Email to your configured address
4. **Check Dashboard**: Verify content appears with correct attribution
5. **Test Media Types**: Send different file types
6. **Verify Storage**: Check Supabase storage for uploaded files

### 3. Debugging

#### Common Issues

**Email not received**:
- Check DNS MX records
- Verify SendGrid webhook URL is accessible
- Check webhook logs in SendGrid dashboard

**Media not uploading**:
- Verify Supabase storage bucket permissions
- Check file size limits
- Review attachment processing logs

**Authentication errors**:
- Verify WEBHOOK_API_KEY in environment
- Check SendGrid IP validation
- Review API key permissions

#### Debugging Tools

```bash
# Check email processing logs
grep "email-webhook" /var/log/application.log

# Test webhook locally with ngrok
ngrok http 3000
# Update SendGrid webhook URL to ngrok URL
```

### 4. Performance Considerations

- **Large Files**: Emails >25MB may fail; consider file size warnings
- **Batch Processing**: Multiple attachments processed in parallel
- **Rate Limiting**: SendGrid free tier has daily limits
- **Storage Costs**: Monitor Supabase storage usage for large families

## Advanced Features

### Coming Soon

- **Multi-person Detection**: Auto-share photos with multiple family members
- **Face Recognition**: Automatic person identification in photos
- **Smart Routing**: AI-powered content categorization
- **Email Templates**: Custom email formats for different content types
- **SMS Integration**: Extend system to SMS/MMS messages
- **WhatsApp Integration**: Support for WhatsApp media messages

### Configuration Options

Environment variables for customization:

```bash
# File size limits (in MB)
MAX_EMAIL_ATTACHMENT_SIZE=25
MAX_TOTAL_EMAIL_SIZE=50

# Processing options
ENABLE_VIRUS_SCANNING=false
ENABLE_IMAGE_COMPRESSION=true
ENABLE_VIDEO_TRANSCODING=false

# Storage settings
STORAGE_BUCKET_NAME=media
STORAGE_PATH_PREFIX=email-attachments
```

---

This email system enables families to effortlessly capture and share precious memories through the universal medium of email, making digital memory preservation as simple as sending a message.