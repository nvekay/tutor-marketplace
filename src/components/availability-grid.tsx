import { HEAT_BANDS, WEEKDAY_SHORT, type Heatmap } from '@/lib/availability/heatmap';

const pad = (h: number) => String(h).padStart(2, '0');

/** Week × time-of-day grid of a tutor's free time, in the viewer's time zone */
export function AvailabilityGrid({ heatmap, timezone }: { heatmap: Heatmap; timezone: string }) {
  return (
    <figure>
      <table className="w-full table-fixed border-separate border-spacing-0.5 text-xs">
        <thead>
          <tr>
            <th className="w-12" />
            {WEEKDAY_SHORT.map((d) => (
              <th key={d} scope="col" className="pb-1 font-medium text-stone-500">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HEAT_BANDS.map((band, b) => (
            <tr key={band.from}>
              <th scope="row" className="pr-1 text-left font-normal whitespace-nowrap text-stone-500 tabular-nums">
                {pad(band.from)}–{pad(band.to)}
              </th>
              {heatmap.map((day, d) => (
                <td
                  key={d}
                  className={`h-6 rounded-sm ${day[b] ? 'bg-accent' : 'bg-stone-100 dark:bg-stone-800'}`}
                  aria-label={`${WEEKDAY_SHORT[d]} ${pad(band.from)}–${pad(band.to)}: ${day[b] ? 'available' : 'unavailable'}`}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <figcaption className="mt-2 text-xs text-stone-500">Based on your time zone: {timezone}</figcaption>
    </figure>
  );
}
