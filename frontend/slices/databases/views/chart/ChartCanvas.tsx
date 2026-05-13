import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList, Label,
} from "recharts";
import type { ChartKind } from "@/shared/types/domain";
import { Empty } from "./parts";

interface DataRow { name: string; value: number; key: string }

interface Props {
  kind: ChartKind;
  data: DataRow[];
  palette: string[];
  showGrid: boolean;
  showLegend: boolean;
  showValues: boolean;
  decimals: number;
  xLabel: string;
  yLabel: string;
  hasXProp: boolean;
}

export function ChartCanvas({
  kind, data, palette, showGrid, showLegend, showValues, decimals, xLabel, yLabel, hasXProp,
}: Props) {
  if (!hasXProp) return <Empty msg="Pick a category property" />;
  if (!data.length) return <Empty msg="No data yet" />;

  if (kind === "pie" || kind === "donut") {
    const inner = kind === "donut" ? 56 : 0;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip />
          {showLegend && <Legend />}
          <Pie data={data} dataKey="value" nameKey="name" outerRadius="75%" innerRadius={inner} label={showValues}>
            {data.map((_, i) => <Cell key={i} fill={palette[i % palette.length]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }
  const Wrapper = kind === "line" ? LineChart : kind === "area" ? AreaChart : BarChart;
  const bottomMargin = xLabel ? 28 : 12;
  const leftMargin = yLabel ? 18 : 0;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <Wrapper data={data} margin={{ top: 12, right: 12, left: leftMargin, bottom: bottomMargin }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-border" />}
        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={data.length > 8 ? -25 : 0} textAnchor={data.length > 8 ? "end" : "middle"} height={data.length > 8 ? 60 : 30}>
          {xLabel && <Label value={xLabel} position="insideBottom" offset={-12} className="fill-muted-foreground" style={{ fontSize: 11 }} />}
        </XAxis>
        <YAxis tick={{ fontSize: 11 }} allowDecimals={decimals > 0}>
          {yLabel && <Label value={yLabel} position="insideLeft" angle={-90} className="fill-muted-foreground" style={{ fontSize: 11, textAnchor: "middle" }} />}
        </YAxis>
        <Tooltip />
        {showLegend && <Legend />}
        {kind === "bar" && (
          <Bar dataKey="value" fill={palette[0]} radius={[4, 4, 0, 0]}>
            {showValues && <LabelList dataKey="value" position="top" style={{ fontSize: 10 }} />}
          </Bar>
        )}
        {kind === "line" && (
          <Line type="monotone" dataKey="value" stroke={palette[0]} strokeWidth={2} dot>
            {showValues && <LabelList dataKey="value" position="top" style={{ fontSize: 10 }} />}
          </Line>
        )}
        {kind === "area" && (
          <Area type="monotone" dataKey="value" stroke={palette[0]} fill={palette[0]} fillOpacity={0.25}>
            {showValues && <LabelList dataKey="value" position="top" style={{ fontSize: 10 }} />}
          </Area>
        )}
      </Wrapper>
    </ResponsiveContainer>
  );
}
