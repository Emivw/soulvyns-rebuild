export type BookingStatus = 'pending_payment' | 'confirmed' | 'paid' | 'cancelled';

export const INITIAL_BOOKING_STATUS: BookingStatus = 'pending_payment';

export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  'pending_payment',
  'confirmed',
  'paid',
];

export const VALID_STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending_payment: ['paid', 'confirmed', 'cancelled'],
  paid: ['confirmed', 'cancelled'],
  confirmed: ['cancelled'],
  cancelled: [],
};

export function canTransitionStatus(
  current: BookingStatus,
  next: BookingStatus,
): boolean {
  if (current === next) return true;
  return VALID_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

export function assertValidStatusTransition(
  current: BookingStatus,
  next: BookingStatus,
) {
  if (!canTransitionStatus(current, next)) {
    throw new Error(
      `Invalid booking status transition: ${current} → ${next}`,
    );
  }
}

