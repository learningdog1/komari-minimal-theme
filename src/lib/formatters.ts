function roundNumber(
  value: number,
  maximumFractionDigits: number
): number {
  const factor = 10 ** maximumFractionDigits;
  return Math.round(value * factor) / factor;
}

function formatNumber(
  value: number,
  maximumFractionDigits: number
): string {
  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits,
    minimumFractionDigits: 0
  }).format(value);
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined || Number.isNaN(bytes)) {
    return "N/A";
  }

  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / 1024 ** exponent;
  const precision = value >= 10 || exponent === 0 ? 0 : 1;

  return `${value.toFixed(precision)} ${units[exponent]}`;
}

export function formatBandwidth(bytesPerSecond?: number): string {
  if (bytesPerSecond === undefined || Number.isNaN(bytesPerSecond)) {
    return "N/A";
  }

  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || Number.isNaN(seconds)) {
    return "N/A";
  }

  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ${minutes % 60}m`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function formatPercent(value?: number): string {
  const rounded = roundPercentValue(value);

  if (rounded === undefined) {
    return "N/A";
  }

  const precision = Number.isInteger(rounded) ? 0 : 1;
  return `${formatNumber(rounded, precision)}%`;
}

export function roundPercentValue(value?: number): number | undefined {
  if (value === undefined || Number.isNaN(value)) {
    return undefined;
  }

  const precision = Math.abs(value) >= 10 ? 0 : 1;
  return roundNumber(value, precision);
}

export function formatDecimal(
  value?: number,
  maximumFractionDigits = 2
): string {
  if (value === undefined || Number.isNaN(value)) {
    return "N/A";
  }

  return formatNumber(roundNumber(value, maximumFractionDigits), maximumFractionDigits);
}

export function formatTimestamp(value?: string | null): string {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return date.toLocaleString();
}

/**
 * 统一四档严重度级别
 * normal: 正常（绿色）
 * notice: 注意（黄色）
 * warning: 警告（橙色）
 * danger: 危险（红色）
 */
export type SeverityLevel = "normal" | "notice" | "warning" | "danger";

/**
 * 根据占用率计算严重度级别
 * 阈值：0-50% normal, 50-70% notice, 70-85% warning, 85-100% danger
 */
export function calculateSeverityLevel(percent?: number): SeverityLevel {
  if (percent === undefined || Number.isNaN(percent)) {
    return "normal";
  }

  if (percent >= 85) return "danger";
  if (percent >= 70) return "warning";
  if (percent >= 50) return "notice";
  return "normal";
}

/**
 * 计算网络速率严重度级别（基于绝对速率阈值）
 * @param bytesPerSecond 网络速率（bytes/s）
 * @returns 严重度级别
 */
export function calculateNetworkSeverity(bytesPerSecond?: number): SeverityLevel {
  if (bytesPerSecond === undefined || Number.isNaN(bytesPerSecond)) {
    return "normal";
  }

  const MB = 1024 * 1024;

  // 基于绝对速率阈值（非百分比）
  if (bytesPerSecond >= 100 * MB) return "danger";   // >= 100 MB/s
  if (bytesPerSecond >= 50 * MB) return "warning";   // >= 50 MB/s
  if (bytesPerSecond >= 10 * MB) return "notice";    // >= 10 MB/s
  return "normal";                                    // < 10 MB/s
}

/**
 * 负载状态信息
 */
export interface LoadStatusInfo {
  /** 负载率百分比 (load1 / cpuCores * 100) */
  ratioPercent: number;
  /** 严重度级别（四档：normal/notice/warning/danger） */
  severity: SeverityLevel;
  /** 状态标签（空闲/正常/繁忙/过载） */
  statusLabel: string;
  /** 完整显示文案（如"13% 空闲"） */
  label: string;
}

/**
 * 计算负载状态
 * 负载率 = load1 / cpuCores
 * 四档阈值：
 * - <50%: 空闲 (normal)
 * - 50-70%: 正常 (notice)
 * - 70-100%: 繁忙 (warning)
 * - >=100%: 过载 (danger)
 */
export function calculateLoadStatus(
  load1?: number,
  cpuCores?: number
): LoadStatusInfo {
  // 默认值处理
  if (load1 === undefined || Number.isNaN(load1)) {
    return { ratioPercent: 0, severity: "normal", statusLabel: "未知", label: "0% 未知" };
  }

  // 无核心数信息时，假设为1核（向后兼容）
  const cores = cpuCores && cpuCores > 0 ? cpuCores : 1;
  const ratio = load1 / cores;
  const ratioPercent = Math.round(ratio * 100);

  // 四档映射：空闲/正常/繁忙/过载
  if (ratio >= 1.0) {
    return {
      ratioPercent,
      severity: "danger",
      statusLabel: "过载",
      label: `${ratioPercent}% 过载`
    };
  }
  if (ratio >= 0.7) {
    return {
      ratioPercent,
      severity: "warning",
      statusLabel: "繁忙",
      label: `${ratioPercent}% 繁忙`
    };
  }
  if (ratio >= 0.5) {
    return {
      ratioPercent,
      severity: "notice",
      statusLabel: "正常",
      label: `${ratioPercent}% 正常`
    };
  }
  return {
    ratioPercent,
    severity: "normal",
    statusLabel: "空闲",
    label: `${ratioPercent}% 空闲`
  };
}
