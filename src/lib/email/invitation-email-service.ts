/**
 * Email Service for Sending Invitations
 * Uses Mailgun to send invitation emails to users
 */

import formData from 'form-data'
import Mailgun from 'mailgun.js'
import { createComponentLogger } from '@/lib/logger'

const logger = createComponentLogger('InvitationEmailService')

interface InvitationEmailData {
  id: string
  email: string
  role: string
  invited_by: string
  tree_id?: string
  branch_id?: string
  expires_at: string
  // Additional data from database joins
  tree_name?: string
  branch_name?: string
  inviter_name?: string
}

interface EmailServiceConfig {
  apiKey: string
  domain: string
  fromEmail: string
}

export class InvitationEmailService {
  private mailgun: any
  private config: EmailServiceConfig | null

  constructor() {
    const apiKey = process.env.MAILGUN_API_KEY
    const domain = process.env.MAILGUN_DOMAIN
    const fromEmail = process.env.MAILGUN_FROM_EMAIL

    // Allow initialization without config for build time
    if (!apiKey || !domain || !fromEmail) {
      const missing = []
      if (!apiKey) missing.push('MAILGUN_API_KEY')
      if (!domain) missing.push('MAILGUN_DOMAIN')
      if (!fromEmail) missing.push('MAILGUN_FROM_EMAIL')
      
      logger.warn(`Missing Mailgun configuration: ${missing.join(', ')}`)
      this.config = null
      return
    }

    this.config = { apiKey, domain, fromEmail }
    
    const mg = new Mailgun(formData)
    this.mailgun = mg.client({ username: 'api', key: apiKey })

    logger.info('InvitationEmailService initialized', {
      metadata: { domain, fromEmail }
    })
  }

  /**
   * Send invitation email
   */
  async sendInvitationEmail(invitationData: InvitationEmailData): Promise<boolean> {
    if (!this.config) {
      logger.error('Cannot send email: Mailgun not configured')
      return false
    }

    try {
      const isTreeInvitation = !!invitationData.tree_id
      const targetName = isTreeInvitation 
        ? invitationData.tree_name || 'Family Tree'
        : invitationData.branch_name || 'Branch'

      const inviterName = invitationData.inviter_name || 'Someone'
      const roleName = this.formatRoleName(invitationData.role)

      // Generate invitation link
      const invitationLink = this.generateInvitationLink(invitationData.id)

      const emailData = {
        from: `${this.getAppName()} <${this.config.fromEmail}>`,
        to: invitationData.email,
        subject: `You're invited to join ${targetName}`,
        html: this.generateInvitationHTML({
          inviterName,
          targetName,
          roleName,
          invitationLink,
          expiresAt: invitationData.expires_at,
          isTreeInvitation
        }),
        text: this.generateInvitationText({
          inviterName,
          targetName,
          roleName,
          invitationLink,
          expiresAt: invitationData.expires_at,
          isTreeInvitation
        })
      }

      logger.info('Sending invitation email', {
        metadata: {
          to: invitationData.email,
          invitationId: invitationData.id,
          type: isTreeInvitation ? 'tree' : 'branch',
          role: invitationData.role
        }
      })

      const response = await this.mailgun.messages.create(this.config.domain, emailData)

      logger.info('Invitation email sent successfully', {
        metadata: {
          messageId: response.id,
          invitationId: invitationData.id,
          to: invitationData.email
        }
      })

      return true
    } catch (error) {
      logger.error('Failed to send invitation email', error, {
        metadata: {
          invitationId: invitationData.id,
          email: invitationData.email
        }
      })
      return false
    }
  }

  /**
   * Generate invitation link
   */
  private generateInvitationLink(invitationId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.colinrodrigues.com'
    return `${baseUrl}/invite/${invitationId}`
  }

  /**
   * Get app name for branding
   */
  private getAppName(): string {
    return process.env.NEXT_PUBLIC_APP_NAME || 'Tribe App'
  }

  /**
   * Format role name for display
   */
  private formatRoleName(role: string): string {
    const roleMap: Record<string, string> = {
      'owner': 'Owner',
      'admin': 'Administrator', 
      'moderator': 'Moderator',
      'member': 'Member',
      'viewer': 'Viewer'
    }
    return roleMap[role] || 'Member'
  }

  /**
   * Generate HTML email template
   */
  private generateInvitationHTML(data: {
    inviterName: string
    targetName: string
    roleName: string
    invitationLink: string
    expiresAt: string
    isTreeInvitation: boolean
  }): string {
    const appName = this.getAppName()
    const expirationDate = new Date(data.expiresAt).toLocaleDateString()

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>You're Invited!</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; background-color: white; }
    .header { background: linear-gradient(135deg, #10b981, #059669); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
    .content { padding: 40px 30px; }
    .invitation-box { background-color: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center; }
    .invitation-box h2 { color: #047857; margin: 0 0 12px 0; font-size: 20px; }
    .invitation-box p { color: #065f46; margin: 8px 0; }
    .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
    .cta-button:hover { background: linear-gradient(135deg, #059669, #047857); }
    .details { background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .details h3 { margin: 0 0 12px 0; color: #374151; font-size: 16px; }
    .details p { margin: 4px 0; color: #6b7280; font-size: 14px; }
    .footer { background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 0; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${appName}</h1>
    </div>
    
    <div class="content">
      <h2>You've Been Invited!</h2>
      
      <div class="invitation-box">
        <h2>🌳 Join ${data.targetName}</h2>
        <p><strong>${data.inviterName}</strong> has invited you to join as a <strong>${data.roleName}</strong></p>
      </div>
      
      <p>You're invited to be part of our ${data.isTreeInvitation ? 'family tree' : 'branch'} community. Accept your invitation to start sharing memories, photos, and staying connected with your ${data.isTreeInvitation ? 'family' : 'group'}.</p>
      
      <div style="text-align: center; margin: 32px 0;">
        <a href="${data.invitationLink}" class="cta-button">Accept Invitation</a>
      </div>
      
      <div class="details">
        <h3>Invitation Details</h3>
        <p><strong>Invited by:</strong> ${data.inviterName}</p>
        <p><strong>Role:</strong> ${data.roleName}</p>
        <p><strong>Expires:</strong> ${expirationDate}</p>
        <p><strong>Direct link:</strong> <a href="${data.invitationLink}">${data.invitationLink}</a></p>
      </div>
      
      <p><small>This invitation will expire on ${expirationDate}. If you don't have an account yet, you'll be able to create one when you accept the invitation.</small></p>
    </div>
    
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${appName}. Bringing families together, one memory at a time.</p>
      <p>If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Generate plain text email
   */
  private generateInvitationText(data: {
    inviterName: string
    targetName: string
    roleName: string
    invitationLink: string
    expiresAt: string
    isTreeInvitation: boolean
  }): string {
    const appName = this.getAppName()
    const expirationDate = new Date(data.expiresAt).toLocaleDateString()

    return `
You've Been Invited to Join ${data.targetName}!

${data.inviterName} has invited you to join ${data.targetName} as a ${data.roleName}.

You're invited to be part of our ${data.isTreeInvitation ? 'family tree' : 'branch'} community. Accept your invitation to start sharing memories, photos, and staying connected with your ${data.isTreeInvitation ? 'family' : 'group'}.

Accept your invitation: ${data.invitationLink}

Invitation Details:
- Invited by: ${data.inviterName}
- Role: ${data.roleName} 
- Expires: ${expirationDate}

This invitation will expire on ${expirationDate}. If you don't have an account yet, you'll be able to create one when you accept the invitation.

---

© ${new Date().getFullYear()} ${appName}
If you didn't expect this invitation, you can safely ignore this email.
    `.trim()
  }
}

// Export singleton instance
export const invitationEmailService = new InvitationEmailService()