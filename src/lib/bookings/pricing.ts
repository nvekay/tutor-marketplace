// Money is always integer cents; rounding happens once, here.

/** Lesson price from the tutor's hourly rate */
export const lessonPriceCents = (hourlyRateCents: number, lessonMinutes: number) =>
  Math.round((hourlyRateCents * lessonMinutes) / 60);

/** Platform commission in basis points (1500 = 15%) */
export const platformFeeCents = (priceCents: number, feeBps: number) => Math.round((priceCents * feeBps) / 10_000);

/** What the tutor receives for a lesson that took place */
export const tutorShareCents = (priceCents: number, feeBps: number) =>
  priceCents - platformFeeCents(priceCents, feeBps);
