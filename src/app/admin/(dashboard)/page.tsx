import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  let totalClicks = 0;
  let topLinks: { label: string; click_count: number }[] = [];

  try {
    const clicksResult = await db.execute(
      "SELECT COALESCE(SUM(click_count), 0) as total FROM links"
    );
    totalClicks = Number(clicksResult.rows[0]?.total ?? 0);

    const topResult = await db.execute(
      "SELECT label, click_count FROM links WHERE enabled = 1 ORDER BY click_count DESC LIMIT 5"
    );
    topLinks = topResult.rows.map((r) => ({
      label: String(r.label),
      click_count: Number(r.click_count),
    }));
  } catch {
    // DB not yet initialized — show empty state
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#002B49] mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Click totali" value={totalClicks.toLocaleString("it-IT")} />
        <StatCard label="Link attivi" value={String(topLinks.length)} />
        <StatCard label="Oggi" value="—" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
          Top Link
        </h2>
        {topLinks.length === 0 ? (
          <p className="text-sm text-gray-400">
            Nessun dato. Esegui il seed del database per iniziare.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {topLinks.map((link, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{link.label}</span>
                <span className="text-sm font-bold text-[#002B49]">
                  {link.click_count.toLocaleString("it-IT")} click
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-3xl font-bold text-[#002B49] mt-1">{value}</p>
    </div>
  );
}
