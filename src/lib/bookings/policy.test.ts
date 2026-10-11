import { describe, expect, it } from 'vitest';
import { canComplain, payoutDueAt, quoteCancellation, splitAfterRefund } from './policy';

const startsAt = new Date('2027-03-10T15:00:00Z');
const hoursBefore = (h: number) => new Date(startsAt.getTime() - h * 3_600_000);
const quote = (by: 'student' | 'tutor' | 'admin', now: Date, priceCents = 4000) =>
  quoteCancellation({ by, startsAt, now, priceCents, feeBps: 1500 });

describe('quoteCancellation', () => {
  it('refunds a student in full 24 hours or more ahead', () => {
    expect(quote('student', hoursBefore(24))).toEqual({
      allowed: true,
      late: false,
      refundCents: 4000,
      tutorCents: 0,
      platformCents: 0,
    });
    expect(quote('student', hoursBefore(72))).toMatchObject({ refundCents: 4000 });
  });

  it('refunds half on a late cancellation and pays the tutor their share of the rest', () => {
    // 2000 kept: platform 15% = 300, tutor 1700
    expect(quote('student', hoursBefore(23.9))).toEqual({
      allowed: true,
      late: true,
      refundCents: 2000,
      tutorCents: 1700,
      platformCents: 300,
    });
  });

  it('always refunds in full when the tutor or an admin cancels', () => {
    expect(quote('tutor', hoursBefore(1))).toMatchObject({ refundCents: 4000, tutorCents: 0 });
    expect(quote('admin', hoursBefore(0.1))).toMatchObject({ refundCents: 4000, tutorCents: 0 });
  });

  it('refuses once the lesson has started', () => {
    expect(quote('student', startsAt)).toEqual({ allowed: false, reason: 'The lesson has already started' });
    expect(quote('tutor', hoursBefore(-1)).allowed).toBe(false);
  });

  it('never loses a cent on odd prices', () => {
    for (const price of [1875, 4999, 5250, 1]) {
      const q = quote('student', hoursBefore(2), price);
      if (!q.allowed) throw new Error('expected allowed');
      expect(q.refundCents + q.tutorCents + q.platformCents).toBe(price);
    }
  });
});

describe('splitAfterRefund', () => {
  it('applies the commission to the kept part only', () => {
    expect(splitAfterRefund(4000, 0, 1500)).toEqual({ refundCents: 0, tutorCents: 3400, platformCents: 600 });
    expect(splitAfterRefund(4000, 1000, 1500)).toEqual({ refundCents: 1000, tutorCents: 2550, platformCents: 450 });
  });

  it('rejects impossible refunds', () => {
    expect(() => splitAfterRefund(4000, 4001, 1500)).toThrow();
    expect(() => splitAfterRefund(4000, -1, 1500)).toThrow();
    expect(() => splitAfterRefund(4000, 10.5, 1500)).toThrow();
  });
});

describe('complaint window', () => {
  const endsAt = new Date('2027-03-10T16:00:00Z');
  it('is open for 24 hours after the lesson', () => {
    expect(canComplain(endsAt, new Date('2027-03-10T15:59:00Z'))).toBe(false);
    expect(canComplain(endsAt, endsAt)).toBe(true);
    expect(canComplain(endsAt, new Date('2027-03-11T15:59:00Z'))).toBe(true);
    expect(canComplain(endsAt, new Date('2027-03-11T16:00:00Z'))).toBe(false);
  });

  it('pays the tutor when the window closes', () => {
    expect(payoutDueAt(endsAt).toISOString()).toBe('2027-03-11T16:00:00.000Z');
  });
});
