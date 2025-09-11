# API Reference - Email Integration

Documentation for the SendGrid email integration endpoints and features.

## 📧 Email Webhook Endpoint

### `POST /api/webhooks/sendgrid`

Processes incoming emails from SendGrid Parse API with media attachments.

#### Request Format
SendGrid sends form data with the following structure:

```typescript
interface SendGridWebhookData {
  to: string                    // Recipient: u-{userId}@domain.com
  from: string                  // Sender email address
  subject: string               // Email subject line
  text: string                  // Plain text email body
  html?: string                 // HTML email body (optional)
  attachments?: string          // Number of attachments as string
  attachment1?: string          // First attachment filename
  attachment1_content_type?: string // MIME type of first attachment
  attachment1_content?: string  // Base64 encoded attachment data
  // Additional attachments follow same pattern (attachment2, attachment3, etc.)
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
  }
  error?: string               // Error message if failed
}
```

#### Media Processing
- **Images** (JPG, PNG, GIF, WebP): Uploaded to Supabase Storage, creates `photo` leaf
- **Videos** (MP4, MOV, AVI, WebM): Uploaded to Supabase Storage, creates `video` leaf  
- **Audio** (MP3, WAV, M4A, OGG): Uploaded to Supabase Storage, creates `audio` leaf
- **Mixed Media**: Leaf type determined by first/primary attachment

#### Storage Structure
Media files are stored in Supabase Storage with the path:
```
email-attachments/{userId}/{emailId}/{timestamp}-{filename}
```

#### Authentication
- SendGrid webhooks authenticated via user-agent and content-type validation
- Optional API key authentication via `x-api-key` header

#### Example Usage

**Basic Text Email:**
```bash
curl -X POST https://your-app.com/api/webhooks/sendgrid \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "to=u-123e4567-e89b-12d3-a456-426614174000@yourdomain.com" \
  -d "from=parent@example.com" \
  -d "subject=Great day at the park" \
  -d "text=The kids had so much fun today! #family #park"
```

**Email with Photo:**
```bash
curl -X POST https://your-app.com/api/webhooks/sendgrid \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "to=u-123e4567-e89b-12d3-a456-426614174000@yourdomain.com" \
  -d "from=parent@example.com" \
  -d "subject=Family photo" \
  -d "text=Beautiful family moment #memories" \
  -d "attachments=1" \
  -d "attachment1=family.jpg" \
  -d "attachment1_content_type=image/jpeg" \
  -d "attachment1_content=iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ..."
```

---

## 🎯 Enhanced Leaf API

### `POST /api/leaves`

Enhanced to support email-originated content with media URLs.

#### Email-Originated Leaf Structure
```typescript
interface EmailLeaf {
  id: string
  content: string              // Processed email content (subject + body)  
  leaf_type: 'photo' | 'video' | 'audio' | 'text' | 'milestone'
  media_urls: string[]          // Array of Supabase Storage URLs
  tags: string[]               // Extracted hashtags
  author_id: string            // User ID extracted from email
  created_at: string
  // Standard leaf fields...
}
```

#### Content Processing
- **Subject Line**: Displayed prominently with email indicator
- **Body Text**: Main content with hashtag extraction
- **Attachment Notes**: Added for failed uploads (e.g., "2 attachment(s) failed to upload")
- **Hashtags**: Automatically extracted from subject and body text
- **Milestone Detection**: Keywords trigger milestone leaf type

---

## 🎨 Frontend Components

### LeafCard Enhancements

Enhanced to display email-originated content with visual indicators:

#### Email Detection
```typescript
const isEmailOrigin = useMemo(() => {
  return leaf.content?.includes('Subject:') && 
         (leaf.content?.includes('[') && leaf.content?.includes('media file(s) attached]'))
}, [leaf.content])
```

#### Visual Indicators
- **"📧 Email" badges** in header for email-originated content
- **Email subject display** in highlighted box above main content  
- **Media overlays** showing "📧 Email Upload", "📧 Email Video", "📧 Email Audio"
- **Multiple media previews** with thumbnail galleries for multiple attachments

#### Native Media Playback
- **Images**: Full-size display with multiple photo thumbnail previews
- **Videos**: Native HTML5 video player with controls
- **Audio**: Native HTML5 audio controls with waveform display

---

## 🔧 Attachment Handler

### Base64 Media Processing

New methods added to handle SendGrid's base64 attachment format:

#### `uploadBase64Attachment()`
```typescript
async uploadBase64Attachment(
  base64Content: string,
  filename: string, 
  contentType: string,
  userId: string,
  emailId: string
): Promise<EmailAttachment | null>
```

#### `uploadMultipleBase64Attachments()`
```typescript
async uploadMultipleBase64Attachments(
  attachments: Array<{
    content: string
    filename: string  
    type: string
  }>,
  userId: string,
  emailId: string
): Promise<EmailAttachment[]>
```

#### Processing Features
- **Base64 Decoding**: Automatic conversion to Buffer for storage
- **File Type Validation**: MIME type checking and sanitization  
- **Filename Sanitization**: Safe filename generation with timestamps
- **Error Handling**: Graceful failure handling with partial success
- **Storage Organization**: Structured file paths for easy management

---

## 🛡️ Security Features

### Authentication Methods
1. **SendGrid Validation**: User-agent and content-type checking
2. **API Key Authentication**: Optional `x-api-key` header validation
3. **User Validation**: Email address format and user existence checking

### Content Security
- **Input Sanitization**: HTML content converted to clean text
- **File Type Validation**: Only allowed media types processed
- **Size Limits**: Configurable file size restrictions
- **Path Safety**: Secure storage path generation

### Rate Limiting
- **Email Processing**: Prevents spam and abuse
- **Storage Limits**: Per-user storage quotas (configurable)
- **API Endpoints**: Standard rate limiting on all routes

---

## 📊 Error Handling

### Common Error Responses

#### Invalid User ID
```json
{
  "success": false,
  "error": "Invalid user ID extracted from email address"
}
```

#### Media Upload Failure  
```json
{
  "success": true,
  "data": {
    "leafId": "leaf_123",
    "leafType": "text", 
    "hasMedia": false,
    "mediaCount": 0
  },
  "error": "2 attachment(s) failed to upload - content will note this"
}
```

#### Authentication Failure
```json
{
  "success": false,
  "error": "Authentication failed - no valid credentials provided"
}
```

### Partial Success Handling
The system is designed to gracefully handle partial failures:
- Email processed even if some attachments fail
- Failed uploads noted in leaf content  
- Successful media files still attached to leaf
- User receives memory with available content

---

## 🧪 Testing Utilities

### Test Script: `scripts/test-sendgrid-media.js`

Simulates SendGrid webhook calls for testing:

```bash
# Run test script
node scripts/test-sendgrid-media.js

# Expected output:
# 📧 Sending test email to: u-{userId}@domain.com  
# 📎 With attachment: test-image.png (image/png)
# ✅ Test PASSED! Media upload functionality working
```

### Manual Testing
```bash
# Test basic webhook
curl -X POST http://localhost:3000/api/webhooks/sendgrid \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "User-Agent: SendGrid" \
  -d "to=u-{userId}@domain.com&from=test@example.com&subject=Test&text=Hello #test"
```

---

*For complete setup instructions, see [SENDGRID_SETUP.md](./SENDGRID_SETUP.md)*

*For comprehensive testing scenarios, see [TESTING.md](./TESTING.md#email-integration-testing)*