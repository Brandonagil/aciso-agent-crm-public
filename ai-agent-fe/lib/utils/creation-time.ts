import { Timestamp } from 'firebase-admin/firestore';

/** Normalize stored plan dates so mixed Firestore and JSON records sort together. */
export function creationTime(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  const time = value instanceof Date
    ? value.getTime()
    : typeof value === 'string' || typeof value === 'number'
      ? new Date(value).getTime()
      : 0;
  return Number.isFinite(time) ? time : 0;
}
