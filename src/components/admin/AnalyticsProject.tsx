import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { trpc } from "@/providers/trpc-client";

export default function AnalyticsProject({
  slug,
  days,
  setDays,
  onBack,
}: {
  slug: string;
  days: number;
  setDays: (days: number) => void;
  onBack: () => void;
}) {
  const query = trpc.analytics.project.useQuery({
    slug,
    from: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(Date.now() - (days - 1) * 86400000)),
  });
  const result = query.data;
  const rate = (value: number | null) =>
    value === null ? "—" : `${(value * 100).toFixed(1)}%`;
  return (
    <section className="admin-section analytics-manager">
      <button type="button" className="admin-secondary" onClick={onBack}>
        ← 返回数据总览
      </button>
      <div className="admin-section-heading">
        <div>
          <p className="meta-label">单案例分析</p>
          <h2>{result?.title || slug}</h2>
          <p>按北京时间统计 · 事件次数与去重访客漏斗</p>
        </div>
        <div className="analytics-ranges" aria-label="统计日期">
          {[7, 30].map(value => (
            <button
              type="button"
              key={value}
              className={days === value ? "admin-primary" : "admin-secondary"}
              aria-pressed={days === value}
              onClick={() => setDays(value)}
            >
              近 {value} 天
            </button>
          ))}
        </div>
      </div>
      {query.isLoading && <p role="status">正在读取案例数据…</p>}
      {query.error && (
        <div className="admin-error">
          数据读取失败，请检查登录状态与日期。
          <button onClick={() => query.refetch()}>重试</button>
        </div>
      )}
      {result && (
        <>
          <div className="analytics-cards">
            {[
              ["独立访客 UV", result.cards.uv],
              ["案例打开", result.cards.caseOpen],
              ["PDF 阅读", result.cards.pdfView],
              ["查看项目演示", result.cards.outboundClick],
            ].map(([label, value]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{Number(value).toLocaleString("zh-CN")}</strong>
                <small>
                  {label === "独立访客 UV"
                    ? "该案例所有相关事件的去重访客"
                    : "区间内事件次数"}
                </small>
              </article>
            ))}
          </div>
          {!result.cards.caseOpen && (
            <div className="analytics-empty">
              <h3>该案例在此期间尚无打开记录</h3>
              <p>可切换日期查看其他时段。</p>
            </div>
          )}
          <div className="analytics-grid">
            <article className="analytics-chart analytics-wide">
              <h3>访客转化漏斗</h3>
              <p>
                同案例、区间内访客逐步取交集；不要求事件先后顺序，不代表严格路径归因。
              </p>
              <ol className="analytics-funnel">
                <li>
                  打开案例 <strong>{result.funnel.caseOpen}</strong> 人
                </li>
                <li>
                  其中阅读 PDF <strong>{result.funnel.pdfView}</strong> 人 ·
                  上一步转化 {rate(result.funnel.pdfRate)}
                </li>
                <li>
                  其中查看演示 <strong>{result.funnel.outboundClick}</strong> 人
                  · 上一步转化 {rate(result.funnel.outboundRate)}
                </li>
              </ol>
            </article>
            <article className="analytics-chart analytics-wide">
              <h3>每日案例趋势</h3>
              <p>事件次数 · 无事件日期补零</p>
              <ResponsiveContainer width="100%" height={290}>
                <AreaChart data={result.series} margin={{ right: 20, top: 15 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#33433e" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={s => s.slice(5)}
                    minTickGap={28}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--ink-850)",
                      border: "1px solid var(--line)",
                      color: "var(--paper)",
                    }}
                  />
                  <Legend />
                  {[
                    ["caseOpen", "案例打开", "#75dcd8"],
                    ["pdfView", "PDF 阅读", "#d5e98b"],
                    ["outboundClick", "查看演示", "#b5a1ef"],
                  ].map(([key, name, color]) => (
                    <Area
                      key={key}
                      isAnimationActive={false}
                      type="monotone"
                      dataKey={key}
                      name={name}
                      stroke={color}
                      fill={color}
                      fillOpacity={0.08}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </article>
            {[
              { title: "来源 Top 10", rows: result.sources },
              { title: "设备", rows: result.devices },
            ].map(({ title, rows }) => (
              <article className="analytics-chart" key={title}>
                <h3>{title}</h3>
                <p>仅该案例相关事件，按事件次数统计</p>
                <ul>
                  {rows.map(row => (
                    <li key={row.label}>
                      {(
                        {
                          mobile: "手机",
                          desktop: "电脑",
                          tablet: "平板",
                        } as Record<string, string>
                      )[row.label] || row.label}
                      ：{row.count}
                    </li>
                  ))}
                </ul>
                {!rows.length && <p>暂无相关事件</p>}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
