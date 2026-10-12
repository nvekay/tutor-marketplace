import { describe, expect, it } from 'vitest';
import { matchesAvailability, weeklyHeatmap } from './heatmap';

const H = 60;
// A January week: New York is UTC−5, Berlin UTC+1, Tokyo UTC+9
const reference = new Date('2027-01-06T12:00:00Z');
const cells = (grid: boolean[][]) =>
  grid.flatMap((bands, day) => bands.map((on, band) => (on ? `${day}:${band}` : null)).filter(Boolean));

describe('weeklyHeatmap', () => {
  it('maps hours into four-hour bands of the same time zone', () => {
    const grid = weeklyHeatmap([{ weekday: 1, startMinute: 10 * H, endMinute: 14 * H }], 'UTC', 'UTC', reference);
    expect(cells(grid)).toEqual(['0:2', '0:3']); // Monday 08–12 and 12–16
  });

  it('shifts hours into the viewer’s time zone', () => {
    // Berlin Monday 10–18 is New York Monday 04–12
    const grid = weeklyHeatmap(
      [{ weekday: 1, startMinute: 10 * H, endMinute: 18 * H }],
      'Europe/Berlin',
      'America/New_York',
      reference,
    );
    expect(cells(grid)).toEqual(['0:1', '0:2']);
  });

  it('moves a lesson to the previous day across the date line', () => {
    // Tokyo Monday 09–11 is New York Sunday 19–21
    const grid = weeklyHeatmap(
      [{ weekday: 1, startMinute: 9 * H, endMinute: 11 * H }],
      'Asia/Tokyo',
      'America/New_York',
      reference,
    );
    expect(cells(grid)).toEqual(['6:4', '6:5']);
  });

  it('is empty without weekly hours', () => {
    expect(cells(weeklyHeatmap([], 'UTC', 'UTC', reference))).toEqual([]);
  });
});

describe('matchesAvailability', () => {
  const grid = weeklyHeatmap(
    [
      { weekday: 6, startMinute: 9 * H, endMinute: 11 * H }, // Saturday morning
      { weekday: 2, startMinute: 18 * H, endMinute: 20 * H }, // Tuesday evening
    ],
    'UTC',
    'UTC',
    reference,
  );

  it('checks days and times of day', () => {
    expect(matchesAvailability(grid, 'weekends')).toBe(true);
    expect(matchesAvailability(grid, 'weekdays')).toBe(true);
    expect(matchesAvailability(grid, 'mornings')).toBe(true);
    expect(matchesAvailability(grid, 'evenings')).toBe(true);
    expect(matchesAvailability(grid, 'afternoons')).toBe(false);
  });
});
