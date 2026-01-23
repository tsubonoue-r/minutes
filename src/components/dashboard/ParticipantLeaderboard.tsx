'use client';

/**
 * ParticipantLeaderboard component - Top participants display
 * @module components/dashboard/ParticipantLeaderboard
 */

import type { ParticipantStats } from '@/types/dashboard';

/**
 * Props for ParticipantLeaderboard component
 */
interface ParticipantLeaderboardProps {
  /** Participant statistics */
  readonly stats: ParticipantStats;
  /** Optional additional className */
  readonly className?: string;
}

/**
 * ParticipantLeaderboard component
 *
 * Displays top participants ranked by meeting attendance.
 *
 * @example
 * ```tsx
 * <ParticipantLeaderboard
 *   stats={{
 *     totalUnique: 25,
 *     avgPerMeeting: 4.2,
 *     topParticipants: [...]
 *   }}
 * />
 * ```
 */
export function ParticipantLeaderboard({
  stats,
  className = '',
}: ParticipantLeaderboardProps): JSX.Element {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 ${className}`}
    >
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
        参加者ランキング
      </h3>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ユニーク参加者数
          </p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {stats.totalUnique}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            会議あたり平均
          </p>
          <p className="text-xl font-bold text-slate-900 dark:text-white">
            {stats.avgPerMeeting}
          </p>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="space-y-3">
        {stats.topParticipants.length > 0 ? (
          stats.topParticipants.map((participant, index) => (
            <div
              key={participant.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              {/* Rank */}
              <div
                className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                  ${index === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300' : ''}
                  ${index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : ''}
                  ${index > 2 ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400' : ''}
                `}
              >
                {index + 1}
              </div>

              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                {participant.name.charAt(0).toUpperCase()}
              </div>

              {/* Name and stats */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {participant.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {participant.actionItemCount}件のアクション
                </p>
              </div>

              {/* Meeting count */}
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {participant.meetingCount}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  回参加
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <p>参加者データがありません</p>
          </div>
        )}
      </div>
    </div>
  );
}
