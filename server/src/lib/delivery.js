// Use the upper end of the published delivery window: 48h in Casablanca,
// four working days elsewhere. Working days match the shipping data (Mon–Sat).
export function estimatedDeliveryDate(createdAt, casablanca) {
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Casablanca', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(createdAt));
  const date = new Date(`${localDate}T12:00:00Z`);
  let remaining = casablanca ? 2 : 4;
  while (remaining > 0) {
    date.setUTCDate(date.getUTCDate() + 1);
    if (casablanca || date.getUTCDay() !== 0) remaining -= 1;
  }
  return date.toISOString().slice(0, 10);
}
