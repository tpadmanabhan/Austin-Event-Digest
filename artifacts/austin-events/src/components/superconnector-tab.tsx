import { Trophy, Flame, Zap, Star, Lock, TrendingUp, Medal } from "lucide-react";
import { useGamificationMe, useGamificationLeaderboard } from "@/hooks/use-gamification";
import { useTenant } from "@/contexts/tenant-context";
import { format, parseISO } from "date-fns";

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-6 animate-pulse">
      <div className="h-4 bg-muted rounded w-1/2 mb-3" />
      <div className="h-8 bg-muted rounded w-1/3" />
    </div>
  );
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
}

export function SuperconnectorTab() {
  const tenant = useTenant();
  const { data: me, isLoading: loadingMe } = useGamificationMe();
  const { data: lb, isLoading: loadingLb } = useGamificationLeaderboard();

  const leaderboard = (lb?.leaderboard ?? []).slice(0, 25);

  return (
    <div className="space-y-8">

      {/* ── Stats Header ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingMe ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total XP</p>
              </div>
              <p className="text-3xl font-bold text-foreground">{(me?.totalXP ?? 0).toLocaleString()}</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rank</p>
              </div>
              <p className="text-3xl font-bold text-foreground">
                #{me?.rank ?? "—"}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  of {me?.totalCities ?? "—"}
                </span>
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Flame className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Streak</p>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {me?.streak?.currentStreak ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">weeks</span>
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Star className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Longest Streak</p>
              </div>
              <p className="text-3xl font-bold text-foreground">
                {me?.streak?.longestStreak ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">weeks</span>
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Weekly Challenges ── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Weekly Challenges</h3>
          <span className="ml-auto text-xs text-muted-foreground">Resets every Sunday</span>
        </div>

        {loadingMe ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-2 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : !me?.challenges?.length ? (
          <div className="px-6 py-10 text-center text-muted-foreground text-sm">
            No active challenges this week.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {me.challenges.map((c) => {
              const pct = c.targetValue > 0
                ? Math.min(100, Math.round((c.currentValue / c.targetValue) * 100))
                : 0;
              const completed = c.completedAt != null;
              return (
                <div key={c.id} className="px-6 py-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {c.title}
                        {completed && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold border border-green-200">
                            ✓ Completed
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        +{c.xpReward} XP
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.currentValue} / {c.targetValue}
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${completed ? "bg-green-500" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Badges Grid ── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Medal className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Badges</h3>
          {me?.badges && (
            <span className="ml-auto text-xs text-muted-foreground">
              {me.badges.filter(b => b.earned).length} / {me.badges.length} earned
            </span>
          )}
        </div>

        {loadingMe ? (
          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-border p-4 space-y-2">
                <div className="w-10 h-10 bg-muted rounded-xl mx-auto" />
                <div className="h-3 bg-muted rounded w-3/4 mx-auto" />
              </div>
            ))}
          </div>
        ) : !me?.badges?.length ? (
          <div className="px-6 py-10 text-center text-muted-foreground text-sm">
            No badges available yet.
          </div>
        ) : (
          <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {me.badges.map((badge) => (
              <div
                key={badge.id}
                title={badge.earned && badge.earnedAt
                  ? `Earned ${format(parseISO(badge.earnedAt), "MMM d, yyyy")}`
                  : badge.unlockHint ?? badge.description
                }
                className={`relative rounded-xl border p-4 flex flex-col items-center gap-2 text-center transition-all
                  ${badge.earned
                    ? "border-primary/30 bg-primary/5 shadow-sm"
                    : "border-border bg-muted/30 opacity-60"
                  }`}
              >
                <span className={`text-3xl leading-none ${badge.earned ? "" : "grayscale"}`}>
                  {badge.icon}
                </span>
                <div>
                  <p className={`text-xs font-semibold leading-tight ${badge.earned ? "text-foreground" : "text-muted-foreground"}`}>
                    {badge.name}
                  </p>
                  {!badge.earned && badge.unlockHint && (
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5 leading-tight">
                      {badge.unlockHint}
                    </p>
                  )}
                  {badge.earned && badge.earnedAt && (
                    <p className="text-[10px] text-primary/70 mt-0.5">
                      {format(parseISO(badge.earnedAt), "MMM d")}
                    </p>
                  )}
                </div>
                {!badge.earned && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-3 h-3 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Leaderboard ── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-sm">City Leaderboard</h3>
          {leaderboard.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">Top {leaderboard.length} cities</span>
          )}
        </div>

        {loadingLb ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="h-4 bg-muted rounded flex-1" />
                <div className="h-4 bg-muted rounded w-20" />
              </div>
            ))}
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="px-6 py-10 text-center text-muted-foreground text-sm">
            No leaderboard data yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium w-16">Rank</th>
                  <th className="px-6 py-3 font-medium">City</th>
                  <th className="px-6 py-3 font-medium text-right">XP</th>
                  <th className="px-6 py-3 font-medium text-right">Streak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaderboard.map((entry) => {
                  const isMe = entry.slug === tenant.slug;
                  return (
                    <tr
                      key={entry.tenantId}
                      className={`transition-colors ${isMe
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : "hover:bg-muted/20"
                      }`}
                    >
                      <td className="px-6 py-3">
                        <RankMedal rank={entry.rank} />
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isMe ? "text-primary" : "text-foreground"}`}>
                            {entry.city || entry.name}
                          </span>
                          {isMe && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-foreground">
                        {(entry.totalXP ?? 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-right text-muted-foreground">
                        {entry.currentStreak > 0 ? (
                          <span className="flex items-center justify-end gap-1">
                            <Flame className="w-3 h-3 text-orange-500" />
                            {entry.currentStreak}w
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
