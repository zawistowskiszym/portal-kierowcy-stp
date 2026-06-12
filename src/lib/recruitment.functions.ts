import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const APP_URL = 'https://panel.skuszawyjice.eu'

function genToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export const requestQuiz = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string }) =>
    z
      .object({ email: z.string().trim().email().max(255) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { pickQuizQuestions } = await import('./recruitment-quiz')
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { notifyByEmail } = await import('./email/notify.server')

    const email = data.email.toLowerCase()
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

    return { ok: true }
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
