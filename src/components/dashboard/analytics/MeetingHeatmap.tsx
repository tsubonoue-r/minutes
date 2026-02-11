'use client';

/**
 * MeetingHeatmap component - 7x24 grid showing meeting frequency by day/hour
 * @module components/dashboard/analytics/MeetingHeatmap
 */

import { useMemo } from 'react';
import type {
  ReadonlyMeetingsByDayOfWeek,
  ReadonlyMeetingsByHour,
} from '@/types/analytics';
import { getDayLabel, formatHour } from '@/types/analytics';

/**
 * Props for MeetingHeatmap component
 */
interface MeetingHeatmapProps {
  /** Meeting frequency by day of week */
  readonly meetingsByDayOfWeek: readonly ReadonlyMeetingsByDayOfWeek[];
  /** Meeting frequency by hour of day */
  readonly meetingsByHour: readonly ReadonlyMeetingsByHour[];
  /** Optional additional className */
  readonly className?: string;
}

/**
 * Heatmap cell data
 */
interface HeatmapCell {
  readonly day: number;
  readonly hour: number;
  readonly intensity: number;
}

/**
 * Get the background color class based on intensity (0-1)
 */
function getIntensityStyle(intensity: number): string {
  if (intensity === 0) {
    return 'bg-slate-50 dark:bg-slate-800';
  }
  if (intensity < 0.2) {
    return 'bg-blue-100 dark:bg-blue-900/30';
  }
  if (intensity < 0.4) {
    return 'bg-blue-200 dark:bg-blue-800/40';
  }
  if (intensity < 0.6) {
    return 'bg-blue-300 dark:bg-blue-700/50';
  }
  if (intensity < 0.8) {
    return 'bg-blue-400 dark:bg-blue-600/60';
  }
  return 'bg-blue-500 dark:bg-blue-500/70';
}

/**
 * Build heatmap data combining day and hour distributions
 *
 * Generates a simplified heatmap where cell intensity is the product of
 * day and hour normalized frequencies.
 */
function buildHeatmapData(
  meetingsByDayOfWeek: readonly ReadonlyMeetingsByDayOfWeek[],
  meetingsByHour: readonly ReadonlyMeetingsByHour[]
): readonly HeatmapCell[] {
  // Normalize day counts
  const maxDayCount = Math.max(
    ...meetingsByDayOfWeek.map((d) => d.count),
    1
  );
  const dayIntensities = new Map<number, number>();
  for (const d of meetingsByDayOfWeek) {
    dayIntensities.set(d.day, d.count / maxDayCount);
  }

  // Normalize hour counts
  const maxHourCount = Math.max(
    ...meetingsByHour.map((h) => h.count),
    1
  );
  const hourIntensities = new Map<number, number>();
  for (const h of meetingsByHour) {
    hourIntensities.set(h.hour, h.count / maxHourCount);
  }

  // Build cells: Only show business hours (7-21) for readability
  const cells: HeatmapCell[] = [];
  for (let day = 0; day <= 6; day++) {
    for (let hour = 7; hour <= 21; hour++) {
      const dayIntensity = dayIntensities.get(day) ?? 0;
      const hourIntensity = hourIntensities.get(hour) ?? 0;
      // Combined intensity: geometric mean for better distribution
      const combined =
        dayIntensity > 0 && hourIntensity > 0
          ? Math.sqrt(dayIntensity * hourIntensity)
          : 0;
      cells.push({ day, hour, intensity: combined });
    }
  }

  return cells;
}

/**
 * Hours to display in the heatmap (business hours)
 */
const DISPLAY_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21] as const;

/**
 * Days in order (Monday first for Japanese business convention)
 */
const DISPLAY_DAYS = [1, 2, 3, 4, 5, 6, 0] as const;

/**
 * MeetingHeatmap component
 *
 * Displays a heatmap grid showing when meetings are most frequent.
 * Rows represent days of the week, columns represent hours of the day.
 * Cell color intensity indicates relative meeting frequency.
 *
 * @example
 * ```tsx
 * <MeetingHeatmap
 *   meetingsByDayOfWeek={analytics.meetingsByDayOfWeek}
 *   meetingsByHour={analytics.meetingsByHour}
 * />
 * ```
 */
export function MeetingHeatmap({
  meetingsByDayOfWeek,
  meetingsByHour,
  className = '',
}: MeetingHeatmapProps): JSX.Element {
  const heatmapData = useMemo(
    () => buildHeatmapData(meetingsByDayOfWeek, meetingsByHour),
    [meetingsByDayOfWeek, meetingsByHour]
  );

  // Create a lookup map for fast cell access
  const cellMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    for (const cell of heatmapData) {
      map.set(`${cell.day}-${cell.hour}`, cell);
    }
    return map;
  }, [heatmapData]);

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 ${className}`}
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          会議ヒートマップ
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          曜日 x 時間帯の会議頻度
        </p>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Hour labels */}
          <div className="flex mb-1">
            <div className="w-10 flex-shrink-0" />
            {DISPLAY_HOURS.map((hour) => (
              <div
                key={hour}
                className="flex-1 text-center text-xs text-slate-400 dark:text-slate-500"
              >
                {hour % 3 === 0 ? formatHour(hour) : ''}
              </div>
            ))}
          </div>

          {/* Day rows */}
          {DISPLAY_DAYS.map((day) => (
            <div key={day} className="flex items-center mb-1">
              {/* Day label */}
              <div className="w-10 flex-shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400 text-right pr-2">
                {getDayLabel(day)}
              </div>
              {/* Hour cells */}
              {DISPLAY_HOURS.map((hour) => {
                const cell = cellMap.get(`${day}-${hour}`);
                const intensity = cell?.intensity ?? 0;
                return (
                  <div
                    key={`${day}-${hour}`}
                    className={`flex-1 aspect-square mx-0.5 rounded-sm ${getIntensityStyle(intensity)} transition-colors`}
                    title={`${getDayLabel(day)}曜日 ${formatHour(hour)} - 頻度: ${Math.round(intensity * 100)}%`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-end gap-1.5">
        <span className="text-xs text-slate-400 dark:text-slate-500 mr-1">
          少
        </span>
        <div className="w-4 h-4 rounded-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600" />
        <div className="w-4 h-4 rounded-sm bg-blue-100 dark:bg-blue-900/30" />
        <div className="w-4 h-4 rounded-sm bg-blue-200 dark:bg-blue-800/40" />
        <div className="w-4 h-4 rounded-sm bg-blue-300 dark:bg-blue-700/50" />
        <div className="w-4 h-4 rounded-sm bg-blue-400 dark:bg-blue-600/60" />
        <div className="w-4 h-4 rounded-sm bg-blue-500 dark:bg-blue-500/70" />
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">
          多
        </span>
      </div>
    </div>
  );
}
