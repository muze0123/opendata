export interface OverviewMetric {
  id: 'vulnerabilities' | 'blockedAttacks' | 'securityScore' | 'r155Compliance';
  value: string;
  change?: string;
  direction?: "up" | "down";
  chart: "line" | "bar" | "progress";
  points?: number[];
  progress?: number;
}

export interface AlertRecord {
  id: string;
  severity: "CRIT" | "HIGH" | "INFO";
  time: string;
  event: string;
  vehicleLast4: string;
}

export interface OverviewReport {
  id: string;
  metrics: OverviewMetric[];
  ecu: { type: 'gateway' | 'ivi' | 'telematics'; count: number }[];
  alerts: AlertRecord[];
  monthly: { month: string; attacks: number; index: number }[];
}

const months = Array.from(
  { length: 12 },
  (_, index) => `2025/${String(index + 1).padStart(2, "0")}`
);

export const reports: OverviewReport[] = [
  {
    id: "default",
    metrics: [
      {
        id: 'vulnerabilities',
        value: "131,238",
        change: "+2.3%",
        direction: "up",
        chart: "line",
        points: [
          18,
          20,
          49,
          40,
          48,
          51,
          43,
          39,
          55,
          59,
          65,
          75,
          73,
          52,
          50,
          78,
          72,
        ],
      },
      {
        id: 'blockedAttacks',
        value: "12,450",
        change: "-4.3%",
        direction: "down",
        chart: "bar",
        points: [37, 27, 12, 21, 38, 25, 32, 26, 49],
      },
      {
        id: 'securityScore',
        value: "84.4",
        chart: "progress",
        progress: 84.4,
      },
      {
        id: 'r155Compliance',
        value: "98.25%",
        change: "+1.6%",
        direction: "up",
        chart: "line",
        points: [
          18,
          20,
          49,
          40,
          48,
          51,
          43,
          39,
          55,
          59,
          65,
          75,
          73,
          52,
          50,
          78,
          72,
        ],
      },
    ],
    ecu: [
      { type: 'gateway', count: 800 },
      { type: 'ivi', count: 600 },
      { type: 'telematics', count: 400 },
      { type: 'gateway', count: 300 },
      { type: 'telematics', count: 100 },
    ],
    alerts: [
      {
        id: "A-1042",
        severity: "CRIT",
        time: "10:42:05",
        event: "CAN Bus Replay",
        vehicleLast4: '8821',
      },
      {
        id: "A-1041",
        severity: "HIGH",
        time: "10:42:05",
        event: "FOTA Spoofing",
        vehicleLast4: '6219',
      },
      {
        id: "A-1040",
        severity: "INFO",
        time: "10:42:05",
        event: "Port Scan",
        vehicleLast4: '4306',
      },
      {
        id: "A-1039",
        severity: "CRIT",
        time: "10:42:05",
        event: "CAN Bus Replay",
        vehicleLast4: '7315',
      },
      {
        id: "A-1038",
        severity: "CRIT",
        time: "10:42:05",
        event: "CAN Bus Replay",
        vehicleLast4: '5174',
      },
    ],
    monthly: [
      69,
      17,
      32,
      20,
      41,
      11,
      57,
      15,
      57,
      52,
      92,
      42,
    ].map((attacks, i) => ({
      month: months[i]!,
      attacks,
      index: [78, 60, 73, 68, 72, 86, 97, 71, 73, 74, 92, 62][i]!,
    })),
  },
  {
    id: "vehicle",
    metrics: [
      {
        id: 'vulnerabilities',
        value: "8,624",
        change: "-1.8%",
        direction: "down",
        chart: "line",
        points: [72, 65, 61, 70, 60, 55, 53, 47, 50, 39, 41, 35],
      },
      {
        id: 'blockedAttacks',
        value: "3,218",
        change: "+1.2%",
        direction: "up",
        chart: "bar",
        points: [16, 22, 13, 38, 29, 34, 39, 44, 50],
      },
      {
        id: 'securityScore',
        value: "91.2",
        chart: "progress",
        progress: 91.2,
      },
      {
        id: 'r155Compliance',
        value: "96.80%",
        change: "+0.8%",
        direction: "up",
        chart: "line",
        points: [43, 48, 45, 58, 55, 64, 60, 71, 73, 78, 76, 86],
      },
    ],
    ecu: [
      { type: 'gateway', count: 520 },
      { type: 'ivi', count: 430 },
      { type: 'telematics', count: 320 },
      { type: 'gateway', count: 240 },
      { type: 'telematics', count: 90 },
    ],
    alerts: [
      {
        id: "V-2031",
        severity: "HIGH",
        time: "09:38:21",
        event: "FOTA Spoofing",
        vehicleLast4: '6219',
      },
      {
        id: "V-2030",
        severity: "CRIT",
        time: "08:14:05",
        event: "CAN Bus Replay",
        vehicleLast4: '8821',
      },
      {
        id: "V-2029",
        severity: "INFO",
        time: "07:52:40",
        event: "Port Scan",
        vehicleLast4: '4306',
      },
    ],
    monthly: [
      35,
      23,
      41,
      30,
      25,
      38,
      49,
      36,
      44,
      40,
      53,
      46,
    ].map((attacks, i) => ({
      month: months[i]!,
      attacks,
      index: [61, 65, 59, 67, 70, 72, 69, 74, 77, 80, 83, 86][i]!,
    })),
  },
];

export interface OverviewNotice {
  id: string;
  type: "system" | "overdue" | "alert";
  source: string;
  time: string;
}

export const overviewNotices: OverviewNotice[] = [
  {
    id: "N-001",
    type: "system",
    source: "VSOC",
    time: "2025/10/12 12:00:00",
  },
  {
    id: "N-002",
    type: "overdue",
    source: "VSOC",
    time: "2025/10/12 12:00:00",
  },
  {
    id: "N-003",
    type: "alert",
    source: "VSOC",
    time: "2025/10/12 12:00:00",
  },
];

export interface OverviewApp {
  id: string;
  icon: 'csms' | 'vsoc' | 'tara' | 'operations' | 'hmg';
  url?: string;
  group: "mine" | "more";
  initialStatus: "active" | "inactive";
  new?: boolean;
}

export const overviewApps: OverviewApp[] = [
  // 2026-11-09 用户裁决：HMG「启动」新开标签页进入本地 HMG 应用平台工作台（dev server 5175）。
  { id: "hmg", icon: "hmg", group: "mine", initialStatus: "active", url: "http://127.0.0.1:5175/workbench" },
];
