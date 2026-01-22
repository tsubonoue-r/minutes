'use client';

/**
 * Calendar View Component - Month/Week/Day calendar display
 * @module components/calendar/CalendarView
 */

import { useState, useMemo } from 'react';
import type { CalendarEvent, CalendarViewMode } from '@/types/calendar';
import { getEventsInRange, eventOccursOnDate } from '@/types/calendar';
import { EventCard } from './EventCard';
import { Skeleton } from '@/components/ui';

/**
 * View mode button props
 */
interface ViewModeButtonProps {
  readonly mode: CalendarViewMode;
  readonly currentMode: CalendarViewMode;
  readonly label: string;
  readonly onClick: (mode: CalendarViewMode) => void;
}

/**
 * View mode button
 */
function ViewModeButton({
  mode,
  currentMode,
  label,
  onClick,
}: ViewModeButtonProps): JSX.Element {
  const isActive = mode === currentMode;

  return (
    <button
      type="button"
      onClick={() => onClick(mode)}
      className={`
        px-3 py-1.5 text-sm font-medium rounded-md transition-colors
        ${isActive
          ? 'bg-lark-primary text-white'
          : 'text-gray-600 hover:bg-gray-100'
        }
      `}
      aria-pressed={isActive}
    >
      {label}
    </button>
  );
}

/**
 * Get days in month
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Get first day of month (0 = Sunday)
 */
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/**
 * Generate calendar days for month view
 */
function generateMonthDays(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const days: Date[] = [];

  // Add days from previous month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

  for (let i = firstDay - 1; i >= 0; i--) {
    days.push(new Date(prevYear, prevMonth, daysInPrevMonth - i));
  }

  // Add days in current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  // Add days from next month to fill the grid (6 weeks)
  const remainingDays = 42 - days.length;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  for (let i = 1; i <= remainingDays; i++) {
    days.push(new Date(nextYear, nextMonth, i));
  }

  return days;
}

/**
 * Generate week days for week view
 */
function generateWeekDays(date: Date): Date[] {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(startOfWeek);
    day.setDate(startOfWeek.getDate() + i);
    days.push(day);
  }

  return days;
}

/**
 * Check if date is today
 */
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if date is in current month
 */
function isCurrentMonth(date: Date, currentDate: Date): boolean {
  return date.getMonth() === currentDate.getMonth();
}

/**
 * Day names
 */
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Calendar view props
 */
export interface CalendarViewProps {
  /** Calendar events */
  readonly events: readonly CalendarEvent[];
  /** Current view mode */
  readonly viewMode?: CalendarViewMode;
  /** View mode change handler */
  readonly onViewModeChange?: (mode: CalendarViewMode) => void;
  /** Selected date */
  readonly selectedDate?: Date;
  /** Date change handler */
  readonly onDateChange?: (date: Date) => void;
  /** Event click handler */
  readonly onEventClick?: (event: CalendarEvent) => void;
  /** Loading state */
  readonly isLoading?: boolean;
  /** Custom class name */
  readonly className?: string;
}

/**
 * Calendar View Component
 *
 * @description Displays a calendar with month/week/day views
 * @example
 * ```tsx
 * <CalendarView
 *   events={events}
 *   viewMode="month"
 *   onEventClick={(e) => console.log(e.eventId)}
 * />
 * ```
 */
export function CalendarView({
  events,
  viewMode = 'month',
  onViewModeChange,
  selectedDate,
  onDateChange,
  onEventClick,
  isLoading = false,
  className = '',
}: CalendarViewProps): JSX.Element {
  const [currentDate, setCurrentDate] = useState(selectedDate ?? new Date());
  const [currentViewMode, setCurrentViewMode] = useState<CalendarViewMode>(viewMode);

  // Generate days based on view mode
  const days = useMemo(() => {
    if (currentViewMode === 'month') {
      return generateMonthDays(currentDate);
    }
    if (currentViewMode === 'week') {
      return generateWeekDays(currentDate);
    }
    return [currentDate];
  }, [currentDate, currentViewMode]);

  // Navigation handlers
  const handlePrevious = (): void => {
    const newDate = new Date(currentDate);
    if (currentViewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (currentViewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
    onDateChange?.(newDate);
  };

  const handleNext = (): void => {
    const newDate = new Date(currentDate);
    if (currentViewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (currentViewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
    onDateChange?.(newDate);
  };

  const handleToday = (): void => {
    const today = new Date();
    setCurrentDate(today);
    onDateChange?.(today);
  };

  const handleViewModeChange = (mode: CalendarViewMode): void => {
    setCurrentViewMode(mode);
    onViewModeChange?.(mode);
  };

  const handleDayClick = (date: Date): void => {
    setCurrentDate(date);
    onDateChange?.(date);
  };

  // Get events for a specific day
  const getEventsForDay = (date: Date): CalendarEvent[] => {
    return events.filter((event) => eventOccursOnDate(event, date));
  };

  // Format header based on view mode
  const headerText = useMemo(() => {
    if (currentViewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
    }
    if (currentViewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      return `${startOfWeek.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })} - ${endOfWeek.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })}`;
    }
    return currentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  }, [currentDate, currentViewMode]);

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg border border-lark-border p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-lark-border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-lark-border">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-lark-text">{headerText}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevious}
              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Previous"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Next"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <ViewModeButton
            mode="month"
            currentMode={currentViewMode}
            label="Month"
            onClick={handleViewModeChange}
          />
          <ViewModeButton
            mode="week"
            currentMode={currentViewMode}
            label="Week"
            onClick={handleViewModeChange}
          />
          <ViewModeButton
            mode="day"
            currentMode={currentViewMode}
            label="Day"
            onClick={handleViewModeChange}
          />
          <ViewModeButton
            mode="list"
            currentMode={currentViewMode}
            label="List"
            onClick={handleViewModeChange}
          />
        </div>
      </div>

      {/* Calendar grid */}
      {currentViewMode !== 'list' && currentViewMode !== 'day' && (
        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_NAMES.map((name) => (
              <div
                key={name}
                className="text-center text-sm font-medium text-gray-500 py-2"
              >
                {name}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const dayEvents = getEventsForDay(day);
              const dayIsToday = isToday(day);
              const inCurrentMonth = isCurrentMonth(day, currentDate);

              return (
                <div
                  key={index}
                  className={`
                    min-h-24 p-1 border rounded-md cursor-pointer transition-colors
                    ${dayIsToday
                      ? 'bg-lark-primary/10 border-lark-primary'
                      : 'border-gray-200 hover:bg-gray-50'
                    }
                    ${!inCurrentMonth ? 'opacity-50' : ''}
                  `}
                  onClick={() => handleDayClick(day)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleDayClick(day);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={day.toLocaleDateString()}
                >
                  <div className={`
                    text-sm font-medium mb-1
                    ${dayIsToday ? 'text-lark-primary' : 'text-gray-700'}
                  `}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.eventId}
                        className={`
                          text-xs px-1 py-0.5 rounded truncate
                          ${event.status === 'confirmed'
                            ? 'bg-blue-100 text-blue-700'
                            : event.status === 'tentative'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-500 line-through'
                          }
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                        title={event.summary}
                      >
                        {event.summary}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 px-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day view */}
      {currentViewMode === 'day' && (
        <div className="p-4">
          <div className="space-y-3">
            {getEventsForDay(currentDate).length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No events scheduled for this day
              </p>
            ) : (
              getEventsForDay(currentDate).map((event) =>
                onEventClick !== undefined ? (
                  <EventCard
                    key={event.eventId}
                    event={event}
                    onClick={onEventClick}
                  />
                ) : (
                  <EventCard
                    key={event.eventId}
                    event={event}
                  />
                )
              )
            )}
          </div>
        </div>
      )}

      {/* List view */}
      {currentViewMode === 'list' && (
        <div className="p-4">
          <div className="space-y-3">
            {events.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No events to display
              </p>
            ) : (
              events.map((event) =>
                onEventClick !== undefined ? (
                  <EventCard
                    key={event.eventId}
                    event={event}
                    onClick={onEventClick}
                    showDate
                  />
                ) : (
                  <EventCard
                    key={event.eventId}
                    event={event}
                    showDate
                  />
                )
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarView;
