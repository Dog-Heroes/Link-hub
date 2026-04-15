"use client";

import { useEffect, useState } from "react";

interface DailyData {
  day: string;
  views: number;
  clicks: number;
}

interface TopLink {
  label: string;
  clicks: number;
}

interface AnalyticsData {
  totalViews: number;
  totalClicks: number;
  viewsChange: number | null;
  clicksChange: number | null;
  dailyData: DailyData[];
  topLinks: TopLink[];
}

function ChangeIndicator({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-gray-400">—</span>;
  const isPositive = value >= 0;
  return (
    <span
      className={`text-xs font-bold ${isPositive ? "text-green-500" : "text-red-500"}`}
    >
      {isPositive ? "+" : ""}
      {value}%
    </span>
  );
}

function formatDay(day: string) {
  const d = new Date(day + "T00:00:00");
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

export default function InsightsChart() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics?days=${days}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [days]);

  if (loading || !data) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-xl" />
      </div>
    );
  }

  const maxVal = Math.max(
    ...data.dailyData.map((d) => Math.max(d.views, d.clicks)),
    1
  );

  const ctr =
    data.totalViews > 0
      ? ((data.totalClicks / data.totalViews) * 100).toFixed(1)
      : "0";

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#002B49]">Insights</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[7, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                days === d
                  ? "bg-white text-[#002B49] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {d}gg
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon="👁"
          label="Views"
          value={data.totalViews.toLocaleString("it-IT")}
          change={data.viewsChange}
        />
        <StatCard
          icon="👆"
          label="Click"
          value={data.totalClicks.toLocaleString("it-IT")}
          change={data.clicksChange}
        />
        <StatCard icon="📊" label="CTR" value={`${ctr}%`} change={null} />
      </div>

      {/* Bar chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-6">
          Attività Link Hub
        </h2>

        {data.dailyData.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">
            Nessun dato nel periodo selezionato.
          </p>
        ) : (
          <>
            <div className="flex items-end gap-1 h-48">
              {data.dailyData.map((d) => (
                <div
                  key={d.day}
                  className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                >
                  {/* Views bar */}
                  <div
                    className="w-full max-w-[24px] bg-[#002B49] rounded-t-sm transition-all"
                    style={{ height: `${(d.views / maxVal) * 100}%`, minHeight: d.views > 0 ? 4 : 0 }}
                    title={`${d.views} views`}
                  />
                  {/* Clicks bar */}
                  <div
                    className="w-full max-w-[24px] bg-[#002B49]/30 rounded-t-sm transition-all"
                    style={{ height: `${(d.clicks / maxVal) * 100}%`, minHeight: d.clicks > 0 ? 4 : 0 }}
                    title={`${d.clicks} clicks`}
                  />
                </div>
              ))}
            </div>

            {/* X axis labels */}
            <div className="flex gap-1 mt-2">
              {data.dailyData.map((d) => (
                <div
                  key={d.day}
                  className="flex-1 text-center text-[10px] text-gray-400"
                >
                  {formatDay(d.day)}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-[#002B49] rounded-sm" />
                <span className="text-xs text-gray-500">Views</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 bg-[#002B49]/30 rounded-sm" />
                <span className="text-xs text-gray-500">Click</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Top links */}
      {data.topLinks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Top Link
          </h2>
          <div className="flex flex-col gap-3">
            {data.topLinks.map((link, i) => {
              const pct =
                data.topLinks[0].clicks > 0
                  ? (link.clicks / data.topLinks[0].clicks) * 100
                  : 0;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 truncate mr-4">
                      {link.label}
                    </span>
                    <span className="text-sm font-bold text-[#002B49] flex-shrink-0">
                      {link.clicks.toLocaleString("it-IT")} click
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#E1251B] rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  change,
}: {
  icon: string;
  label: string;
  value: string;
  change: number | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-lg">{icon}</span>
        <ChangeIndicator value={change} />
      </div>
      <p className="text-3xl font-bold text-[#002B49]">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
