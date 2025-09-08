# Email-to-Leaf Integration MVP

## Overview

This MVP implements a single-channel content ingestion system that allows users to send emails with content (text, photos, videos) directly to the platform, creating unassigned leaves that can be organized later.

## Features Implemented

### 1. API Endpoints

#### `/api/leaves` 
- **POST**: Create unassigned leaves (supports both authenticated users and webhook calls)
- **GET**: Retrieve user's leaves with optional filtering for unassigned content
- Authentication via user session or API key for webhook calls

#### `/api/webhooks/email`
- **POST**: Receive emails from email service providers (Mailgun, SendGrid, etc.)
- Parses email content, extracts attachments, and creates unassigned leaves
- Supports hashtag extraction and automatic milestone detection

### 2. Email Processing

#### Supported Email Formats
Users can send emails to: `u-{userId}@tribe.app`

#### Content Processing
- **Subject**: Used as AI caption if available
- **Body**: Extracted as leaf content
- **Attachments**: Uploaded as media URLs, determines leaf type:
  - Images → `photo` leaf type  
  - Videos → `video` leaf type
  - Audio → `audio` leaf type
- **Hashtags**: Automatically extracted from content (`#milestone`, `#family`, etc.)
- **Milestone Detection**: Keywords like "first", "birthday", "achievement" trigger milestone leaf type

### 3. User Interface

#### Dashboard Integration
- **Inbox Tab**: New view mode in dashboard showing unassigned leaves
- **Email Info Card**: Shows users their unique email address for sending content
- **Assignment Workflow**: Existing drag-and-drop and multi-select assignment system

#### UnassignedLeavesPanel Enhancements
- Added email integration information
- Shows user's unique email address: `u-{userId.substring(0,8)}@tribe.app`
- Instructions for email-to-leaf functionality

## Configuration

### Environment Variables

```env
# Required for webhook authentication
WEBHOOK_API_KEY=your-secure-webhook-api-key

# Email service configuration (not implemented in MVP)
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-domain.com
```

### Email Service Setup

The webhook endpoint expects email data in this format:

```json
{
  "to": "u-abc123@tribe.app",
  "from": "user@example.com", 
  "subject": "My milestone photo",
  "text": "Check out this amazing moment! #milestone #family",
  "attachments": [
    {
      "filename": "photo.jpg",
      "contentType": "image/jpeg",
      "size": 1024000,
      "url": "https://storage.example.com/photo.jpg"
    }
  ]
}
```

## Usage Flow

1. **User Setup**: User gets their unique email address from the Inbox tab
2. **Send Email**: User emails content to `u-{userId}@tribe.app`
3. **Email Processing**: Webhook receives email, processes content and attachments
4. **Leaf Creation**: Creates unassigned leaf with appropriate type and metadata
5. **Organization**: User sees new content in Inbox tab and assigns to branches

## Security

- Webhook endpoints protected by API key authentication
- User ID validation ensures emails only create leaves for valid users
- Rate limiting on API endpoints (30 requests/minute for leaves API)
- Input validation and sanitization on all endpoints

## Future Enhancements

### Phase 2 Possibilities
- Multiple email channels (SMS, social media integrations)
- AI-powered automatic branch assignment suggestions
- Email templates for different content types
- Bulk email processing for newsletters/updates
- Integration with popular email providers (Gmail, Outlook)
- Rich media support (embedded videos, documents)

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