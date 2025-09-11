# Email-to-Memory Integration

## Overview

The email integration allows family members to create memories by sending emails with photos, videos, or audio directly to their unique email address. Media files are automatically uploaded to secure cloud storage, and the system creates beautiful, organized family memories that can be assigned to branches later.

## Features Implemented

### 1. API Endpoints

#### `/api/webhooks/sendgrid` 
- **POST**: Receives emails from SendGrid Parse API
- Processes email content and base64-encoded attachments
- Uploads media to Supabase Storage automatically
- Creates unassigned leaves with smart content processing
- Authentication via webhook API key or SendGrid source validation

#### `/api/leaves`
- **POST**: Create unassigned leaves (supports authenticated users and webhook calls)
- **GET**: Retrieve user's leaves with filtering options
- Enhanced to handle email-originated content with media URLs

### 2. Media Processing & Storage

#### Supported Media Types
- 📸 **Images**: JPG, PNG, GIF, WebP → Creates `photo` leaf type
- 🎵 **Audio**: MP3, WAV, M4A, OGG → Creates `audio` leaf type  
- 🎥 **Video**: MP4, MOV, AVI, WebM → Creates `video` leaf type

#### Email Format
Users send emails to: `u-{userId}@yourdomain.com`

#### Processing Pipeline
1. **Email Reception**: SendGrid Parse API receives email
2. **Base64 Decoding**: Attachments decoded from base64
3. **Media Upload**: Files uploaded to Supabase Storage (`email-attachments/{userId}/{emailId}/`)
4. **Content Processing**:
   - **Subject**: Displayed prominently with email indicator
   - **Body**: Main content text with hashtag extraction
   - **Media URLs**: Attached to leaf for display
   - **Tags**: Hashtags extracted automatically (`#family`, `#milestone`)
   - **Type Detection**: Leaf type determined by primary attachment

### 3. Frontend Enhancements

#### LeafCard Improvements
- **Email Origin Indicators**: Visual "📧 Email" badges
- **Subject Display**: Email subjects shown prominently above content
- **Media Enhancement**: 
  - Multiple photo thumbnail previews
  - Native video/audio playback controls
  - "📧 Email Upload" overlays on media
- **Content Formatting**: Clean display without technical email artifacts

#### Dashboard Integration
- **Inbox Tab**: Unassigned leaves from emails appear with email indicators
- **Email Address Display**: Users can easily find their unique email address
- **Media Playback**: Full video/audio playback directly in leaf cards
- **Responsive Design**: Media displays optimally on all device sizes

## Quick Setup Guide

### 1. SendGrid Account Setup
1. Create [SendGrid account](https://sendgrid.com)
2. Authenticate your domain (add DNS records)
3. Create API key with Full Access
4. Configure Inbound Parse webhook → `https://your-app.com/api/webhooks/sendgrid`

### 2. Environment Variables

```env
# SendGrid Configuration  
SENDGRID_API_KEY=SG.your-sendgrid-api-key-here
SENDGRID_FROM_EMAIL=noreply@your-domain.com

# Webhook Security
WEBHOOK_API_KEY=your-secure-webhook-api-key

# Supabase (required for media storage)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. DNS Configuration
Add these DNS records to your domain:

**MX Record:**
```
Type: MX, Name: @, Value: mx.sendgrid.net, Priority: 10
```

**SPF Record:**  
```
Type: TXT, Name: @, Value: v=spf1 include:sendgrid.net ~all
```

### 4. Test the Integration
1. Send test email to: `u-{your-user-id}@your-domain.com`
2. Check dashboard Inbox tab for new memory
3. Verify media files upload and display correctly

## SendGrid Data Format

SendGrid sends form data to the webhook:

```javascript
{
  to: "u-abc123@yourdomain.com",
  from: "user@example.com", 
  subject: "My milestone photo",
  text: "Check out this amazing moment! #milestone #family",
  attachments: "1",
  attachment1: "photo.jpg",
  attachment1_content_type: "image/jpeg", 
  attachment1_content: "base64encodeddata..."
}
```

## Usage Flow

1. **User Setup**: User finds their unique email address in dashboard
2. **Send Email**: User emails photos/videos/audio to `u-{userId}@your-domain.com`
3. **Processing**: SendGrid webhook processes email and uploads media to Supabase Storage
4. **Memory Creation**: Creates new memory with media URLs and clean formatting  
5. **Organization**: User assigns memory to family branches from Inbox

## Security & Features

### Security
- SendGrid webhook validation (user-agent and content-type checking)
- User ID validation ensures only valid users can create memories
- Secure media storage in Supabase with organized file paths
- Input sanitization and content filtering

### Current Features
- ✅ **Base64 Media Processing**: Automatic decode and upload
- ✅ **Multi-format Support**: Images, videos, audio files
- ✅ **Smart Content Processing**: Hashtag extraction, milestone detection  
- ✅ **Clean UI Display**: Email indicators, subject prominence, media previews
- ✅ **Native Media Playback**: HTML5 video/audio controls
- ✅ **Responsive Design**: Works on all device sizes

## For Full Setup Instructions

See detailed setup guide: **[SENDGRID_SETUP.md](./SENDGRID_SETUP.md)**

For comprehensive testing: **[TESTING.md - Email Integration Section](./TESTING.md#email-integration-testing)**

## Technical Architecture

### Database Changes
- Existing `leaves` table already supports `assignment_status` field
- No schema changes required for MVP

### API Architecture
- RESTful endpoints with proper error handling
- Supabase integration for data storage
- Comprehensive logging for debugging and monitoring

### Frontend Integration
- Seamless integration with existing leaf assignment system
- Real-time UI updates when leaves are assigned
- Responsive design for mobile email usage

## Testing

### Manual Testing
1. Configure webhook API key
2. Send POST request to `/api/webhooks/email` with test email data
3. Verify unassigned leaf appears in user's Inbox tab
4. Test assignment workflow to move leaf to branches

### Integration Testing
- Email service webhook integration
- File upload and media processing
- User permissions and authentication
- Error handling for invalid emails

## Monitoring

The system includes comprehensive logging:
- Email webhook processing events
- Leaf creation success/failure
- User assignment actions
- API authentication attempts

Logs can be monitored for:
- Email processing failures
- Invalid email addresses
- API abuse or rate limiting
- System performance metrics