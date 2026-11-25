// Puts each "•" (U+2022) that follows other text on its own line, so a
// description pasted from a job posting keeps its list. A bullet already at
// the start of a line is left alone, so running it twice changes nothing.
export function cleanBullets(text: string): string {
  return text.replace(/(?<=\S)[ \t]*•/gu, "\n•");
}
