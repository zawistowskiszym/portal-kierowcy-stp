export const QUIZ_QUESTIONS: string[] = [
  "Jak nazywa się operator komunikacji miejskiej w Skuszawyjicach?",
  "Jakie środki transportu obsługuje STP?",
  "Jak nazywa się państwowy przewoźnik kolejowy działający w Skuszawyjicach?",
  "Jak powinien zachowywać się kierowca STP wobec pasażerów?",
  "Gdzie należy zgłaszać problemy techniczne pojazdu?",
  "Co należy zrobić po kolizji pojazdu?",
  "Jak nazywa się miasto świata gry?",
  "Jaką rolę pełni dyspozytor?",
  "W jakim celu istnieje Portal Kierowcy STP?",
  "Jak należy postąpić, gdy pasażer zadaje pytanie?",
  "Jak powinien zachowywać się kierowca podczas postoju na przystanku?",
  "Dlaczego nie należy zamykać drzwi natychmiast po zatrzymaniu?",
  "Co zrobić, gdy pasażer zachowuje się agresywnie?",
  "Jakie są najważniejsze obowiązki kierowcy wobec pasażerów?",
  "Dlaczego należy zachować odstęp od poprzedzającego pojazdu?",
  "Co należy zrobić przed zmianą pasa ruchu?",
  "Co jest ważniejsze: punktualność czy bezpieczeństwo?",
  "Co należy zrobić w przypadku pożaru pojazdu?",
  "Co zrobić, gdy pasażer zasłabnie?",
  "Jakie są trzy najważniejsze cechy dobrego kierowcy STP?",
];

export const QUIZ_PICK_COUNT = 15;

export function pickQuizQuestions(count = QUIZ_PICK_COUNT): string[] {
  const pool = [...QUIZ_QUESTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}
