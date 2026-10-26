import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { trpc } from "@/providers/trpc-client";
import "./analytics.css";
const colors = [
  "#75dcd8",
  "#d5e98b",
  "#b5a1ef",
  "#f09abd",
  "#89caa0",
  "#99b6dd",
];
export default function AnalyticsManager() {
  const [days, setDays] = useState(7);
  const data = trpc.analytics.overview.useQuery({
    from: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(Date.now() - (days - 1) * 86400000)),
  });
  const result = data.data;
  return (
    <section className="admin-section analytics-manager">
      <div className="admin-section-heading">
        <div>
          <p className="meta-label">访问与作品表现</p>
          <h2>数据总览</h2>
          <p>按北京时间统计 · 来源与地区按浏览量计数</p>
        </div>
        <div className="analytics-ranges" aria-label="统计日期">
          {[7, 30].map(value => (
            <button
              type="button"
              className={days === value ? "admin-primary" : "admin-secondary"}
              aria-pressed={days === value}
              key={value}
              onClick={() => setDays(value)}
            >
              近 {value} 天
            </button>
          ))}
        </div>
      </div>
      {data.isLoading && <p role="status">正在读取访问数据…</p>}
      {data.error && (
        <div className="admin-error">
          数据读取失败，请检查登录状态与数据库迁移。
          <button onClick={() => data.refetch()}>重试</button>
        </div>
      )}
      {result && (
        <>
          <div className="analytics-cards">
            {[
              ["独立访客 UV", result.cards.uv, "区间内去重的匿名访客"],
              ["浏览量 PV", result.cards.pv, "公开页面浏览次数"],
              ["案例打开", result.cards.caseOpen, "案例弹层与深链打开次数"],
              ["PDF 阅读", result.cards.pdfView, "PDF 内嵌全文加载次数"],
            ].map(([label, value, hint]) => (
              <article key={label}>
                <span>{label}</span>
                <strong>{Number(value).toLocaleString("zh-CN")}</strong>
                <small>{hint}</small>
              </article>
            ))}
          </div>
          {!result.cards.uv ? (
            <div className="analytics-empty">
              <h3>尚无访问数据</h3>
              <p>公开站有访问后将显示。可切换日期查看其他时段。</p>
            </div>
          ) : (
            <div className="analytics-grid">
              <article className="analytics-chart analytics-wide">
                <h3>每日访问趋势</h3>
                <p>独立访客与页面浏览量</p>
                <ResponsiveContainer width="100%" height={290}>
                  <AreaChart
                    data={result.series}
                    margin={{ left: 0, right: 20, top: 15 }}
                  >
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
                      labelStyle={{ color: "var(--paper)" }}
                    />
                    <Legend />
                    <Area
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="pv"
                      name="浏览量 PV"
                      stroke={colors[0]}
                      fill={colors[0]}
                      fillOpacity={0.12}
                    />
                    <Area
                      isAnimationActive={false}
                      type="monotone"
                      dataKey="uv"
                      name="独立访客 UV"
                      stroke={colors[1]}
                      fill={colors[1]}
                      fillOpacity={0.12}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </article>
              <article className="analytics-chart analytics-wide">
                <h3>作品表现 Top 10</h3>
                <p>案例打开与 PDF 阅读次数</p>
                {!result.topProjects.length ? (
                  <p>本时段尚无案例打开</p>
                ) : (
                  <ResponsiveContainer
                    width="100%"
                    height={Math.max(240, result.topProjects.length * 55)}
                  >
                    <BarChart
                      data={result.topProjects}
                      layout="vertical"
                      margin={{ right: 25, left: 10 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#33433e"
                      />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="title"
                        width={150}
                        tick={{ fontSize: 12 }}
                        tickFormatter={s =>
                          s.length > 12 ? s.slice(0, 12) + "…" : s
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--ink-850)",
                          border: "1px solid var(--line)",
                          color: "var(--paper)",
                        }}
                        labelStyle={{ color: "var(--paper)" }}
                      />
                      <Legend />
                      <Bar
                        isAnimationActive={false}
                        dataKey="opens"
                        name="案例打开"
                        fill={colors[0]}
                        radius={[0, 4, 4, 0]}
                      />
                      <Bar
                        isAnimationActive={false}
                        dataKey="pdfs"
                        name="PDF 阅读"
                        fill={colors[1]}
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </article>
              <article className="analytics-chart">
                <h3>访问来源 Top 10</h3>
                <p>优先按 UTM 来源归类，其次外链域名</p>
                {!result.sources.length ? (
                  <p>尚无页面浏览</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        isAnimationActive={false}
                        data={result.sources}
                        dataKey="count"
                        nameKey="label"
                        innerRadius={58}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {result.sources.map((item, i) => (
                          <Cell
                            key={item.label}
                            fill={colors[i % colors.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "var(--ink-850)",
                          border: "1px solid var(--line)",
                          color: "var(--paper)",
                        }}
                        labelStyle={{ color: "var(--paper)" }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </article>
              <article className="analytics-chart">
                <h3>访问地区 Top 10</h3>
                <p>平台提供的国家及省州代码 · 未解析显示未知</p>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    layout="vertical"
                    data={result.regions}
                    margin={{ right: 20 }}
                  >
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={110}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--ink-850)",
                        border: "1px solid var(--line)",
                        color: "var(--paper)",
                      }}
                      labelStyle={{ color: "var(--paper)" }}
                    />
                    <Bar
                      isAnimationActive={false}
                      dataKey="count"
                      name="浏览量 PV"
                      fill={colors[0]}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </article>
            </div>
          )}
        </>
      )}
    </section>
  );
}
