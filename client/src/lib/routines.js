// Admin-generated slugs may include "peau"; always return the stored slug for API requests.
export const canonicalRoutineSlug = (slug) => slug.replace(/^routine-peaux?-/, 'routine-');

export function routineSlugMap(categories) {
  return new Map(categories.filter((c) => c.kind === 'routine').map((c) => [canonicalRoutineSlug(c.slug), c.slug]));
}
