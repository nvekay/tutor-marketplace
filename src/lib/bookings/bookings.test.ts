import { describe, expect, it } from 'vitest';
import { lessonPriceCents, platformFeeCents, tutorShareCents } from './pricing';
import { assertTransition, canTransition, type BookingStatus } from './state';

describe('pricing', () => {
  it('prices a lesson from the hourly rate', () => {
    expect(lessonPriceCents(4000, 60)).toBe(4000);
    expect(lessonPriceCents(4000, 45)).toBe(3000);
    expect(lessonPriceCents(3500, 90)).toBe(5250);
    expect(lessonPriceCents(2500, 45)).toBe(1875);
  });

  it('splits the price into platform fee and tutor share without losing a cent', () => {
    for (const price of [1875, 3000, 4999, 5250, 1]) {
      expect(platformFeeCents(price, 1500) + tutorShareCents(price, 1500)).toBe(price);
    }
    expect(platformFeeCents(3000, 1500)).toBe(450);
    expect(platformFeeCents(1875, 1500)).toBe(281); // 281.25 rounds to 281
    expect(platformFeeCents(3000, 0)).toBe(0);
  });
});

describe('booking state machine', () => {
  const allowed: [BookingStatus, BookingStatus][] = [
    ['pending_payment', 'confirmed'],
    ['pending_payment', 'expired'],
    ['expired', 'confirmed'],
    ['expired', 'cancelled'],
    ['confirmed', 'completed'],
    ['confirmed', 'cancelled'],
    ['confirmed', 'disputed'],
    ['completed', 'disputed'],
    ['disputed', 'completed'],
    ['disputed', 'cancelled'],
    ['disputed', 'confirmed'],
  ];
  const statuses: BookingStatus[] = ['pending_payment', 'confirmed', 'completed', 'disputed', 'cancelled', 'expired'];

  it('allows exactly the listed transitions', () => {
    for (const from of statuses) {
      for (const to of statuses) {
        const expected = allowed.some(([a, b]) => a === from && b === to);
        expect(canTransition(from, to), `${from} → ${to}`).toBe(expected);
      }
    }
  });

  it('throws on an impossible transition', () => {
    expect(() => assertTransition('cancelled', 'confirmed')).toThrow("Booking can't go from cancelled to confirmed");
    expect(() => assertTransition('pending_payment', 'completed')).toThrow();
    expect(() => assertTransition('confirmed', 'completed')).not.toThrow();
  });
});
