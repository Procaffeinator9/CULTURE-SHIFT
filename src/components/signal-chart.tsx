import { useEffect, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CHART } from "@/lib/culture/chart-colors";

type Row = { date: string; signal: number; simulated?: number };

export function SignalChart({
  observed,
  simulated,
  halfMark,
}: {
  observed: { date: string; signal: number }[];
  simulated?: { date: string; signal: number }[] | null;
  halfMark?: number | null;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!observed.length) {
    return <p className="text-sm text-muted">No numeric signals to plot.</p>;
  }
  const simulatedByDate = new Map((simulated ?? []).map((point) => [point.date, point.signal]));
  const data: Row[] = observed.map((point) => ({
    date: point.date.slice(5),
    signal: point.signal,
    simulated: simulatedByDate.get(point.date),
  }));

  if (!ready) return <div className="h-72 bg-panel-2" aria-hidden="true" />;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART.line} vertical={false} />
          <XAxis dataKey="date" stroke={CHART.muted} tick={{ fill: CHART.muted, fontSize: 11 }} />
          <YAxis stroke={CHART.muted} tick={{ fill: CHART.muted, fontSize: 11 }} width={36} />
          <Tooltip
            contentStyle={{ background: CHART.panel, border: `1px solid ${CHART.line}`, color: CHART.fg }}
            labelStyle={{ color: CHART.muted }}
          />
          {halfMark != null ? <ReferenceLine y={halfMark} stroke={CHART.warn} strokeDasharray="3 3" /> : null}
          <Line type="monotone" dataKey="signal" name="Supplied" stroke={CHART.lime} strokeWidth={2} dot={false} />
          {simulated?.length ? (
            <Line
              type="monotone"
              dataKey="simulated"
              name="Simulated"
              stroke={CHART.violet}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
