// Server-only helper to enqueue transactional emails from server functions.
// Replicates the pre-render + enqueue logic of /lovable/email/transactional/send
// so server functions can notify users without forwarding an HTTP request.

import * as React from 'react'
import { render } from '@react-email/components'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'stp-driver-hub'
const SENDER_DOMAIN = 'notify.panel.skuszawyjice.eu'
const FROM_DOMAIN = 'panel.skuszawyjice.eu'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface NotifyArgs {
  templateName: string
  recipientEmail: string
  templateData?: Record<string, any>
  idempotencyKey?: string
}

/**
 * Pre-renders a template and enqueues it for the email dispatcher.
 * Silently logs failures — never throws — so a notification problem can never
 * block a user-facing action (sending a message, publishing an announcement).
 */
export async function notifyByEmail(args: NotifyArgs): Promise<void> {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const tpl = TEMPLATES[args.templateName]
    if (!tpl) {
      console.error('notifyByEmail: unknown template', args.templateName)
      return
    }
    const recipient = (tpl.to || args.recipientEmail || '').trim()
    if (!recipient) return

    const normalized = recipient.toLowerCase()
    const data = args.templateData ?? {}
    const messageId = crypto.randomUUID()
    const idempotencyKey = args.idempotencyKey ?? messageId

    // Suppression check — fail closed but quiet.
    const { data: suppressed } = await supabaseAdmin
      .from('suppressed_emails')
      .select('id')
      .eq('email', normalized)
      .maybeSingle()
    if (suppressed) {
      await supabaseAdmin.from('email_send_log').insert({
        message_id: messageId,
        template_name: args.templateName,
        recipient_email: recipient,
        status: 'suppressed',
      })
      return
    }

    // Unsubscribe token (one per email)
    let unsubscribeToken: string
    const { data: existing } = await supabaseAdmin
      .from('email_unsubscribe_tokens')
      .select('token, used_at')
      .eq('email', normalized)
      .maybeSingle()
    if (existing && !existing.used_at) {
      unsubscribeToken = existing.token
    } else if (!existing) {
      unsubscribeToken = generateToken()
      await supabaseAdmin
        .from('email_unsubscribe_tokens')
        .upsert(
          { token: unsubscribeToken, email: normalized },
          { onConflict: 'email', ignoreDuplicates: true },
        )
      const { data: storedToken } = await supabaseAdmin
        .from('email_unsubscribe_tokens')
        .select('token')
        .eq('email', normalized)
        .maybeSingle()
      if (storedToken?.token) unsubscribeToken = storedToken.token
    } else {
      // existing.used_at set but no suppression — skip
      return
    }

    const element = React.createElement(tpl.component, data)
    const html = await render(element)
    const text = await render(element, { plainText: true })
    const subject =
      typeof tpl.subject === 'function' ? tpl.subject(data) : tpl.subject

    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: args.templateName,
      recipient_email: recipient,
      status: 'pending',
    })

    const { error } = await supabaseAdmin.rpc('enqueue_email', {
      queue_name: 'transactional_emails',
      payload: {
        message_id: messageId,
        to: recipient,
        from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: args.templateName,
        idempotency_key: idempotencyKey,
        unsubscribe_token: unsubscribeToken!,
        queued_at: new Date().toISOString(),
      },
    })
    if (error) {
      console.error('notifyByEmail enqueue failed', error)
      await supabaseAdmin.from('email_send_log').insert({
        message_id: messageId,
        template_name: args.templateName,
        recipient_email: recipient,
        status: 'failed',
        error_message: 'enqueue failed',
      })
    }
  } catch (err) {
    console.error('notifyByEmail unexpected error', err)
  }
}

/**
 * Look up emails for a set of user IDs (auth.users), filtering out anyone
 * who explicitly opted out (profiles.email_notifications = false).
 */
export async function lookupNotifiableEmails(
  userIds: string[],
): Promise<Array<{ id: string; email: string; full_name: string | null }>> {
  if (userIds.length === 0) return []
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email_notifications')
    .in('id', userIds)
  const allow = new Map<string, { full_name: string | null; opted: boolean }>()
  for (const p of profiles ?? []) {
    allow.set(p.id as string, {
      full_name: (p as any).full_name ?? null,
      opted: (p as any).email_notifications !== false,
    })
  }

  const out: Array<{ id: string; email: string; full_name: string | null }> = []
  await Promise.all(
    userIds.map(async (uid) => {
      const pref = allow.get(uid)
      if (pref && !pref.opted) return
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(uid)
      if (error || !data?.user?.email) return
      out.push({ id: uid, email: data.user.email, full_name: pref?.full_name ?? null })
    }),
  )
  return out
}

/**
 * All active users who haven't opted out of email notifications.
 */
export async function lookupAllNotifiableEmails(): Promise<
  Array<{ id: string; email: string; full_name: string | null }>
> {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email_notifications, active')
    .eq('active', true)
  const ids = (profiles ?? [])
    .filter((p: any) => p.email_notifications !== false)
    .map((p: any) => p.id as string)
  return lookupNotifiableEmails(ids)
}

