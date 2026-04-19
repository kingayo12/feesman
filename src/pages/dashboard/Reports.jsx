import { useEffect, useState, useRef } from "react";
import { getClasses } from "../classes/classService";
import { getAllStudents } from "../students/studentService";
import { useSettings } from "../../hooks/Usesettings";
import { calculateStudentBalance } from "../../hooks/Usestudentbalance";
import {
  HiChartBar,
  HiRefresh,
  HiExclamationCircle,
  HiCheckCircle,
  HiDownload,
  HiLightBulb,
  HiTrendingUp,
  HiAcademicCap,
  HiDocumentText,
  HiStar,
  HiPresentationChartLine,
} from "react-icons/hi";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Title,
  Filler,
} from "chart.js";
import { Bar, Doughnut, Pie, Radar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
  Legend,
  Title,
  Filler,
);

// ─── Skeleton bone ────────────────────────────────────────────────────────
function Bone({ w = "100%", h = 16, r = 6, style = {} }) {
  return <div className='skel-bone' style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// ─── Inline progress bar ──────────────────────────────────────────────────
function InlineBar({ pct }) {
  const col = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{ flex: 1, height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: col,
            borderRadius: 3,
            transition: "width 0.6s ease",
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: col, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

// ─── Small SVG donut (inline only — not Chart.js) ─────────────────────────
function Donut({ pct, size = 56, stroke = 7 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const col = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill='none'
          stroke='#e5e7eb'
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill='none'
          stroke={col}
          strokeWidth={stroke}
          strokeDasharray={`${(pct / 100) * circ} ${circ}`}
          strokeLinecap='round'
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 700,
          color: col,
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ─── Chart.js helpers ─────────────────────────────────────────────────────
const naira = (v) => `NGN ${Number(v).toLocaleString()}`;
const COLORS = [
  "#4f46e5",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#ec4899",
  "#14b8a6",
];

// Chart 1: Grouped bar — Expected / Collected / Outstanding
function ChartGrouped({ data }) {
  return (
    <div style={{ height: 320 }}>
      <Bar
        data={{
          labels: data.map((d) => d.className),
          datasets: [
            {
              label: "Expected",
              data: data.map((d) => d.totalFees),
              backgroundColor: "#c7d2fe",
              borderColor: "#4f46e5",
              borderWidth: 1.5,
              borderRadius: 5,
            },
            {
              label: "Collected",
              data: data.map((d) => d.totalPaid),
              backgroundColor: "#6ee7b7",
              borderColor: "#10b981",
              borderWidth: 1.5,
              borderRadius: 5,
            },
            {
              label: "Outstanding",
              data: data.map((d) => d.outstanding),
              backgroundColor: "#fca5a5",
              borderColor: "#ef4444",
              borderWidth: 1.5,
              borderRadius: 5,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: "Expected vs Collected vs Outstanding by Class (NGN)",
              font: { size: 13, weight: "bold" },
              padding: { bottom: 10 },
            },
            legend: { position: "top", labels: { font: { size: 11 }, padding: 14 } },
            tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${naira(c.parsed.y)}` } },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: {
              grid: { color: "#f3f4f6" },
              ticks: { font: { size: 11 }, callback: (v) => `${(v / 1000).toFixed(0)}k` },
            },
          },
        }}
      />
    </div>
  );
}

// Chart 2: Horizontal bar — collection rate ranked
function ChartRates({ data }) {
  const sorted = [...data].sort((a, b) => b.collectionRate - a.collectionRate);
  const rates = sorted.map((d) => d.collectionRate);
  return (
    <div style={{ height: 320 }}>
      <Bar
        data={{
          labels: sorted.map((d) => d.className),
          datasets: [
            {
              label: "Collection Rate (%)",
              data: rates,
              backgroundColor: rates.map((r) =>
                r >= 80 ? "#6ee7b7" : r >= 50 ? "#fde68a" : "#fca5a5",
              ),
              borderColor: rates.map((r) =>
                r >= 80 ? "#10b981" : r >= 50 ? "#f59e0b" : "#ef4444",
              ),
              borderWidth: 1.5,
              borderRadius: 5,
            },
          ],
        }}
        options={{
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: "Collection Rate Ranking by Class",
              font: { size: 13, weight: "bold" },
              padding: { bottom: 10 },
            },
            legend: { display: false },
            tooltip: { callbacks: { label: (c) => ` ${c.parsed.x}%` } },
          },
          scales: {
            x: {
              min: 0,
              max: 100,
              grid: { color: "#f3f4f6" },
              ticks: { callback: (v) => `${v}%`, font: { size: 11 } },
            },
            y: { grid: { display: false }, ticks: { font: { size: 11 } } },
          },
        }}
      />
    </div>
  );
}

// Chart 3: Doughnut — overall revenue split
function ChartRevenueDoughnut({ grandPaid, grandOutstanding }) {
  return (
    <div style={{ height: 280, display: "flex", justifyContent: "center" }}>
      <Doughnut
        data={{
          labels: ["Collected", "Outstanding"],
          datasets: [
            {
              data: [grandPaid, grandOutstanding],
              backgroundColor: ["#6ee7b7", "#fca5a5"],
              borderColor: ["#10b981", "#ef4444"],
              borderWidth: 2,
              hoverOffset: 8,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: "65%",
          plugins: {
            title: {
              display: true,
              text: "Revenue Split: Collected vs Outstanding",
              font: { size: 13, weight: "bold" },
              padding: { bottom: 10 },
            },
            legend: { position: "bottom", labels: { font: { size: 12 }, padding: 14 } },
            tooltip: { callbacks: { label: (c) => ` ${c.label}: ${naira(c.parsed)}` } },
          },
        }}
      />
    </div>
  );
}

// Chart 4: Pie — student payment status
function ChartStudentPie({ data }) {
  const fullyPaid = data.reduce((s, r) => s + r.fullyPaid, 0);
  const owing = data.reduce((s, r) => s + r.withBalance, 0);
  return (
    <div style={{ height: 280, display: "flex", justifyContent: "center" }}>
      <Pie
        data={{
          labels: ["Fully Paid", "Still Owing"],
          datasets: [
            {
              data: [fullyPaid, owing],
              backgroundColor: ["#a7f3d0", "#fecaca"],
              borderColor: ["#10b981", "#ef4444"],
              borderWidth: 2,
              hoverOffset: 8,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: "Student Payment Status",
              font: { size: 13, weight: "bold" },
              padding: { bottom: 10 },
            },
            legend: { position: "bottom", labels: { font: { size: 12 }, padding: 14 } },
            tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.parsed} students` } },
          },
        }}
      />
    </div>
  );
}

// Chart 5: Stacked bar — paid vs owing students
function ChartStudentStack({ data }) {
  return (
    <div style={{ height: 300 }}>
      <Bar
        data={{
          labels: data.map((d) => d.className),
          datasets: [
            {
              label: "Fully Paid",
              data: data.map((d) => d.fullyPaid),
              backgroundColor: "#6ee7b7",
              borderColor: "#10b981",
              borderWidth: 1,
              borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 },
              stack: "s",
            },
            {
              label: "Still Owing",
              data: data.map((d) => d.withBalance),
              backgroundColor: "#fca5a5",
              borderColor: "#ef4444",
              borderWidth: 1,
              borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
              stack: "s",
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: "Students: Fully Paid vs Still Owing per Class",
              font: { size: 13, weight: "bold" },
              padding: { bottom: 10 },
            },
            legend: { position: "top", labels: { font: { size: 11 }, padding: 14 } },
            tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${c.parsed.y} students` } },
          },
          scales: {
            x: { stacked: true, grid: { display: false }, ticks: { font: { size: 11 } } },
            y: {
              stacked: true,
              grid: { color: "#f3f4f6" },
              ticks: { font: { size: 11 } },
              title: { display: true, text: "Students", font: { size: 11 } },
            },
          },
        }}
      />
    </div>
  );
}

// Chart 6: Radar — multi-metric per class
function ChartRadar({ data }) {
  const classes = data.slice(0, 8);
  const maxStudents = Math.max(...data.map((d) => d.studentCount), 1);
  return (
    <div style={{ height: 360 }}>
      <Radar
        data={{
          labels: [
            "Collection Rate",
            "Students Paid %",
            "Revenue Coverage",
            "Low Outstanding",
            "Class Size Index",
          ],
          datasets: classes.map((cls, i) => ({
            label: cls.className,
            data: [
              cls.collectionRate,
              cls.studentCount > 0 ? Math.round((cls.fullyPaid / cls.studentCount) * 100) : 0,
              cls.totalFees > 0 ? Math.round((cls.totalPaid / cls.totalFees) * 100) : 0,
              cls.totalFees > 0 ? Math.round((1 - cls.outstanding / cls.totalFees) * 100) : 100,
              Math.round((cls.studentCount / maxStudents) * 100),
            ],
            backgroundColor: COLORS[i % COLORS.length] + "26",
            borderColor: COLORS[i % COLORS.length],
            borderWidth: 2,
            pointBackgroundColor: COLORS[i % COLORS.length],
            pointRadius: 3,
          })),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: "Multi-Metric Class Performance Radar",
              font: { size: 13, weight: "bold" },
              padding: { bottom: 10 },
            },
            legend: {
              position: "right",
              labels: { font: { size: 11 }, boxWidth: 12, padding: 10 },
            },
            tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${c.parsed.r}%` } },
          },
          scales: {
            r: {
              min: 0,
              max: 100,
              ticks: { stepSize: 25, font: { size: 10 }, callback: (v) => `${v}%` },
              grid: { color: "#e5e7eb" },
              pointLabels: { font: { size: 11 } },
            },
          },
        }}
      />
    </div>
  );
}

// ─── Advisory generator ───────────────────────────────────────────────────
function generateInsights({
  reportData,
  grandFees,
  grandPaid,
  grandOutstanding,
  overallRate,
  selectedTerm,
  session,
}) {
  const insights = [];
  const topClass = [...reportData].sort((a, b) => b.collectionRate - a.collectionRate)[0];
  const bottomClass = [...reportData].sort((a, b) => a.collectionRate - b.collectionRate)[0];
  const criticalClasses = reportData.filter((r) => r.collectionRate < 50);
  const excellentClasses = reportData.filter((r) => r.collectionRate >= 80);
  const totalStudents = reportData.reduce((s, r) => s + r.studentCount, 0);
  const totalOwing = reportData.reduce((s, r) => s + r.withBalance, 0);
  const owingPct = totalStudents > 0 ? Math.round((totalOwing / totalStudents) * 100) : 0;

  if (overallRate >= 80) {
    insights.push({
      type: "success",
      icon: "🎉",
      title: "Outstanding Collection Performance",
      body: `The school has achieved a ${overallRate}% collection rate for ${selectedTerm}. With NGN ${grandPaid.toLocaleString()} collected of NGN ${grandFees.toLocaleString()} expected, the school's financial health is strong. Maintain momentum by keeping payment reminders active for the remaining ${100 - overallRate}%.`,
    });
  } else if (overallRate >= 50) {
    insights.push({
      type: "warning",
      icon: "⚠️",
      title: "Moderate Collection — Action Needed",
      body: `The school has collected ${overallRate}% of expected fees (NGN ${grandPaid.toLocaleString()} of NGN ${grandFees.toLocaleString()}). NGN ${grandOutstanding.toLocaleString()} remains outstanding. Immediate and targeted follow-up with owing families is recommended before term end.`,
    });
  } else {
    insights.push({
      type: "danger",
      icon: "🚨",
      title: "Critical: Low Collection Rate",
      body: `Only ${overallRate}% of expected fees have been collected. The outstanding balance of NGN ${grandOutstanding.toLocaleString()} is a significant operational risk. An emergency meeting with management and class teachers is strongly advised.`,
    });
  }
  if (topClass)
    insights.push({
      type: "success",
      icon: "🏆",
      title: `Best Performing Class: ${topClass.className}`,
      body: `${topClass.className} leads with a ${topClass.collectionRate}% collection rate — NGN ${topClass.totalPaid.toLocaleString()} of NGN ${topClass.totalFees.toLocaleString()} collected. Identify and replicate the practices that drove this result (early reminders, parent engagement, payment plans) across all classes.`,
    });
  if (bottomClass && bottomClass.collectionRate < 70)
    insights.push({
      type: "danger",
      icon: "📉",
      title: `Urgent Attention: ${bottomClass.className}`,
      body: `${bottomClass.className} has the lowest rate at ${bottomClass.collectionRate}% — NGN ${bottomClass.outstanding.toLocaleString()} outstanding from ${bottomClass.withBalance} student(s). The class teacher should brief management immediately, contact families personally, and arrange flexible installment plans where needed.`,
    });
  if (criticalClasses.length > 0)
    insights.push({
      type: "danger",
      icon: "🔴",
      title: `${criticalClasses.length} Class(es) Below 50% Collection`,
      body: `Classes below 50%: ${criticalClasses.map((c) => c.className).join(", ")}. These classes hold a disproportionate share of outstanding balance. Prioritise outreach immediately — written notices home, phone calls, and escalation of unresponsive cases to management.`,
    });
  if (excellentClasses.length > 0)
    insights.push({
      type: "success",
      icon: "✅",
      title: `${excellentClasses.length} Class(es) at 80%+ Collection`,
      body: `${excellentClasses.map((c) => c.className).join(", ")} ${excellentClasses.length === 1 ? "has" : "have"} achieved 80%+ collection. Light follow-up only is needed. Consider recognising these classes publicly to build a school-wide culture of timely payment.`,
    });
  insights.push({
    type: "info",
    icon: "👥",
    title: `${totalOwing} of ${totalStudents} Students Still Have Outstanding Balances (${owingPct}%)`,
    body: `${owingPct}% of enrolled students owe fees this term. If this figure remains high near term-end, the school should consider restricting end-of-term reports for unpaid students (where policy allows), engaging the PTA, and sending formal demand notices.`,
  });
  if (grandOutstanding > 0 && grandPaid > 0) {
    insights.push({
      type: "info",
      icon: "📅",
      title: "Recovery Pace Advisory",
      body: `To recover the outstanding NGN ${grandOutstanding.toLocaleString()} before term closes, the school must collect approximately NGN ${Math.round(grandOutstanding / 4).toLocaleString()} per week over the next four weeks. Intensify payment follow-up immediately to meet this target.`,
    });
  }
  insights.push({
    type: "info",
    icon: "📋",
    title: "Recommended Next Steps for Management",
    body: `1. Send personalised payment reminders to all ${totalOwing} families with outstanding balances this week.\n2. Set a school-wide target of 90% collection before end of ${selectedTerm}.\n3. Arrange payment plan meetings for families flagging financial difficulty.\n4. Publicly recognise high-performing classes to reinforce timely payment culture.\n5. Review fee structure if a large proportion of families consistently struggle — consider default installment plans for next ${session} session.\n6. Ensure the bursar produces weekly collection status updates for the Head Teacher.`,
  });

  return insights;
}

// ─── DOCX download (client-side via docx npm package) ─────────────────────
async function downloadDOCX({
  reportData,
  grandFees,
  grandPaid,
  grandOutstanding,
  overallRate,
  selectedTerm,
  session,
  insights,
}) {
  // Dynamically import docx (must be installed: npm install docx)
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    AlignmentType,
    HeadingLevel,
    WidthType,
    BorderStyle,
    ShadingType,
    LevelFormat,
    PageNumber,
    Footer,
    PageBreak,
  } = await import("docx");

  const now = new Date().toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const totalStudents = reportData.reduce((s, r) => s + r.studentCount, 0);
  const totalOwing = reportData.reduce((s, r) => s + r.withBalance, 0);
  const totalFullyPaid = reportData.reduce((s, r) => s + r.fullyPaid, 0);
  const statusLabel =
    overallRate >= 80
      ? "EXCELLENT"
      : overallRate >= 50
        ? "SATISFACTORY"
        : "CRITICAL — REQUIRES IMMEDIATE ACTION";

  const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cellW = (n) => ({ size: n, type: WidthType.DXA });

  const headerRow = (labels, colWidths) =>
    new TableRow({
      tableHeader: true,
      children: labels.map(
        (label, i) =>
          new TableCell({
            borders,
            width: cellW(colWidths[i]),
            shading: { fill: "1E40AF", type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: label, bold: true, color: "FFFFFF", size: 20 })],
              }),
            ],
          }),
      ),
    });

  const dataRow = (values, colWidths, shade = false) =>
    new TableRow({
      children: values.map(
        (val, i) =>
          new TableCell({
            borders,
            width: cellW(colWidths[i]),
            shading: shade ? { fill: "F0F4FF", type: ShadingType.CLEAR } : undefined,
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: i > 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
                children: [new TextRun({ text: String(val), size: 20 })],
              }),
            ],
          }),
      ),
    });

  const h1 = (text) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text, bold: true, size: 32, color: "1E3A8A" })],
    });
  const h2 = (text) =>
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text, bold: true, size: 26, color: "1E40AF" })],
    });
  const body = (text, opts = {}) =>
    new Paragraph({
      children: [new TextRun({ text, size: 22, ...opts })],
      spacing: { after: 120 },
    });
  const spacer = () => new Paragraph({ children: [], spacing: { after: 200 } });
  const divider = () =>
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1E40AF", space: 1 } },
      children: [],
      spacing: { after: 200 },
    });

  // Summary table
  const colW5 = [1600, 1600, 1600, 1600, 1560];
  const summaryTable = new Table({
    width: { size: 7960, type: WidthType.DXA },
    columnWidths: colW5,
    rows: [
      headerRow(
        ["Metric", "Expected (NGN)", "Collected (NGN)", "Outstanding (NGN)", "Rate"],
        colW5,
      ),
      dataRow(
        [
          "All Classes",
          grandFees.toLocaleString(),
          grandPaid.toLocaleString(),
          grandOutstanding.toLocaleString(),
          `${overallRate}%`,
        ],
        colW5,
      ),
      dataRow(
        [
          "Total Students",
          totalStudents,
          `Fully Paid: ${totalFullyPaid}`,
          `Still Owing: ${totalOwing}`,
          statusLabel,
        ],
        colW5,
        true,
      ),
    ],
  });

  // Class breakdown table
  const colW8 = [1200, 900, 1100, 1100, 1200, 700, 700, 1060];
  const classRows = reportData.map((row, idx) =>
    dataRow(
      [
        row.className,
        row.studentCount,
        row.totalFees.toLocaleString(),
        row.totalPaid.toLocaleString(),
        row.outstanding.toLocaleString(),
        `${row.collectionRate}%`,
        row.fullyPaid,
        row.withBalance,
      ],
      colW8,
      idx % 2 === 1,
    ),
  );
  const classTable = new Table({
    width: { size: 7960, type: WidthType.DXA },
    columnWidths: colW8,
    rows: [
      headerRow(
        ["Class", "Students", "Expected", "Collected", "Outstanding", "Rate", "Paid", "Owing"],
        colW8,
      ),
      ...classRows,
    ],
  });

  // Advisory paragraphs
  const advisoryBlocks = insights.flatMap((ins, i) => [
    new Paragraph({
      children: [
        new TextRun({ text: `${i + 1}. ${ins.title}`, bold: true, size: 22, color: "1E3A8A" }),
      ],
      spacing: { before: 200, after: 80 },
    }),
    ...ins.body.split("\n").map((line) => body(line.trim())),
  ]);

  const doc = new Document({
    numbering: { config: [] },
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, font: "Arial", color: "1E3A8A" },
          paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, font: "Arial", color: "1E40AF" },
          paragraph: { spacing: { before: 200, after: 160 }, outlineLevel: 1 },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${session} — ${selectedTerm} Fees Collection Report  |  Generated ${now}  |  Page `,
                    size: 18,
                    color: "6B7280",
                  }),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "6B7280" }),
                  new TextRun({ text: " of ", size: 18, color: "6B7280" }),
                  new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: "6B7280" }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Cover
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 720, after: 240 },
            children: [
              new TextRun({
                text: "SCHOOL FEES COLLECTION REPORT",
                bold: true,
                size: 52,
                color: "1E3A8A",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [
              new TextRun({ text: `${session}  —  ${selectedTerm}`, size: 30, color: "3B82F6" }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 160 },
            children: [new TextRun({ text: `Generated: ${now}`, size: 22, color: "6B7280" })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: `Collection Status: ${statusLabel}`,
                bold: true,
                size: 26,
                color: overallRate >= 80 ? "059669" : overallRate >= 50 ? "D97706" : "DC2626",
              }),
            ],
          }),
          divider(),

          // Executive Summary
          h1("Executive Summary"),
          summaryTable,
          spacer(),
          body(
            `Overall collection rate stands at ${overallRate}%. The school has collected NGN ${grandPaid.toLocaleString()} of the NGN ${grandFees.toLocaleString()} expected for ${selectedTerm}. ${totalOwing} of ${totalStudents} enrolled students still have outstanding balances totalling NGN ${grandOutstanding.toLocaleString()}.`,
          ),
          spacer(),

          // Class Breakdown
          new Paragraph({ children: [new PageBreak()] }),
          h1("Class-by-Class Breakdown"),
          classTable,
          spacer(),

          // Advisory
          new Paragraph({ children: [new PageBreak()] }),
          h1("Management Advisory & Recommendations"),
          body(
            "The following observations and recommendations are based on current collection data. They are intended for school management and should be actioned promptly.",
            { color: "4B5563" },
          ),
          spacer(),
          ...advisoryBlocks,
          spacer(),
          divider(),
          body(
            "This report was automatically generated by the School Management System. For queries, contact the school bursary or accounts office.",
            { color: "9CA3AF", italics: true },
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `fees_report_${session}_${selectedTerm}.docx`.replace(/[\s/]/g, "_");
  a.click();
}

// ─── PDF download (client-side via jsPDF + autoTable) ─────────────────────
async function downloadPDF({
  reportData,
  grandFees,
  grandPaid,
  grandOutstanding,
  overallRate,
  selectedTerm,
  session,
  insights,
}) {
  const { default: jsPDF } = await import("jspdf");
  await import("jspdf-autotable");

  const now = new Date().toLocaleDateString("en-NG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const totalStudents = reportData.reduce((s, r) => s + r.studentCount, 0);
  const totalOwing = reportData.reduce((s, r) => s + r.withBalance, 0);
  const totalFullyPaid = reportData.reduce((s, r) => s + r.fullyPaid, 0);
  const statusLabel =
    overallRate >= 80 ? "EXCELLENT" : overallRate >= 50 ? "SATISFACTORY" : "CRITICAL";
  const statusColor =
    overallRate >= 80 ? [5, 150, 105] : overallRate >= 50 ? [217, 119, 6] : [220, 38, 38];

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  let y = 0;

  const addPage = () => {
    doc.addPage();
    y = 20;
  };
  const checkY = (needed = 20) => {
    if (y + needed > ph - 20) addPage();
  };

  const addFooter = () => {
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `${session} — ${selectedTerm} | Generated: ${now} | Page ${i} of ${pages}`,
        pw / 2,
        ph - 8,
        { align: "center" },
      );
    }
  };

  // ── Cover page ──
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pw, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont(undefined, "bold");
  doc.text("SCHOOL FEES COLLECTION REPORT", pw / 2, 25, { align: "center" });
  doc.setFontSize(13);
  doc.setFont(undefined, "normal");
  doc.text(`${session}  —  ${selectedTerm}`, pw / 2, 37, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Generated: ${now}`, pw / 2, 47, { align: "center" });

  // Status badge
  doc.setFillColor(...statusColor);
  doc.roundedRect(pw / 2 - 45, 55, 90, 12, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text(`Collection Status: ${statusLabel}`, pw / 2, 63, { align: "center" });

  y = 80;

  // ── Summary section ──
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text("Executive Summary", 14, y);
  y += 8;

  doc.autoTable({
    startY: y,
    head: [["Metric", "Value"]],
    body: [
      ["Academic Session", session],
      ["Term", selectedTerm],
      ["Total Expected Revenue", `NGN ${grandFees.toLocaleString()}`],
      ["Total Collected", `NGN ${grandPaid.toLocaleString()}`],
      ["Total Outstanding", `NGN ${grandOutstanding.toLocaleString()}`],
      ["Overall Collection Rate", `${overallRate}%`],
      ["Total Students Enrolled", totalStudents],
      ["Fully Paid Students", `${totalFullyPaid}`],
      ["Students Still Owing", `${totalOwing}`],
    ],
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold", fontSize: 10 },
    alternateRowStyles: { fillColor: [240, 244, 255] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 }, 1: { cellWidth: 95 } },
    styles: { fontSize: 10, cellPadding: 4 },
    margin: { left: 14, right: 14 },
    theme: "grid",
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Class breakdown ──
  checkY(40);
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text("Class-by-Class Breakdown", 14, y);
  y += 6;

  doc.autoTable({
    startY: y,
    head: [
      [
        "Class",
        "Students",
        "Expected (NGN)",
        "Collected (NGN)",
        "Outstanding (NGN)",
        "Rate",
        "Paid",
        "Owing",
      ],
    ],
    body: reportData.map((row) => [
      row.className,
      row.studentCount,
      row.totalFees.toLocaleString(),
      row.totalPaid.toLocaleString(),
      row.outstanding.toLocaleString(),
      `${row.collectionRate}%`,
      row.fullyPaid,
      row.withBalance,
    ]),
    foot: [
      [
        "TOTAL",
        totalStudents,
        grandFees.toLocaleString(),
        grandPaid.toLocaleString(),
        grandOutstanding.toLocaleString(),
        `${overallRate}%`,
        totalFullyPaid,
        totalOwing,
      ],
    ],
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold", fontSize: 9 },
    footStyles: {
      fillColor: [243, 244, 246],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      fontSize: 9,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "center" },
      6: { halign: "center" },
      7: { halign: "center" },
    },
    didDrawCell: (data) => {
      // Color-code the rate column
      if (data.column.index === 5 && data.section === "body") {
        const rate = reportData[data.row.index]?.collectionRate ?? 0;
        const col = rate >= 80 ? [209, 250, 229] : rate >= 50 ? [254, 243, 199] : [254, 226, 226];
        doc.setFillColor(...col);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F");
        doc.setTextColor(0);
        doc.setFontSize(9);
        doc.text(
          `${rate}%`,
          data.cell.x + data.cell.width / 2,
          data.cell.y + data.cell.height / 2 + 1,
          { align: "center" },
        );
      }
    },
    margin: { left: 14, right: 14 },
    theme: "grid",
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── Advisory ──
  addPage();
  doc.setTextColor(30, 58, 138);
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text("Management Advisory & Recommendations", 14, y);
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(75, 85, 99);
  doc.setFont(undefined, "normal");
  doc.text(
    "The following observations and recommendations are based on current collection data.",
    14,
    y,
  );
  y += 8;

  for (const [i, ins] of insights.entries()) {
    checkY(30);
    const bgCol =
      ins.type === "success"
        ? [240, 253, 244]
        : ins.type === "warning"
          ? [255, 251, 235]
          : ins.type === "danger"
            ? [255, 241, 242]
            : [239, 246, 255];
    const bdCol =
      ins.type === "success"
        ? [187, 247, 208]
        : ins.type === "warning"
          ? [253, 230, 138]
          : ins.type === "danger"
            ? [254, 205, 211]
            : [191, 219, 254];

    const lines = doc.splitTextToSize(`${ins.body}`, pw - 40);
    const blockH = 6 + lines.length * 4.5 + 6;
    checkY(blockH);

    doc.setFillColor(...bgCol);
    doc.setDrawColor(...bdCol);
    doc.roundedRect(14, y, pw - 28, blockH, 2, 2, "FD");

    doc.setTextColor(30, 58, 138);
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text(`${i + 1}. ${ins.title}`, 20, y + 6);

    doc.setTextColor(55, 65, 81);
    doc.setFontSize(8.5);
    doc.setFont(undefined, "normal");
    doc.text(lines, 20, y + 12);
    y += blockH + 4;
  }

  // Footer on all pages
  addFooter();
  doc.save(`fees_report_${session}_${selectedTerm}.pdf`.replace(/[\s/]/g, "_"));
}

// ─── Multi-sheet XLSX download (SheetJS) ──────────────────────────────────
async function downloadXLSX({
  reportData,
  grandFees,
  grandPaid,
  grandOutstanding,
  overallRate,
  selectedTerm,
  session,
}) {
  const XLSX = await import("xlsx");

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Summary (All Classes) ──
  const summaryRows = [
    [`SCHOOL FEES COLLECTION REPORT — ${session} — ${selectedTerm}`],
    [],
    ["OVERALL SUMMARY"],
    ["Total Expected Revenue (NGN)", grandFees],
    ["Total Collected (NGN)", grandPaid],
    ["Total Outstanding (NGN)", grandOutstanding],
    ["Overall Collection Rate (%)", overallRate],
    ["Total Students", reportData.reduce((s, r) => s + r.studentCount, 0)],
    ["Fully Paid Students", reportData.reduce((s, r) => s + r.fullyPaid, 0)],
    ["Students Still Owing", reportData.reduce((s, r) => s + r.withBalance, 0)],
    [],
    ["CLASS BREAKDOWN"],
    [
      "Class",
      "Students",
      "Expected (NGN)",
      "Collected (NGN)",
      "Outstanding (NGN)",
      "Collection Rate (%)",
      "Fully Paid",
      "Still Owing",
    ],
    ...reportData.map((r) => [
      r.className,
      r.studentCount,
      r.totalFees,
      r.totalPaid,
      r.outstanding,
      r.collectionRate,
      r.fullyPaid,
      r.withBalance,
    ]),
    [],
    [
      "TOTALS",
      reportData.reduce((s, r) => s + r.studentCount, 0),
      grandFees,
      grandPaid,
      grandOutstanding,
      overallRate,
      reportData.reduce((s, r) => s + r.fullyPaid, 0),
      reportData.reduce((s, r) => s + r.withBalance, 0),
    ],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [
    { wch: 35 },
    { wch: 12 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, summarySheet, "All Classes");

  // ── One sheet per class ──
  for (const row of reportData) {
    const sheetRows = [
      [`CLASS REPORT: ${row.className}`],
      [`Session: ${session}   |   Term: ${selectedTerm}`],
      [],
      ["Metric", "Value"],
      ["Total Students", row.studentCount],
      ["Fully Paid Students", row.fullyPaid],
      ["Students Still Owing", row.withBalance],
      ["Expected Fees (NGN)", row.totalFees],
      ["Collected (NGN)", row.totalPaid],
      ["Outstanding (NGN)", row.outstanding],
      ["Collection Rate (%)", row.collectionRate],
      [],
      [
        "Performance Status",
        row.collectionRate >= 80
          ? "EXCELLENT"
          : row.collectionRate >= 50
            ? "SATISFACTORY"
            : "CRITICAL",
      ],
      [
        "Action Required",
        row.withBalance > 0
          ? `Yes — contact ${row.withBalance} family/families immediately`
          : "No — all students have paid",
      ],
    ];
    const classSheet = XLSX.utils.aoa_to_sheet(sheetRows);
    classSheet["!cols"] = [{ wch: 30 }, { wch: 30 }];
    // Sanitise sheet name — Excel limits to 31 chars, no special chars
    const safeName = row.className.replace(/[:/\\?*[\]]/g, "").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, classSheet, safeName);
  }

  XLSX.writeFile(wb, `fees_data_${session}_${selectedTerm}.xlsx`.replace(/[\s/]/g, "_"));
}

// ─── Milestone tracker ────────────────────────────────────────────────────
function MilestoneTracker({ rate }) {
  const milestones = [
    { pct: 25, label: "Quarter", icon: "🌱" },
    { pct: 50, label: "Halfway", icon: "⚡" },
    { pct: 75, label: "¾ Way", icon: "🔥" },
    { pct: 90, label: "Near Full", icon: "🎯" },
    { pct: 100, label: "Complete", icon: "🏆" },
  ];
  const col = rate >= 80 ? "#10b981" : rate >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ padding: "0.75rem 0 1.25rem" }}>
      <div
        style={{
          height: 4,
          background: "#e5e7eb",
          borderRadius: 2,
          position: "relative",
          marginBottom: "1.75rem",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(rate, 100)}%`,
            background: col,
            borderRadius: 2,
            transition: "width 1s ease",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${Math.min(rate, 100)}%`,
            top: "50%",
            transform: "translate(-50%,-50%)",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: col,
            border: "2px solid white",
            boxShadow: `0 0 0 3px ${col}44`,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {milestones.map((m) => {
          const reached = rate >= m.pct;
          return (
            <div
              key={m.pct}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                opacity: reached ? 1 : 0.38,
              }}
            >
              <span style={{ fontSize: 18 }}>{m.icon}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: reached ? "#111827" : "#9ca3af",
                  textAlign: "center",
                }}
              >
                {m.label}
              </span>
              <span style={{ fontSize: 10, color: "#6b7280" }}>{m.pct}%</span>
              {reached && <span style={{ fontSize: 9, color: "#10b981", fontWeight: 700 }}>✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Insight card ─────────────────────────────────────────────────────────
function InsightCard({ insight }) {
  const colors = {
    success: { bg: "#f0fdf4", border: "#bbf7d0", title: "#15803d" },
    warning: { bg: "#fffbeb", border: "#fde68a", title: "#b45309" },
    danger: { bg: "#fff1f2", border: "#fecdd3", title: "#be123c" },
    info: { bg: "#eff6ff", border: "#bfdbfe", title: "#1d4ed8" },
  };
  const c = colors[insight.type] || colors.info;
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        padding: "1rem 1.25rem",
        marginBottom: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
        <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{insight.icon}</span>
        <div>
          <p style={{ margin: "0 0 0.4rem", fontWeight: 700, fontSize: 14, color: c.title }}>
            {insight.title}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#374151",
              lineHeight: 1.7,
              whiteSpace: "pre-line",
            }}
          >
            {insight.body}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────
export default function Reports() {
  const { settings, loading: settingsLoading } = useSettings();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [activeTab, setActiveTab] = useState("overview");
  const [downloading, setDownloading] = useState(null); // "docx" | "pdf" | "xlsx" | null

  useEffect(() => {
    if (settings.currentTerm && !selectedTerm) setSelectedTerm(settings.currentTerm);
  }, [settings.currentTerm]);

  useEffect(() => {
    if (!settings.academicYear || !selectedTerm) return;
    generateReport();
  }, [settings.academicYear, selectedTerm]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const [classData, allStudents] = await Promise.all([getClasses(), getAllStudents()]);
      const classReports = await Promise.all(
        classData.map(async (cls) => {
          const classStudents = allStudents.filter((s) => s.classId === cls.id);
          if (!classStudents.length) return null;
          const balances = await Promise.all(
            classStudents.map((s) =>
              calculateStudentBalance(s.id, s.classId, settings.academicYear, selectedTerm),
            ),
          );
          const totalFees = balances.reduce((s, b) => s + b.totalFees, 0);
          const totalPaid = balances.reduce((s, b) => s + b.totalPaid, 0);
          const outstanding = totalFees - totalPaid;
          const fullyPaid = balances.filter((b) => b.balance <= 0).length;
          const withBalance = balances.filter((b) => b.balance > 0).length;
          const collectionRate = totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0;
          return {
            classId: cls.id,
            className: cls.name,
            studentCount: classStudents.length,
            totalFees,
            totalPaid,
            outstanding,
            fullyPaid,
            withBalance,
            collectionRate,
          };
        }),
      );
      setReportData(classReports.filter(Boolean));
    } catch (err) {
      console.error("Report generation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const grandFees = reportData.reduce((s, r) => s + r.totalFees, 0);
  const grandPaid = reportData.reduce((s, r) => s + r.totalPaid, 0);
  const grandOutstanding = grandFees - grandPaid;
  const overallRate = grandFees > 0 ? Math.round((grandPaid / grandFees) * 100) : 0;
  const totalStudents = reportData.reduce((s, r) => s + r.studentCount, 0);
  const totalOwing = reportData.reduce((s, r) => s + r.withBalance, 0);
  const totalFullyPaid = reportData.reduce((s, r) => s + r.fullyPaid, 0);

  const insights =
    reportData.length > 0
      ? generateInsights({
          reportData,
          grandFees,
          grandPaid,
          grandOutstanding,
          overallRate,
          selectedTerm,
          session: settings.academicYear,
        })
      : [];

  const downloadArgs = {
    reportData,
    grandFees,
    grandPaid,
    grandOutstanding,
    overallRate,
    selectedTerm,
    session: settings.academicYear,
    insights,
  };

  const handleDownload = async (type) => {
    setDownloading(type);
    try {
      if (type === "docx") await downloadDOCX(downloadArgs);
      else if (type === "pdf") await downloadPDF(downloadArgs);
      else if (type === "xlsx") await downloadXLSX(downloadArgs);
    } catch (err) {
      console.error(`${type} export failed:`, err);
      alert(
        `Failed to generate ${type.toUpperCase()} — ensure the required npm packages are installed:\n• docx\n• jspdf\n• jspdf-autotable\n• xlsx`,
      );
    } finally {
      setDownloading(null);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: <HiChartBar /> },
    { id: "charts", label: "Charts", icon: <HiPresentationChartLine /> },
    { id: "class", label: "By Class", icon: <HiAcademicCap /> },
    { id: "insights", label: "Advisory", icon: <HiLightBulb /> },
    { id: "download", label: "Download", icon: <HiDocumentText /> },
  ];

  if (settingsLoading)
    return (
      <div className='student-list-container'>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className='finance-card'>
              <Bone h={60} />
            </div>
          ))}
        </div>
        <Bone h={300} r={12} />
      </div>
    );

  return (
    <div className='student-list-container'>
      {/* Header */}
      <div className='list-page-header'>
        <div className='header-title'>
          <HiChartBar className='main-icon' />
          <div>
            <h2>Fees Collection Reports</h2>
            <p>
              {settings.academicYear} — {selectedTerm}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <button className='filter-btn' onClick={generateReport} disabled={loading}>
            <HiRefresh /> Refresh
          </button>
          {reportData.length > 0 && (
            <>
              <button
                className='filter-btn'
                disabled={!!downloading}
                onClick={() => handleDownload("pdf")}
              >
                {downloading === "pdf" ? (
                  "Generating…"
                ) : (
                  <>
                    <HiDownload /> PDF
                  </>
                )}
              </button>
              <button
                className='filter-btn'
                disabled={!!downloading}
                onClick={() => handleDownload("docx")}
              >
                {downloading === "docx" ? (
                  "Generating…"
                ) : (
                  <>
                    <HiDocumentText /> Word
                  </>
                )}
              </button>
              <button
                className='filter-btn'
                disabled={!!downloading}
                onClick={() => handleDownload("xlsx")}
              >
                {downloading === "xlsx" ? (
                  "Generating…"
                ) : (
                  <>
                    <HiDownload /> Excel
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Term tabs */}
      <div className='term-selector-tabs' style={{ marginBottom: "1.5rem" }}>
        {["1st Term", "2nd Term", "3rd Term"].map((t) => (
          <button
            key={t}
            className={`term-tab ${selectedTerm === t ? "active" : ""}`}
            onClick={() => setSelectedTerm(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className='finance-grid' style={{ marginBottom: "1.5rem" }}>
        {[
          {
            label: "Expected Revenue",
            val: `NGN ${grandFees.toLocaleString()}`,
            sub: "Total fees billed",
            cls: "",
          },
          {
            label: "Collected",
            val: `NGN ${grandPaid.toLocaleString()}`,
            sub: `${totalFullyPaid} students fully paid`,
            cls: "cleared",
          },
          {
            label: "Outstanding",
            val: `NGN ${grandOutstanding.toLocaleString()}`,
            sub: `${totalOwing} students owing`,
            cls: grandOutstanding > 0 ? "debt" : "cleared",
          },
          {
            label: "Collection Rate",
            val: `${overallRate}%`,
            sub:
              overallRate >= 80
                ? "Excellent"
                : overallRate >= 50
                  ? "Needs improvement"
                  : "Critical — act now",
            cls: overallRate >= 80 ? "cleared" : overallRate >= 50 ? "" : "debt",
          },
        ].map(({ label, val, sub, cls }) => (
          <div key={label} className='finance-card'>
            <div className='f-data'>
              <label>{label}</label>
              <h3 className={cls}>{val}</h3>
              <small style={{ color: "var(--color-text-secondary)", fontSize: 11 }}>{sub}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Milestone */}
      <div className='table-card' style={{ marginBottom: "1.25rem", padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.25rem" }}>
          <HiStar style={{ color: "#f59e0b" }} />
          <h3 style={{ margin: 0, fontSize: "0.95rem" }}>Collection Milestones — {selectedTerm}</h3>
        </div>
        <p style={{ margin: "0 0 0.5rem", fontSize: 12, color: "var(--color-text-secondary)" }}>
          Track progress toward full fee collection for this term.
        </p>
        {loading ? <Bone h={60} /> : <MilestoneTracker rate={overallRate} />}
      </div>

      {/* Nav tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          marginBottom: "1rem",
          borderBottom: "2px solid var(--color-border-tertiary)",
          flexWrap: "wrap",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: "8px 8px 0 0",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #4f46e5" : "2px solid transparent",
              marginBottom: -2,
              background: activeTab === tab.id ? "#eef2ff" : "transparent",
              color: activeTab === tab.id ? "#4f46e5" : "var(--color-text-secondary)",
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview tab ── */}
      {activeTab === "overview" && (
        <div className='table-card' style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "0.95rem" }}>Collection by Class</h3>
            <div style={{ display: "flex", gap: "0.375rem" }}>
              {["table", "cards"].map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid var(--color-border-secondary)",
                    background: viewMode === m ? "#4f46e5" : "transparent",
                    color: viewMode === m ? "#fff" : "var(--color-text-secondary)",
                  }}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <Bone h={200} />
          ) : reportData.length === 0 ? (
            <p className='empty-row'>No data for {selectedTerm}.</p>
          ) : viewMode === "cards" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
                gap: "1rem",
              }}
            >
              {reportData.map((row) => (
                <div
                  key={row.classId}
                  style={{
                    background: "var(--color-background-secondary)",
                    borderRadius: 12,
                    padding: "1rem",
                    border: "1px solid var(--color-border-tertiary)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <p style={{ fontWeight: 700, margin: 0, fontSize: 14 }}>{row.className}</p>
                    <Donut pct={row.collectionRate} />
                  </div>
                  <InlineBar pct={row.collectionRate} />
                  <div
                    style={{
                      marginTop: "0.75rem",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.4rem",
                    }}
                  >
                    {[
                      ["Students", row.studentCount],
                      ["Paid ✓", row.fullyPaid],
                      ["Owing ⚠", row.withBalance],
                      ["Balance", `NGN ${row.outstanding.toLocaleString()}`],
                    ].map(([k, v]) => (
                      <div key={k} style={{ fontSize: 11 }}>
                        <span style={{ color: "var(--color-text-secondary)" }}>{k}: </span>
                        <span style={{ fontWeight: 600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className='data-table'>
                <thead>
                  <tr>
                    <th>Class</th>
                    <th className='text-center'>Students</th>
                    <th className='text-right'>Expected</th>
                    <th className='text-right'>Collected</th>
                    <th className='text-right'>Outstanding</th>
                    <th>Rate</th>
                    <th className='text-center'>✓ Paid</th>
                    <th className='text-center'>⚠ Owing</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row) => (
                    <tr key={row.classId}>
                      <td>
                        <strong>{row.className}</strong>
                      </td>
                      <td className='text-center'>{row.studentCount}</td>
                      <td className='text-right'>NGN {row.totalFees.toLocaleString()}</td>
                      <td className='text-right text-success'>
                        NGN {row.totalPaid.toLocaleString()}
                      </td>
                      <td className={`text-right ${row.outstanding > 0 ? "text-danger" : ""}`}>
                        NGN {row.outstanding.toLocaleString()}
                      </td>
                      <td style={{ minWidth: 130 }}>
                        <InlineBar pct={row.collectionRate} />
                      </td>
                      <td className='text-center'>
                        <span
                          style={{
                            color: "var(--color-text-success)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            justifyContent: "center",
                          }}
                        >
                          <HiCheckCircle />
                          {row.fullyPaid}
                        </span>
                      </td>
                      <td className='text-center'>
                        {row.withBalance > 0 ? (
                          <span
                            style={{
                              color: "var(--color-text-danger)",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              justifyContent: "center",
                            }}
                          >
                            <HiExclamationCircle />
                            {row.withBalance}
                          </span>
                        ) : (
                          <span style={{ color: "var(--color-text-success)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr
                    style={{
                      fontWeight: 600,
                      borderTop: "2px solid var(--color-border-secondary)",
                    }}
                  >
                    <td>
                      <strong>Totals</strong>
                    </td>
                    <td className='text-center'>{totalStudents}</td>
                    <td className='text-right'>NGN {grandFees.toLocaleString()}</td>
                    <td className='text-right text-success'>NGN {grandPaid.toLocaleString()}</td>
                    <td className={`text-right ${grandOutstanding > 0 ? "text-danger" : ""}`}>
                      NGN {grandOutstanding.toLocaleString()}
                    </td>
                    <td>
                      <InlineBar pct={overallRate} />
                    </td>
                    <td className='text-center'>{totalFullyPaid}</td>
                    <td className='text-center'>{totalOwing}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Charts tab ── */}
      {activeTab === "charts" && (
        <div style={{ marginBottom: "1.25rem" }}>
          {loading ? (
            <div className='table-card' style={{ padding: "1.25rem" }}>
              <Bone h={320} />
            </div>
          ) : reportData.length === 0 ? (
            <div className='table-card' style={{ padding: "1.25rem" }}>
              <p className='empty-row'>No data to chart.</p>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div className='table-card' style={{ padding: "1.25rem" }}>
                  <ChartGrouped data={reportData} />
                </div>
                <div className='table-card' style={{ padding: "1.25rem" }}>
                  <ChartRates data={reportData} />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div className='table-card' style={{ padding: "1.25rem" }}>
                  <ChartRevenueDoughnut grandPaid={grandPaid} grandOutstanding={grandOutstanding} />
                </div>
                <div className='table-card' style={{ padding: "1.25rem" }}>
                  <ChartStudentPie data={reportData} />
                </div>
              </div>
              <div className='table-card' style={{ padding: "1.25rem", marginBottom: "1rem" }}>
                <ChartStudentStack data={reportData} />
              </div>
              {reportData.length >= 3 && (
                <div className='table-card' style={{ padding: "1.25rem", marginBottom: "1rem" }}>
                  <p
                    style={{
                      margin: "0 0 0.5rem",
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    The radar compares each class across 5 performance dimensions. Larger polygon =
                    stronger overall performance.
                  </p>
                  <ChartRadar data={reportData} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── By Class tab ── */}
      {activeTab === "class" && (
        <div style={{ marginBottom: "1.25rem" }}>
          {loading ? (
            <div className='table-card' style={{ padding: "1.25rem" }}>
              <Bone h={200} />
            </div>
          ) : reportData.length === 0 ? (
            <div className='table-card' style={{ padding: "1.25rem" }}>
              <p className='empty-row'>No class data available.</p>
            </div>
          ) : (
            reportData.map((row) => {
              const col =
                row.collectionRate >= 80
                  ? "#10b981"
                  : row.collectionRate >= 50
                    ? "#f59e0b"
                    : "#ef4444";
              const statusLabel =
                row.collectionRate >= 80
                  ? "On Track"
                  : row.collectionRate >= 50
                    ? "Needs Attention"
                    : "Critical";
              return (
                <div
                  key={row.classId}
                  className='table-card'
                  style={{ padding: "1.25rem", marginBottom: "1rem" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "0.75rem",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Donut pct={row.collectionRate} size={60} stroke={8} />
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>{row.className}</p>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: col,
                            background: col + "22",
                            padding: "2px 8px",
                            borderRadius: 99,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: col }}>
                        {row.collectionRate}%
                      </p>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)" }}>
                        Collection Rate
                      </p>
                    </div>
                  </div>
                  <div style={{ marginBottom: "0.75rem" }}>
                    <InlineBar pct={row.collectionRate} />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))",
                      gap: "0.75rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    {[
                      ["👥 Students", row.studentCount],
                      ["✅ Fully Paid", row.fullyPaid],
                      ["⚠️ Owing", row.withBalance],
                      ["📋 Expected", `NGN ${row.totalFees.toLocaleString()}`],
                      ["💰 Collected", `NGN ${row.totalPaid.toLocaleString()}`],
                      ["🔴 Outstanding", `NGN ${row.outstanding.toLocaleString()}`],
                    ].map(([label, val]) => (
                      <div
                        key={label}
                        style={{
                          background: "var(--color-background-secondary)",
                          borderRadius: 8,
                          padding: "0.6rem 0.75rem",
                          border: "1px solid var(--color-border-tertiary)",
                        }}
                      >
                        <p
                          style={{
                            margin: "0 0 2px",
                            fontSize: 11,
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {label}
                        </p>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{val}</p>
                      </div>
                    ))}
                  </div>
                  {row.withBalance > 0 && (
                    <div
                      style={{
                        background: "#fff7ed",
                        border: "1px solid #fed7aa",
                        borderRadius: 8,
                        padding: "0.75rem 1rem",
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 12, color: "#92400e" }}>
                        <strong>Action needed:</strong> {row.withBalance} student(s) in{" "}
                        {row.className} owe NGN {row.outstanding.toLocaleString()} in total. The
                        class teacher should contact these families immediately and escalate
                        unresponsive cases.
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Advisory tab ── */}
      {activeTab === "insights" && (
        <div className='table-card' style={{ padding: "1.25rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
            <HiLightBulb style={{ color: "#f59e0b", fontSize: 20 }} />
            <h3 style={{ margin: 0, fontSize: "0.95rem" }}>
              Management Advisory Report — {selectedTerm}
            </h3>
          </div>
          <p style={{ margin: "0 0 1rem", fontSize: 12, color: "var(--color-text-secondary)" }}>
            Auto-generated observations and recommendations based on current collection data.
          </p>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} h={80} r={12} style={{ marginBottom: 12 }} />
            ))
          ) : insights.length === 0 ? (
            <p className='empty-row'>Generate a report first to see advisory notes.</p>
          ) : (
            insights.map((ins, i) => <InsightCard key={i} insight={ins} />)
          )}
        </div>
      )}

      {/* ── Download tab ── */}
      {activeTab === "download" && (
        <div className='table-card' style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
            <HiDocumentText style={{ color: "#4f46e5", fontSize: 20 }} />
            <h3 style={{ margin: 0, fontSize: "0.95rem" }}>Download Reports</h3>
          </div>
          <p style={{ margin: "0 0 1.5rem", fontSize: 13, color: "var(--color-text-secondary)" }}>
            Choose your preferred format. All downloads include the full executive summary, class
            breakdown, and management advisory.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))",
              gap: "1rem",
            }}
          >
            {[
              {
                type: "pdf",
                icon: "📄",
                title: "PDF Report",
                sub: ".pdf — printable, universal",
                desc: "Fully formatted A4 report with tables, colour-coded rates, and advisory sections. Best for printing or emailing to management.",
              },
              {
                type: "docx",
                icon: "📝",
                title: "Word Document",
                sub: ".docx — editable",
                desc: "Styled Word document with headings, tables, and the full advisory. Editable by the school bursar or secretary before sharing.",
              },
              {
                type: "xlsx",
                icon: "📊",
                title: "Excel Workbook",
                sub: ".xlsx — multi-sheet",
                desc: "One sheet per class plus an 'All Classes' summary sheet. Ideal for further analysis or filing in Google Sheets / Excel.",
              },
            ].map(({ type, icon, title, sub, desc }) => (
              <div
                key={type}
                style={{
                  border: "1px solid var(--color-border-secondary)",
                  borderRadius: 12,
                  padding: "1.25rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: "0.75rem",
                  }}
                >
                  <span style={{ fontSize: 28 }}>{icon}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{title}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)" }}>
                      {sub}
                    </p>
                  </div>
                </div>
                <p
                  style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 1rem" }}
                >
                  {desc}
                </p>
                <button
                  className='filter-btn'
                  style={{ width: "100%", justifyContent: "center" }}
                  disabled={reportData.length === 0 || !!downloading}
                  onClick={() => handleDownload(type)}
                >
                  {downloading === type ? (
                    "Generating…"
                  ) : (
                    <>
                      <HiDownload /> Download {title}
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "1.25rem",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 8,
              padding: "0.75rem 1rem",
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: "#1d4ed8" }}>
              <strong>Note:</strong> Downloads require these npm packages to be installed in your
              project: <code>docx</code>, <code>jspdf</code>, <code>jspdf-autotable</code>,{" "}
              <code>xlsx</code>. Run: <code>npm install docx jspdf jspdf-autotable xlsx</code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
