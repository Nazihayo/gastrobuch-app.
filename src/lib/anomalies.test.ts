import { describe, expect, it } from "vitest";
import {
  detectCashRatioAnomalies,
  summarizeCancellations,
  type CancellationRecord,
  type DailyPaymentSplit,
} from "./anomalies";

describe("summarizeCancellations", () => {
  it("ranks staff by cancellation count, highest first", () => {
    const records: CancellationRecord[] = [
      {
        userId: "a",
        userLabel: "anna@x.com",
        orderId: "o1",
        orderCreatedAt: "2026-09-10T10:00:00Z",
        cancelledAt: "2026-09-10T10:30:00Z",
        totalEstimate: 20,
      },
      {
        userId: "b",
        userLabel: "ben@x.com",
        orderId: "o2",
        orderCreatedAt: "2026-09-10T11:00:00Z",
        cancelledAt: "2026-09-10T11:30:00Z",
        totalEstimate: 15,
      },
      {
        userId: "b",
        userLabel: "ben@x.com",
        orderId: "o3",
        orderCreatedAt: "2026-09-11T11:00:00Z",
        cancelledAt: "2026-09-11T11:30:00Z",
        totalEstimate: 10,
      },
    ];
    const summary = summarizeCancellations(records);
    expect(summary[0].userId).toBe("b");
    expect(summary[0].count).toBe(2);
    expect(summary[0].totalAmount).toBe(25);
    expect(summary[1].userId).toBe("a");
  });

  it("counts a cancellation within the fast-void window", () => {
    const records: CancellationRecord[] = [
      {
        userId: "a",
        userLabel: "anna@x.com",
        orderId: "o1",
        orderCreatedAt: "2026-09-10T10:00:00Z",
        cancelledAt: "2026-09-10T10:01:30Z",
        totalEstimate: 20,
      },
    ];
    const summary = summarizeCancellations(records, 2);
    expect(summary[0].fastVoidCount).toBe(1);
  });

  it("does not count a slow cancellation as a fast void", () => {
    const records: CancellationRecord[] = [
      {
        userId: "a",
        userLabel: "anna@x.com",
        orderId: "o1",
        orderCreatedAt: "2026-09-10T10:00:00Z",
        cancelledAt: "2026-09-10T10:10:00Z",
        totalEstimate: 20,
      },
    ];
    const summary = summarizeCancellations(records, 2);
    expect(summary[0].fastVoidCount).toBe(0);
  });
});

describe("detectCashRatioAnomalies", () => {
  function makeHistory(cashRatios: number[]): DailyPaymentSplit[] {
    return cashRatios.map((ratio, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, "0")}`,
      cash: ratio * 100,
      card: (1 - ratio) * 100,
    }));
  }

  it("flags a day whose cash ratio is far above the trailing average", () => {
    const history = makeHistory([0.3, 0.32, 0.28, 0.31, 0.29, 0.9]);
    const anomalies = detectCashRatioAnomalies(history);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0].date).toBe("2026-09-06");
  });

  it("does not flag anything when cash ratio stays consistent", () => {
    const history = makeHistory([0.3, 0.32, 0.28, 0.31, 0.29, 0.3]);
    expect(detectCashRatioAnomalies(history)).toHaveLength(0);
  });

  it("ignores near-empty days below the minimum daily total", () => {
    const history: DailyPaymentSplit[] = [
      ...makeHistory([0.3, 0.3, 0.3, 0.3, 0.3]),
      { date: "2026-09-06", cash: 5, card: 0 },
    ];
    expect(detectCashRatioAnomalies(history)).toHaveLength(0);
  });

  it("returns nothing when there isn't enough history to establish a baseline", () => {
    const history = makeHistory([0.3, 0.9]);
    expect(detectCashRatioAnomalies(history)).toHaveLength(0);
  });
});
