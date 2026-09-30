"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { fmtMoney, type CountryCode } from "@/lib/countries";
import { createClient } from "@/lib/supabase/client";
import { playAlertSound } from "@/lib/playAlertSound";
import { updateOrderStatus, type OrderStatus } from "./actions";

export type OrderItem = { id: string; recipeName: string; unitPrice: number; quantity: number };
export type OrderWithItems = {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  orderType: string;
  status: OrderStatus;
  notes: string;
  totalEstimate: number;
  createdAt: string;
  items: OrderItem[];
};

type AdvanceableStatus = "confirmed" | "preparing" | "ready" | "completed";

const NEXT_STATUS: Record<OrderStatus, AdvanceableStatus | null> = {
  new: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "completed",
  completed: null,
  cancelled: null,
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  new: "text-brand-red",
  confirmed: "text-text-on-ink",
  preparing: "text-text-on-ink",
  ready: "text-brand-green-bright",
  completed: "text-text-on-ink-dim",
  cancelled: "text-text-on-ink-dim",
};

export default function OrdersView({
  restaurantId,
  country,
  initialOrders,
}: {
  restaurantId: string;
  country: CountryCode;
  initialOrders: OrderWithItems[];
}) {
  const { t, locale } = useLanguage();
  const [orders, setOrders] = useState(initialOrders);
  const [, startTransition] = useTransition();
  const [newOrderAlert, setNewOrderAlert] = useState<string | null>(null);
  const alertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ask for notification permission once, so a new order can also raise a
  // system notification (works even if this tab isn't the focused one, as
  // long as the browser is still open).
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            customer_name: string;
            customer_phone: string;
            customer_address: string;
            order_type: string;
            status: OrderStatus;
            notes: string;
            total_estimate: number;
            created_at: string;
          };

          const { data: itemRows } = await supabase
            .from("order_items")
            .select("id, recipe_name, unit_price, quantity")
            .eq("order_id", row.id);

          const newOrder: OrderWithItems = {
            id: row.id,
            customerName: row.customer_name,
            customerPhone: row.customer_phone,
            customerAddress: row.customer_address,
            orderType: row.order_type,
            status: row.status,
            notes: row.notes,
            totalEstimate: row.total_estimate,
            createdAt: row.created_at,
            items: (itemRows ?? []).map((i) => ({
              id: i.id,
              recipeName: i.recipe_name,
              unitPrice: i.unit_price,
              quantity: i.quantity,
            })),
          };

          setOrders((prev) => [newOrder, ...prev]);

          playAlertSound();
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification(t("orders_new_notification_title"), {
              body: newOrder.customerName || t("orders_title"),
            });
          }

          setNewOrderAlert(newOrder.customerName || t("orders_title"));
          if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
          alertTimeoutRef.current = setTimeout(() => setNewOrderAlert(null), 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t() is stable enough for this alert; re-subscribing on every locale change isn't needed
  }, [restaurantId]);

  function advance(order: OrderWithItems) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: next } : o)));
    startTransition(() => {
      updateOrderStatus(order.id, next);
    });
  }

  function cancel(order: OrderWithItems) {
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: "cancelled" } : o)));
    startTransition(() => {
      updateOrderStatus(order.id, "cancelled");
    });
  }

  const active = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled");
  const past = orders.filter((o) => o.status === "completed" || o.status === "cancelled");

  return (
    <div className="flex flex-col gap-6">
      {newOrderAlert && (
        <div
          role="alert"
          className="animate-pulse rounded-xl border border-brand-red bg-brand-red/20 px-4 py-3 text-sm font-semibold text-text-on-ink"
        >
          🚨 {t("orders_new_alert_banner")} {newOrderAlert}
        </div>
      )}

      <div>
        <h1 className="font-display text-2xl font-bold">{t("orders_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("orders_lead")}</p>
      </div>

      {active.length === 0 && (
        <p className="text-sm text-text-on-ink-dim">{t("orders_empty")}</p>
      )}

      <div className="flex flex-col gap-3">
        {active.map((order) => {
          const nextStatus = NEXT_STATUS[order.status];
          return (
          <div key={order.id} className="rounded-xl border border-divider bg-ink-soft p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{order.customerName || "—"}</p>
                <a
                  href={`tel:${order.customerPhone}`}
                  className="font-num text-xs text-text-on-ink-dim underline"
                >
                  {order.customerPhone}
                </a>
              </div>
              <span className={`text-xs font-semibold ${STATUS_COLOR[order.status]}`}>
                {t(`order_status_${order.status}` as const)}
              </span>
            </div>

            <p className="mt-1 text-xs text-text-on-ink-dim">
              {order.orderType === "delivery"
                ? `🚴 ${t("order_type_delivery")} — ${order.customerAddress}`
                : `🏠 ${t("order_type_pickup")}`}
            </p>

            <div className="mt-3 flex flex-col gap-1 border-t border-divider pt-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-xs">
                  <span>
                    {item.quantity}× {item.recipeName || "—"}
                  </span>
                  <span className="font-num text-text-on-ink-dim">
                    {fmtMoney(item.unitPrice * item.quantity, country)}
                  </span>
                </div>
              ))}
            </div>

            {order.notes && (
              <p className="mt-2 text-xs italic text-text-on-ink-dim">{order.notes}</p>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-divider pt-3">
              <span className="font-num text-sm font-bold text-brand-green-bright">
                {fmtMoney(order.totalEstimate, country)}
              </span>
              <span className="text-[10px] text-text-on-ink-dim">
                {new Date(order.createdAt).toLocaleTimeString(locale === "ar" ? "ar" : "de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div className="mt-3 flex gap-2">
              {nextStatus && (
                <button
                  type="button"
                  onClick={() => advance(order)}
                  className="min-h-11 flex-1 rounded-lg bg-brand-green-bright px-3 text-sm font-semibold text-[#0A1F16]"
                >
                  {t(`order_advance_to_${nextStatus}` as const)}
                </button>
              )}
              <button
                type="button"
                onClick={() => cancel(order)}
                className="min-h-11 rounded-lg border border-divider px-3 text-sm text-text-on-ink-dim"
              >
                {t("order_cancel_btn")}
              </button>
            </div>
          </div>
          );
        })}
      </div>

      {past.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-medium text-text-on-ink-dim">{t("orders_past_title")}</h2>
          {past.map((order) => (
            <div
              key={order.id}
              className="flex items-center justify-between rounded-lg border border-divider bg-ink p-3 text-sm"
            >
              <span>{order.customerName || "—"}</span>
              <span className={`text-xs ${STATUS_COLOR[order.status]}`}>
                {t(`order_status_${order.status}` as const)}
              </span>
              <span className="font-num text-text-on-ink-dim">
                {fmtMoney(order.totalEstimate, country)}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-text-on-ink-dim">{t("orders_disclaimer")}</p>
    </div>
  );
}
