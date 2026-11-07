"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  Factory,
  FileCheck2,
  Gauge,
  Lightbulb,
  Plus,
  RefreshCw,
  Save,
  SearchCheck,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import { api, API_URL } from "@/lib/api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { cn } from "@/lib/utils";

type Defect = {
  id: string;
  reference: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  detectedAt: string;
  line?: { name: string };
  product?: { name: string };
  rootCause?: Rca;
};
type FmeaRow = {
  mode: string;
  effect: string;
  severity: number;
  occurrence: number;
  detection: number;
  rpn: number;
};
type Rca = {
  why1?: string;
  why2?: string;
  why3?: string;
  why4?: string;
  why5?: string;
  verifiedCause?: string;
  fishbone?: Record<string, string[]>;
  pareto?: { categories: { name: string; count: number }[] };
  fmea?: { rows: FmeaRow[] };
  eightD?: Record<string, string>;
  aiSuggestions?: {
    summary: string;
    hypotheses: {
      cause: string;
      confidence: number;
      evidenceToCheck: string[];
    }[];
    recommendedNextSteps: string[];
  };
};
const tabs = ["5 Whys", "Fishbone", "Pareto", "FMEA", "8D"] as const;
const field =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50";

export function RcaWorkspace({ defects }: { defects: Defect[] }) {
  const [selected, setSelected] = useState(defects[0]?.id || "");
  const [record, setRecord] = useState<Defect>();
  const [tab, setTab] = useState<(typeof tabs)[number]>("5 Whys");
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  async function load(id = selected) {
    if (!id) return;
    const x = await api<Defect>(`/rca/defects/${id}`);
    setRecord(x);
    setForm({
      why1: x.rootCause?.why1 || "",
      why2: x.rootCause?.why2 || "",
      why3: x.rootCause?.why3 || "",
      why4: x.rootCause?.why4 || "",
      why5: x.rootCause?.why5 || "",
      verifiedCause: x.rootCause?.verifiedCause || "",
    });
  }
  useEffect(() => {
    if (selected) load(selected);
  }, [selected]);
  async function save() {
    setSaving(true);
    setNotice("");
    try {
      await api(`/rca/defects/${selected}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      await load();
      setNotice("Investigation evidence saved to the RCA record.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to save");
    } finally {
      setSaving(false);
    }
  }
  async function analyze() {
    if (!record) return;
    setAnalyzing(true);
    setNotice("");
    try {
      await api(`/ai/defects/${selected}/analyze`, {
        method: "POST",
        body: JSON.stringify({
          observation: record.description || record.title,
        }),
      });
      await load();
      setNotice(
        "AI hypotheses generated. Engineers must verify them with evidence.",
      );
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "AI provider is not configured",
      );
    } finally {
      setAnalyzing(false);
    }
  }
  const r = record?.rootCause;
  return (
    <>
      <Title
        eyebrow="EVIDENCE-LED INVESTIGATION"
        title="Root cause analysis"
        text="Move from symptom to verified cause using structured quality methods."
        action={
          <select
            className={cn(field, "w-72")}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {defects.map((x) => (
              <option key={x.id} value={x.id}>
                {x.reference} · {x.title}
              </option>
            ))}
          </select>
        }
      />
      {record && (
        <Card className="mb-4 overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 border-l-4 border-red-500 p-5">
            <span className="grid size-11 place-items-center rounded-xl bg-red-50 text-red-600">
              <AlertTriangle size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold tracking-wider text-red-600">
                ACTIVE CASE · {record.reference}
              </span>
              <h2 className="mt-1 text-lg font-bold">{record.title}</h2>
              <p className="text-xs text-slate-500">
                {record.product?.name} · {record.line?.name}
              </p>
            </div>
            <Badge value={record.status} />
          </div>
        </Card>
      )}
      <div className="grid gap-4 xl:grid-cols-[1.55fr_.75fr]">
        <Card className="overflow-hidden">
          <div className="flex overflow-x-auto border-b border-slate-200 px-3">
            {tabs.map((x) => (
              <button
                key={x}
                onClick={() => setTab(x)}
                className={cn(
                  "whitespace-nowrap border-b-2 px-4 py-4 text-xs font-bold",
                  tab === x
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-400",
                )}
              >
                {x}
              </button>
            ))}
          </div>
          <CardContent className="pt-5">
            {tab === "5 Whys" && <FiveWhys form={form} setForm={setForm} />}{" "}
            {tab === "Fishbone" && <Fishbone data={r?.fishbone} />}{" "}
            {tab === "Pareto" && <Pareto data={r?.pareto?.categories || []} />}{" "}
            {tab === "FMEA" && <Fmea rows={r?.fmea?.rows || []} />}{" "}
            {tab === "8D" && <EightD data={r?.eightD} />}
            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
              <p className="text-xs text-emerald-700">{notice}</p>
              {tab === "5 Whys" && (
                <Button onClick={save} disabled={saving}>
                  <Save size={15} />
                  {saving ? "Saving..." : "Save investigation"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="border-0 bg-gradient-to-br from-[#0a1c29] to-[#092d2c] text-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-slate-950">
                  <Sparkles size={18} />
                </span>
                <div>
                  <span className="text-[9px] font-bold tracking-widest text-emerald-300">
                    ROOTIQ ASSIST
                  </span>
                  <h3 className="font-bold">Investigation hypotheses</h3>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-400">
                AI reviews the problem statement and suggests evidence to check.
                It never confirms the root cause.
              </p>
              {r?.aiSuggestions?.hypotheses?.map((x, i) => (
                <div
                  key={i}
                  className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3"
                >
                  <div className="flex justify-between text-[9px] font-bold text-emerald-300">
                    <span>POSSIBLE CAUSE</span>
                    <span>{Math.round(x.confidence * 100)}%</span>
                  </div>
                  <p className="mb-0 mt-2 text-xs leading-5">{x.cause}</p>
                </div>
              ))}
              <Button
                onClick={analyze}
                disabled={analyzing}
                className="mt-4 w-full bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              >
                <Bot size={16} />
                {analyzing
                  ? "Analyzing..."
                  : r?.aiSuggestions
                    ? "Refresh suggestions"
                    : "Generate AI suggestions"}
              </Button>
              <p className="mb-0 mt-3 text-[9px] leading-4 text-slate-500">
                Possible causes only. Verify against machine logs, inspection
                data, and physical evidence.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div>
                <h3 className="font-bold">Investigation progress</h3>
                <p className="mt-1 text-xs text-slate-400">
                  Evidence completion
                </p>
              </div>
              <SearchCheck className="text-emerald-600" size={20} />
            </CardHeader>
            <CardContent>
              <Progress
                label="Problem defined"
                value={record?.description ? 100 : 40}
              />
              <Progress label="Causal chain" value={form.why5 ? 100 : 60} />
              <Progress
                label="Root cause verified"
                value={form.verifiedCause ? 100 : 20}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function FiveWhys({
  form,
  setForm,
}: {
  form: Record<string, string>;
  setForm: (x: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((n) => (
        <label
          key={n}
          className="block rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          <span className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            <i className="grid size-6 place-items-center rounded-full bg-emerald-100 not-italic">
              {n}
            </i>
            {n === 5
              ? "Why did the control system allow recurrence?"
              : `Why ${n}?`}
          </span>
          <textarea
            className="min-h-14 w-full resize-none bg-transparent text-sm outline-none"
            value={form[`why${n}`] || ""}
            onChange={(e) => setForm({ ...form, [`why${n}`]: e.target.value })}
            placeholder="Record the evidence-supported answer..."
          />
        </label>
      ))}
      <label className="block rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <span className="mb-2 block text-[10px] font-bold tracking-wider text-emerald-800">
          VERIFIED ROOT CAUSE
        </span>
        <textarea
          className="min-h-16 w-full resize-none bg-transparent text-sm font-semibold outline-none"
          value={form.verifiedCause || ""}
          onChange={(e) => setForm({ ...form, verifiedCause: e.target.value })}
          placeholder="State the cause only after verification..."
        />
      </label>
    </div>
  );
}
function Fishbone({ data }: { data?: Record<string, string[]> }) {
  const entries = Object.entries(data || {});
  return (
    <div>
      <p className="mb-4 text-xs text-slate-500">
        Ishikawa categories organize possible contributing factors before
        evidence confirms the cause.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map(([k, v]) => (
          <div key={k} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                <Lightbulb size={15} />
              </span>
              <b className="text-sm">{k}</b>
            </div>
            <ul className="mb-0 mt-3 space-y-2 pl-4 text-xs text-slate-600">
              {v.map((x) => (
                <li key={x} className="list-disc">
                  {x}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
function Pareto({ data }: { data: { name: string; count: number }[] }) {
  return (
    <div>
      <p className="mb-4 text-xs text-slate-500">
        Defect contributors ranked by frequency to focus investigation effort.
      </p>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 25 }}>
            <CartesianGrid horizontal={false} stroke="#edf1f3" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 10 }}
            />
            <Tooltip />
            <Bar dataKey="count" radius={[0, 7, 7, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={i === 0 ? "#dc5a55" : "#12a48a"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
function Fmea({ rows }: { rows: FmeaRow[] }) {
  const list = rows || [];
  return (
    <div className="overflow-x-auto">
      <p className="mb-4 text-xs text-slate-500">
        Risk Priority Number = severity × occurrence × detection.
      </p>
      <table className="w-full min-w-[650px] text-left text-xs">
        <thead className="bg-slate-50 text-[9px] uppercase tracking-wider text-slate-500">
          <tr>
            {["Failure mode", "Effect", "S", "O", "D", "RPN"].map((x) => (
              <th key={x} className="p-3">
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {list.map((x, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="p-3 font-bold">{x.mode}</td>
              <td className="p-3">{x.effect}</td>
              <td className="p-3">{x.severity}</td>
              <td className="p-3">{x.occurrence}</td>
              <td className="p-3">{x.detection}</td>
              <td className="p-3">
                <span className="rounded-full bg-red-50 px-2 py-1 font-bold text-red-700">
                  {x.rpn}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function EightD({ data }: { data?: Record<string, string> }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Object.entries(data || {}).map(([k, v], i) => (
        <div key={k} className="rounded-xl border border-slate-200 p-4">
          <span className="text-[10px] font-bold tracking-wider text-emerald-700">
            D{i + 1}
          </span>
          <h4 className="mt-1 text-sm font-bold">
            {
              [
                "Build the team",
                "Define the problem",
                "Containment",
                "Root cause",
                "Corrective action",
                "Implement & validate",
                "Prevent recurrence",
                "Recognize the team",
              ][i]
            }
          </h4>
          <p className="mb-0 mt-2 text-xs leading-5 text-slate-500">{v}</p>
        </div>
      ))}
    </div>
  );
}

export function InspectionsModule({
  rangeQuery,
  refreshKey,
}: {
  rangeQuery: string;
  refreshKey?: number;
}) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    api<any[]>(`/inspections?${rangeQuery}`).then(setRows);
  }, [rangeQuery, refreshKey]);
  const checked = rows.reduce((n, x) => n + x.checked, 0),
    failed = rows.reduce((n, x) => n + x.failed, 0);
  return (
    <>
      <Title
        eyebrow="QUALITY CONTROL"
        title="Inspection hub"
        text="Incoming, in-process, EL, and final quality inspection records."
        action={
          <Button>
            <Plus size={15} />
            New inspection
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric
          label="Inspection records"
          value={String(rows.length)}
          icon={FileCheck2}
        />
        <Metric
          label="Units inspected"
          value={checked.toLocaleString("en-IN")}
          icon={SearchCheck}
        />
        <Metric
          label="Pass rate"
          value={`${checked ? (((checked - failed) / checked) * 100).toFixed(1) : 100}%`}
          icon={CheckCircle2}
        />
      </div>
      <Card className="mt-4 overflow-hidden">
        <DataTable
          headers={[
            "Inspection",
            "Batch",
            "Stage",
            "Line",
            "Result",
            "Checked / Failed",
            "Date & time",
          ]}
          rows={rows.map((x) => [
            <b key="a">{x.title}</b>,
            x.batchNumber || "—",
            x.stage,
            x.line?.name || "—",
            <Badge key="b" value={x.result} />,
            `${x.checked.toLocaleString()} / ${x.failed}`,
            new Date(x.performedAt).toLocaleString(),
          ])}
        />
      </Card>
    </>
  );
}

export function ProductionModule({
  rangeQuery,
  refreshKey,
}: {
  rangeQuery: string;
  refreshKey?: number;
}) {
  const [data, setData] = useState<any>();
  useEffect(() => {
    api(`/operations/production?${rangeQuery}`).then(setData);
  }, [rangeQuery, refreshKey]);
  if (!data) return <Loading />;
  const t = data.totals;
  return (
    <>
      <Title
        eyebrow="PRODUCTION INTELLIGENCE"
        title="Production performance"
        text="Actual output, rejection, downtime, and line yield from production records."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Produced"
          value={t.produced.toLocaleString("en-IN")}
          icon={Factory}
        />
        <Metric
          label="Plan attainment"
          value={`${t.planned ? ((t.produced / t.planned) * 100).toFixed(1) : "0.0"}%`}
          icon={Gauge}
        />
        <Metric
          label="Rejected"
          value={t.rejected.toLocaleString("en-IN")}
          icon={AlertTriangle}
          tone="red"
        />
        <Metric
          label="Downtime"
          value={`${t.downtime} min`}
          icon={Clock3}
          tone="amber"
        />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {data.lines.map((x: any) => (
          <Card key={x.lineId}>
            <CardContent className="p-5">
              <div className="flex justify-between">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400">
                    {x.name.toUpperCase()}
                  </span>
                  <p className="mt-1 text-2xl font-bold">{x.yield}% yield</p>
                </div>
                <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Activity />
                </span>
              </div>
              <Progress
                label={`${x.produced.toLocaleString()} produced · ${x.rejected} rejected`}
                value={x.yield}
              />
              <p className="mt-4 text-xs text-slate-500">
                Recorded downtime: <b>{x.downtime} minutes</b>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="mt-4 overflow-hidden">
        <DataTable
          headers={["Date & time", "Line", "Product", "Shift", "Produced", "Rejected", "Downtime"]}
          rows={data.records.map((x: any) => [
            new Date(x.recordDate).toLocaleString(), x.line?.name || "—", x.product?.name || "—", x.shift,
            x.producedQty.toLocaleString(), x.rejectedQty.toLocaleString(), `${x.downtimeMinutes} min`,
          ])}
        />
      </Card>
    </>
  );
}
export function EquipmentModule() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    api<any[]>("/operations/equipment").then(setRows);
  }, []);
  return (
    <>
      <Title
        eyebrow="ASSET RELIABILITY"
        title="Equipment health"
        text="Link machine condition and maintenance events to quality risk."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((x) => (
          <Card key={x.id}>
            <CardContent className="p-5">
              <div className="flex justify-between">
                <span
                  className={cn(
                    "grid size-11 place-items-center rounded-xl",
                    x.healthScore < 80
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-700",
                  )}
                >
                  <Wrench />
                </span>
                <Badge value={x.status} />
              </div>
              <span className="mt-5 block text-[10px] font-bold tracking-wider text-slate-400">
                {x.code} · {x.type}
              </span>
              <h3 className="mt-1 text-lg font-bold">{x.name}</h3>
              <p className="text-xs text-slate-500">
                {x.line?.name || "Plant utility"}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">Last updated: {new Date(x.updatedAt).toLocaleString()}</p>
              <Progress label="Health score" value={x.healthScore} />
              {x.events?.[0] && (
                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <b className="text-[10px] text-slate-700">
                    LATEST MAINTENANCE
                  </b>
                  <p className="mb-0 mt-1 text-xs leading-5 text-slate-500">
                    {x.events[0].description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
export function ReportsModule({ defects }: { defects: Defect[] }) {
  const [audits, setAudits] = useState<any[]>([]);
  useEffect(() => {
    api<any[]>("/operations/audits").then(setAudits);
  }, []);
  return (
    <>
      <Title
        eyebrow="REPORTING & COMPLIANCE"
        title="Quality reports and audits"
        text="Download investigation reports and monitor ISO or process-audit readiness."
      />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
        <Card>
          <CardHeader>
            <div>
              <h3 className="font-bold">RCA reports</h3>
              <p className="mt-1 text-xs text-slate-400">
                Audit-ready PDF investigations
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {defects.map((x) => (
              <div
                key={x.id}
                className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-600">
                  <ClipboardCheck size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <b className="block truncate text-xs">
                    {x.reference} · {x.title}
                  </b>
                  <small className="text-[10px] text-slate-400">
                    {x.status.replaceAll("_", " ")} · {new Date(x.detectedAt).toLocaleString()}
                  </small>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `${API_URL}/reports/defects/${x.id}.pdf`,
                      "_blank",
                    )
                  }
                >
                  <Download size={14} />
                  PDF
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <h3 className="font-bold">Audit programme</h3>
              <p className="mt-1 text-xs text-slate-400">
                Standards and compliance reviews
              </p>
            </div>
            <ShieldAlert className="text-emerald-700" size={20} />
          </CardHeader>
          <CardContent className="space-y-3">
            {audits.map((x) => (
              <div
                key={x.id}
                className="rounded-xl border border-slate-100 p-4"
              >
                <div className="flex justify-between">
                  <b className="text-xs">{x.title}</b>
                  <Badge value={x.status} />
                </div>
                <p className="mb-0 mt-2 text-[10px] text-slate-500">
                  {x.standard} · {new Date(x.auditDate).toLocaleDateString()} ·{" "}
                  {x.findings} findings {x.score ? `· ${x.score}% score` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Title({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <span className="text-[10px] font-bold tracking-[.17em] text-emerald-700">
          {eyebrow}
        </span>
        <h1 className="mb-1 mt-2 text-2xl font-bold tracking-tight md:text-3xl">
          {title}
        </h1>
        <p className="text-xs text-slate-500 md:text-sm">{text}</p>
      </div>
      {action}
    </div>
  );
}
function Badge({ value }: { value: string }) {
  const bad = ["CRITICAL", "HIGH", "FAILED", "ATTENTION"],
    good = ["PASSED", "COMPLETED", "VERIFIED", "RUNNING"];
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-[9px] font-bold",
        bad.includes(value)
          ? "bg-red-50 text-red-700"
          : good.includes(value)
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-700",
      )}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
function Progress({ label, value }: { label: string; value: number }) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex justify-between text-[10px]">
        <span className="text-slate-500">{label}</span>
        <b>{Math.round(value)}%</b>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}
function Metric({
  label,
  value,
  icon: Icon,
  tone = "emerald",
}: {
  label: string;
  value: string;
  icon: any;
  tone?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">
              {label}
            </span>
            <p className="mb-0 mt-4 text-2xl font-bold">{value}</p>
          </div>
          <span
            className={cn(
              "grid size-10 place-items-center rounded-xl",
              tone === "red"
                ? "bg-red-50 text-red-600"
                : tone === "amber"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-emerald-50 text-emerald-700",
            )}
          >
            <Icon size={18} />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table w-full min-w-[760px]">
        <thead>
          <tr>
            {headers.map((x) => (
              <th key={x}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((x, j) => (
                <td key={j}>{x}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Loading() {
  return (
    <div className="grid min-h-[420px] place-items-center">
      <RefreshCw className="animate-spin text-emerald-600" />
    </div>
  );
}
