import { describe, expect, it } from 'vitest';
import {
  addDays,
  generateSlots,
  isBookable,
  localDateKey,
  normalizeRules,
  startOfLocalDay,
  type SlotQuery,
} from './slots';

const iso = (slots: { start: Date }[]) => slots.map((s) => s.start.toISOString());
const H = 60;

// Monday 2027-01-04; "now" is far enough back that the notice period doesn't interfere
const base: SlotQuery = {
  rules: [{ weekday: 1, startMinute: 10 * H, endMinute: 12 * H }],
  timezone: 'UTC',
  lessonMinutes: 60,
  from: new Date('2027-01-04T00:00:00Z'),
  to: new Date('2027-01-05T00:00:00Z'),
  now: new Date('2027-01-01T00:00:00Z'),
};

describe('generateSlots', () => {
  it('offers half-hourly starts that fit inside the window', () => {
    expect(iso(generateSlots(base))).toEqual([
      '2027-01-04T10:00:00.000Z',
      '2027-01-04T10:30:00.000Z',
      '2027-01-04T11:00:00.000Z',
    ]);
  });

  it('reads hours in the tutor’s time zone', () => {
    // 10:00 in Tokyo (UTC+9) is 01:00 UTC
    const slots = generateSlots({ ...base, timezone: 'Asia/Tokyo', from: new Date('2027-01-03T12:00:00Z') });
    expect(iso(slots)[0]).toBe('2027-01-04T01:00:00.000Z');
  });

  it('fits longer lessons into the same window', () => {
    expect(iso(generateSlots({ ...base, lessonMinutes: 90 }))).toEqual([
      '2027-01-04T10:00:00.000Z',
      '2027-01-04T10:30:00.000Z',
    ]);
  });

  it('requires 12 hours notice', () => {
    const now = new Date('2027-01-03T22:15:00Z'); // 12 h later is 10:15 on Monday
    expect(iso(generateSlots({ ...base, now }))).toEqual(['2027-01-04T10:30:00.000Z', '2027-01-04T11:00:00.000Z']);
  });

  it('stops 60 days ahead', () => {
    const now = new Date('2026-11-05T10:30:00Z'); // + 60 days = 2027-01-04 10:30
    expect(iso(generateSlots({ ...base, now }))).toEqual(['2027-01-04T10:00:00.000Z', '2027-01-04T10:30:00.000Z']);
  });

  it('skips slots that overlap a booking or a hold', () => {
    const busy = [{ start: new Date('2027-01-04T10:30:00Z'), end: new Date('2027-01-04T11:30:00Z') }];
    expect(generateSlots({ ...base, busy })).toEqual([]);
    const morning = [{ start: new Date('2027-01-04T09:00:00Z'), end: new Date('2027-01-04T10:00:00Z') }];
    expect(generateSlots({ ...base, busy: morning })).toHaveLength(3); // touching end is not an overlap
  });

  it('honours days off and special hours', () => {
    expect(
      generateSlots({ ...base, exceptions: [{ date: '2027-01-04', startMinute: null, endMinute: null }] }),
    ).toEqual([]);
    const special = generateSlots({
      ...base,
      exceptions: [{ date: '2027-01-04', startMinute: 15 * H, endMinute: 16 * H }],
    });
    expect(iso(special)).toEqual(['2027-01-04T15:00:00.000Z']);
  });

  it('handles a window that ends at midnight', () => {
    const slots = generateSlots({ ...base, rules: [{ weekday: 1, startMinute: 22 * H, endMinute: 24 * H }] });
    expect(iso(slots)).toEqual(['2027-01-04T22:00:00.000Z', '2027-01-04T22:30:00.000Z', '2027-01-04T23:00:00.000Z']);
  });

  it('skips times that don’t exist when clocks go forward', () => {
    // New York, Sunday 2027-03-14: 02:00 jumps to 03:00, so 01:00–04:00 is only two real hours
    const slots = generateSlots({
      ...base,
      timezone: 'America/New_York',
      rules: [{ weekday: 7, startMinute: 1 * H, endMinute: 4 * H }],
      from: new Date('2027-03-14T00:00:00Z'),
      to: new Date('2027-03-15T00:00:00Z'),
      now: new Date('2027-03-01T00:00:00Z'),
    });
    expect(iso(slots)).toEqual([
      '2027-03-14T06:00:00.000Z', // 01:00 EST
      '2027-03-14T06:30:00.000Z', // 01:30 EST
      '2027-03-14T07:00:00.000Z', // 03:00 EDT
    ]);
  });

  it('uses real durations when clocks go back', () => {
    // New York, Sunday 2027-11-07: 02:00 falls back to 01:00, so 00:00–03:00 lasts four real hours
    const slots = generateSlots({
      ...base,
      timezone: 'America/New_York',
      rules: [{ weekday: 7, startMinute: 0, endMinute: 3 * H }],
      from: new Date('2027-11-07T00:00:00Z'),
      to: new Date('2027-11-08T00:00:00Z'),
      now: new Date('2027-11-01T00:00:00Z'),
    });
    expect(iso(slots)).toEqual([
      '2027-11-07T04:00:00.000Z', // 00:00 EDT
      '2027-11-07T04:30:00.000Z',
      '2027-11-07T05:00:00.000Z', // 01:00 EDT
      '2027-11-07T05:30:00.000Z',
      '2027-11-07T07:00:00.000Z', // 02:00 EST, ends exactly at 03:00 EST
    ]);
    // Every slot is a real hour long
    expect(slots.every((s) => s.end.getTime() - s.start.getTime() === 3_600_000)).toBe(true);
  });

  it('returns nothing for an empty or past range', () => {
    expect(generateSlots({ ...base, rules: [] })).toEqual([]);
    expect(generateSlots({ ...base, now: new Date('2027-02-01T00:00:00Z') })).toEqual([]);
  });
});

describe('isBookable', () => {
  it('accepts offered slots only', () => {
    const query = { ...base, busy: [] };
    expect(isBookable(query, new Date('2027-01-04T10:30:00Z'))).toBe(true);
    expect(isBookable(query, new Date('2027-01-04T10:15:00Z'))).toBe(false); // off the grid
    expect(isBookable(query, new Date('2027-01-04T11:30:00Z'))).toBe(false); // runs past 12:00
    expect(isBookable(query, new Date('2027-01-05T10:00:00Z'))).toBe(false); // Tuesday
  });
});

describe('normalizeRules', () => {
  it('sorts valid hours', () => {
    const result = normalizeRules([
      { weekday: 3, startMinute: 600, endMinute: 660 },
      { weekday: 1, startMinute: 900, endMinute: 960 },
      { weekday: 1, startMinute: 540, endMinute: 600 },
    ]);
    expect(result).toEqual({
      rules: [
        { weekday: 1, startMinute: 540, endMinute: 600 },
        { weekday: 1, startMinute: 900, endMinute: 960 },
        { weekday: 3, startMinute: 600, endMinute: 660 },
      ],
    });
  });

  it('rejects overlaps, reversed ranges and off-grid times', () => {
    expect(
      normalizeRules([
        { weekday: 2, startMinute: 540, endMinute: 720 },
        { weekday: 2, startMinute: 660, endMinute: 780 },
      ]),
    ).toEqual({ error: 'Time ranges overlap on Tuesday' });
    expect(normalizeRules([{ weekday: 1, startMinute: 600, endMinute: 600 }])).toHaveProperty('error');
    expect(normalizeRules([{ weekday: 1, startMinute: 605, endMinute: 660 }])).toHaveProperty('error');
    expect(normalizeRules([{ weekday: 8, startMinute: 600, endMinute: 660 }])).toHaveProperty('error');
  });
});

describe('calendar helpers', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2027-12-30', 3)).toBe('2028-01-02');
    expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
  });

  it('finds the start of a local day', () => {
    expect(startOfLocalDay('2027-01-05', 'Asia/Tokyo').toISOString()).toBe('2027-01-04T15:00:00.000Z');
    expect(startOfLocalDay('2027-07-05', 'America/New_York').toISOString()).toBe('2027-07-05T04:00:00.000Z');
  });
});

describe('localDateKey', () => {
  it('uses the calendar date of the time zone', () => {
    const instant = new Date('2027-01-04T23:30:00Z');
    expect(localDateKey(instant, 'UTC')).toBe('2027-01-04');
    expect(localDateKey(instant, 'Asia/Tokyo')).toBe('2027-01-05');
    expect(localDateKey(instant, 'America/Los_Angeles')).toBe('2027-01-04');
  });
});
