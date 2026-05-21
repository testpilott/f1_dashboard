/** Compute age in full years as of `now` from an ISO date-of-birth string. */
export function ageFromDateOfBirth(dob: string, now: Date = new Date()): number {
  const birth = new Date(dob);
  if (!Number.isFinite(birth.getTime())) return 0;

  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - birth.getUTCMonth();
  const dayDelta = now.getUTCDate() - birth.getUTCDate();

  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1;
  }

  return age;
}