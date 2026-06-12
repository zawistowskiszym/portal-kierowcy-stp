import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

const APP_URL = 'https://panel.skuszawyjice.eu'

function genToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const submitApplication = createServerFn({ method: 'POST' })
  .inputValidator((data: {
    email: string
    roblox_username: string
    discord_username?: string | null
    motivation: string
    experience?: string | null
  }) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        roblox_username: z.string().trim().min(3).max(50),
        discord_username: z.string().trim().max(50).nullable().optional(),
        motivation: z.string().trim().min(20).max(2000),
        experience: z.string().trim().max(2000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { notifyByEmail } = await import('./email/notify.server')
    const { generateQuizQuestions } = await import('./recruitment-quiz.server')

    const email = data.email.toLowerCase()
    const introToken = genToken()

    const { data: app, error } = await supabaseAdmin
      .from('recruitment_applications')
      .insert({
        email,
        roblox_username: data.roblox_username,
        discord_username: data.discord_username || null,
        motivation: data.motivation,
        experience: data.experience || null,
        intro_token: introToken,
        intro_sent_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    if (error || !app) {
      console.error('submitApplication insert failed', error)
      throw new Error('Nie udało się wysłać zgłoszenia')
    }

    // Skip intro step — generate AI questions and send quiz email directly.
    const questions = await generateQuizQuestions()
    const quizToken = genToken()
    const { error: qErr } = await supabaseAdmin.from('quiz_attempts').insert({
      token: quizToken,
      candidate_email: email,
      questions,
      status: 'pending',
    })
    if (qErr) {
      console.error('quiz_attempts insert failed', qErr)
      throw new Error('Nie udało się utworzyć quizu')
    }

    const quizUrl = `${APP_URL}/quiz/${quizToken}`
    await notifyByEmail({
      templateName: 'quiz-invite',
      recipientEmail: email,
      templateData: { quizUrl, candidateEmail: email },
      idempotencyKey: `quiz-invite-${quizToken}`,
    })

    return { ok: true }
  })

export const requestQuiz = createServerFn({ method: 'POST' })
  .inputValidator((data: { email?: string; introToken?: string }) =>
    z
      .object({
        email: z.string().trim().email().max(255).optional(),
        introToken: z.string().min(8).max(128).optional(),
      })
      .refine((v) => v.email || v.introToken, {
        message: 'email or introToken required',
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { pickQuizQuestions } = await import('./recruitment-quiz')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { notifyByEmail } = await import('./email/notify.server')

    let email = data.email?.toLowerCase() ?? ''

    if (data.introToken) {
      const { data: app, error: appErr } = await supabaseAdmin
        .from('recruitment_applications')
        .select('email')
        .eq('intro_token', data.introToken)
        .maybeSingle()
      if (appErr || !app) throw new Error('Nieprawidłowy link wprowadzenia')
      email = String(app.email).toLowerCase()
    }

    if (!email) throw new Error('Brak adresu email')

    const questions = pickQuizQuestions()
    const token = genToken()

    const { error } = await supabaseAdmin.from('quiz_attempts').insert({
      token,
      candidate_email: email,
      questions,
      status: 'pending',
    })
    if (error) {
      console.error('quiz_attempts insert failed', error)
      throw new Error('Nie udało się utworzyć quizu')
    }

    const quizUrl = `${APP_URL}/quiz/${token}`
    await notifyByEmail({
      templateName: 'quiz-invite',
      recipientEmail: email,
      templateData: { quizUrl, candidateEmail: email },
      idempotencyKey: `quiz-invite-${token}`,
    })

    return { ok: true, email }
  })

export const getQuizAttempt = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string }) =>
    z.object({ token: z.string().min(8).max(128) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: row, error } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, candidate_email, questions, status, submitted_at')
      .eq('token', data.token)
      .maybeSingle()
    if (error) throw new Error('Błąd serwera')
    if (!row) return { found: false as const }
    return {
      found: true as const,
      candidateEmail: row.candidate_email as string,
      questions: (row.questions as string[]) ?? [],
      status: row.status as string,
      submittedAt: row.submitted_at as string | null,
    }
  })

export const submitQuiz = createServerFn({ method: 'POST' })
  .inputValidator((data: { token: string; answers: string[] }) =>
    z
      .object({
        token: z.string().min(8).max(128),
        answers: z.array(z.string().max(4000)).min(1).max(50),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: row } = await supabaseAdmin
      .from('quiz_attempts')
      .select('id, status, questions')
      .eq('token', data.token)
      .maybeSingle()
    if (!row) throw new Error('Quiz nie istnieje')
    if (row.status === 'submitted') throw new Error('Quiz już wysłany')

    const questions = (row.questions as string[]) ?? []
    const answers = questions.map((_q, i) => (data.answers[i] ?? '').trim())

    const { error } = await supabaseAdmin
      .from('quiz_attempts')
      .update({
        answers,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', row.id)
    if (error) throw new Error('Nie udało się zapisać odpowiedzi')
    return { ok: true }
  })

/** Public — resolves an intro token to the candidate's email for prefill display. */
export const getIntroByToken = createServerFn({ method: 'GET' })
  .inputValidator((data: { token: string }) =>
    z.object({ token: z.string().min(8).max(128) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { data: row, error } = await supabaseAdmin
      .from('recruitment_applications')
      .select('email, roblox_username')
      .eq('intro_token', data.token)
      .maybeSingle()
    if (error) throw new Error('Błąd serwera')
    if (!row) return { found: false as const }
    return {
      found: true as const,
      candidateEmail: row.email as string,
      robloxUsername: row.roblox_username as string,
    }
  })

/** Admin — generates an intro token for a candidate and sends them the personalized intro email. */
export const sendIntro = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { applicationId: string }) =>
    z.object({ applicationId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { notifyByEmail } = await import('./email/notify.server')

    const { data: isAdmin } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    })
    if (!isAdmin) throw new Error('Brak uprawnień')

    const { data: app, error: appErr } = await supabaseAdmin
      .from('recruitment_applications')
      .select('id, email, intro_token')
      .eq('id', data.applicationId)
      .maybeSingle()
    if (appErr || !app) throw new Error('Nie znaleziono kandydata')

    const token = app.intro_token ?? genToken()
    if (!app.intro_token) {
      const { error: upErr } = await supabaseAdmin
        .from('recruitment_applications')
        .update({ intro_token: token })
        .eq('id', app.id)
      if (upErr) throw new Error('Nie udało się zapisać tokenu')
    }

    const email = String(app.email).toLowerCase()
    const introUrl = `${APP_URL}/wprowadzenie/${token}`
    await notifyByEmail({
      templateName: 'intro-invite',
      recipientEmail: email,
      templateData: { introUrl, candidateEmail: email },
      idempotencyKey: `intro-invite-${token}`,
    })

    await supabaseAdmin
      .from('recruitment_applications')
      .update({ intro_sent_at: new Date().toISOString() })
      .eq('id', app.id)

    return { ok: true, introUrl }
  })
