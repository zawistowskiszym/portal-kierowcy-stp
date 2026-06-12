import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { QUIZ_QUESTIONS, QUIZ_PICK_COUNT, pickQuizQuestions } from './recruitment-quiz'

const SYSTEM = `Jesteś rekruterem w Skuszawyjińskim Transporcie Publicznym (STP) — operatorze autobusów i tramwajów w fikcyjnym mieście Skuszawyjice (gra Roblox). Tworzysz pytania otwarte do quizu rekrutacyjnego dla kandydatów na kierowców.`

const PROMPT = `Wygeneruj ${QUIZ_PICK_COUNT} unikalnych, otwartych pytań po polsku do quizu rekrutacyjnego STP.

Tematyka: obsługa pasażerów, bezpieczeństwo ruchu, procedury awaryjne (pożar, kolizja, zasłabnięcie, agresywny pasażer), obowiązki kierowcy, znajomość STP i komunikacji miejskiej w Skuszawyjicach, rola dyspozytora, Portal Kierowcy, postępowanie na przystankach.

Wymagania:
- Pytania otwarte (nie zamknięte/ABCD).
- Krótkie, jedno zdanie, zakończone znakiem zapytania.
- Zróżnicowane — nie powtarzaj tej samej tematyki.
- Inspiruj się stylem (ale NIE kopiuj dosłownie) tych przykładów:
${QUIZ_QUESTIONS.map((q) => `- ${q}`).join('\n')}`

export async function generateQuizQuestions(): Promise<string[]> {
  const key = process.env.LOVABLE_API_KEY
  if (!key) return pickQuizQuestions()

  try {
    const provider = createOpenAICompatible({
      name: 'lovable',
      baseURL: 'https://ai.gateway.lovable.dev/v1',
      headers: {
        'Lovable-API-Key': key,
        'X-Lovable-AIG-SDK': 'vercel-ai-sdk',
      },
    })

    const { experimental_output } = await generateText({
      model: provider('google/gemini-3-flash-preview'),
      system: SYSTEM,
      prompt: PROMPT,
      experimental_output: Output.object({
        schema: z.object({
          questions: z.array(z.string().min(8).max(300)),
        }),
      }),
    })

    const qs = (experimental_output?.questions ?? [])
      .map((q) => q.trim())
      .filter((q) => q.length > 0)

    if (qs.length >= QUIZ_PICK_COUNT) return qs.slice(0, QUIZ_PICK_COUNT)
    // Top up from pool if AI returned fewer
    const extra = pickQuizQuestions(QUIZ_PICK_COUNT - qs.length)
    return [...qs, ...extra]
  } catch (err) {
    console.error('generateQuizQuestions failed, falling back to pool', err)
    return pickQuizQuestions()
  }
}
