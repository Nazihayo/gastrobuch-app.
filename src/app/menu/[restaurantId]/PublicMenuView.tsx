"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { fmtMoney, type CountryCode } from "@/lib/countries";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { submitOrder, type CustomerInfo, type LoyaltyProgress } from "./actions";

export type PublicMenuItem = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  photoUrl: string | null;
  category: "food" | "drink";
};

export default function PublicMenuView({
  restaurantId,
  restaurantName,
  restaurantLogoUrl,
  restaurantWhatsapp,
  country,
  items,
  lockedTableNumber,
}: {
  restaurantId: string;
  restaurantName: string;
  restaurantLogoUrl: string | null;
  restaurantWhatsapp: string | null;
  country: CountryCode;
  items: PublicMenuItem[];
  lockedTableNumber?: string;
}) {
  const { t } = useLanguage();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: "",
    phone: "",
    address: "",
    tableNumber: lockedTableNumber ?? "",
    orderType: lockedTableNumber ? "dine_in" : "pickup",
    notes: "",
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loyalty, setLoyalty] = useState<LoyaltyProgress | undefined>(undefined);
  const [orderId, setOrderId] = useState<string | undefined>(undefined);

  function setQty(id: string, qty: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => {
          const item = items.find((i) => i.id === id);
          return item ? { item, quantity } : null;
        })
        .filter((l): l is { item: PublicMenuItem; quantity: number } => l !== null),
    [cart, items]
  );
  const total = cartLines.reduce((sum, l) => sum + l.item.price * l.quantity, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const result = await submitOrder(
      restaurantId,
      cartLines.map((l) => ({
        name: l.item.name,
        price: l.item.price,
        quantity: l.quantity,
        category: l.item.category,
      })),
      customer
    );
    setPending(false);
    if (result.error) {
      setError(t(`order_error_${result.error}` as const));
      return;
    }
    setLoyalty(result.loyalty);
    setOrderId(result.orderId);
    setSuccess(true);
  }

  function buildOrderWhatsAppMessage(): string {
    const itemsText = cartLines.map((l) => `${l.quantity}x ${l.item.name}`).join("\n");
    const typeText =
      customer.orderType === "dine_in"
        ? `${t("table_label")} ${customer.tableNumber}`
        : customer.orderType === "delivery"
          ? `${t("order_type_delivery")}: ${customer.address}`
          : t("order_type_pickup");
    return `${restaurantName}\n${customer.name}\n\n${itemsText}\n\n${t("cart_total")}: ${fmtMoney(
      total,
      country
    )}\n${typeText}`;
  }

  if (success) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <span className="text-4xl">✅</span>
        <h1 className="font-display text-2xl font-bold">{t("order_success_title")}</h1>
        <p className="text-sm text-text-on-ink-dim">{t("order_success_lead")}</p>
        {loyalty && (
          <div className="mt-2 flex flex-col gap-2">
            {loyalty.justReachedTierName && (
              <div className="rounded-xl border border-brand-green-bright/40 bg-brand-green-bright/10 px-4 py-3">
                <p className="text-sm font-semibold text-brand-green-bright">
                  {t("loyalty_earned_prefix")} {loyalty.justReachedTierName} —{" "}
                  {loyalty.justReachedTierReward}
                </p>
              </div>
            )}
            {loyalty.nextTierName && (
              <div className="rounded-xl border border-divider bg-ink-soft px-4 py-3">
                <p className="text-sm text-text-on-ink-dim">
                  {t("loyalty_progress_prefix")} {loyalty.totalOrders}/{loyalty.nextTierThreshold}{" "}
                  · {t("loyalty_progress_suffix")} {loyalty.nextTierName} —{" "}
                  {loyalty.nextTierReward}
                </p>
              </div>
            )}
          </div>
        )}
        {orderId && (
          <a
            href={`/track/${orderId}`}
            className="mt-2 flex min-h-11 items-center justify-center rounded-lg border border-divider px-4 text-sm font-semibold"
          >
            {t("order_success_track_btn")}
          </a>
        )}
        {restaurantWhatsapp && (
          <a
            href={buildWhatsAppLink(restaurantWhatsapp, country, buildOrderWhatsAppMessage())}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center justify-center rounded-lg bg-[#25D366] px-4 text-sm font-semibold text-[#06140D]"
          >
            {t("order_whatsapp_btn")}
          </a>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-10 pb-32">
      <div className="flex flex-col items-center text-center">
        {restaurantLogoUrl && (
          /* eslint-disable-next-line @next/next/no-img-element -- a public Supabase Storage URL, not something Next's optimizer can process */
          <img
            src={restaurantLogoUrl}
            alt={restaurantName}
            width={72}
            height={72}
            className="mb-3 h-16 w-16 rounded-full border border-divider object-cover"
          />
        )}
        <h1 className="font-display text-3xl font-bold">{restaurantName}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("public_menu_lead")}</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {items.map((item) => {
          const qty = cart[item.id] ?? 0;
          return (
            <div
              key={item.id}
              className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${
                item.available ? "border-divider bg-ink-soft" : "border-divider bg-ink-soft opacity-50"
              }`}
            >
              {item.photoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element -- a public Supabase Storage URL, not something Next's optimizer can process */
                <img
                  src={item.photoUrl}
                  alt={item.name || ""}
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name || "—"}</p>
                <div className="flex items-center gap-2">
                  {!item.available && (
                    <span className="text-xs font-semibold text-brand-red">
                      {t("public_menu_sold_out")}
                    </span>
                  )}
                  <span className="font-num text-xs text-text-on-ink-dim">
                    {fmtMoney(item.price, country)}
                  </span>
                </div>
              </div>
              {item.available && (
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setQty(item.id, qty - 1)}
                    disabled={qty === 0}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-divider text-lg disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-num text-sm">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty(item.id, qty + 1)}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-divider text-lg"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {cartLines.length > 0 && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 rounded-xl border border-divider bg-ink-soft p-5"
        >
          <div className="flex items-baseline justify-between border-b border-divider pb-3 text-sm">
            <span className="font-semibold">{t("cart_total")}</span>
            <span className="font-num text-lg font-bold text-brand-green-bright">
              {fmtMoney(total, country)}
            </span>
          </div>

          {lockedTableNumber ? (
            <div className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand-green-bright bg-brand-green-bright/10 px-3 text-sm font-semibold text-brand-green-bright">
              🍽️ {t("table_label")} {lockedTableNumber}
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCustomer((c) => ({ ...c, orderType: "pickup" }))}
                className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium ${
                  customer.orderType === "pickup"
                    ? "border-brand-green-bright text-brand-green-bright"
                    : "border-divider text-text-on-ink-dim"
                }`}
              >
                {t("order_type_pickup")}
              </button>
              <button
                type="button"
                onClick={() => setCustomer((c) => ({ ...c, orderType: "delivery" }))}
                className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium ${
                  customer.orderType === "delivery"
                    ? "border-brand-green-bright text-brand-green-bright"
                    : "border-divider text-text-on-ink-dim"
                }`}
              >
                {t("order_type_delivery")}
              </button>
              <button
                type="button"
                onClick={() => setCustomer((c) => ({ ...c, orderType: "dine_in" }))}
                className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium ${
                  customer.orderType === "dine_in"
                    ? "border-brand-green-bright text-brand-green-bright"
                    : "border-divider text-text-on-ink-dim"
                }`}
              >
                {t("order_type_dine_in")}
              </button>
            </div>
          )}

          <input
            type="text"
            required
            value={customer.name}
            onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
            placeholder={t("checkout_name_ph")}
            className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
          />
          <input
            type="tel"
            required
            value={customer.phone}
            onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
            placeholder={t("checkout_phone_ph")}
            className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
          />
          {customer.orderType === "delivery" && (
            <input
              type="text"
              required
              value={customer.address}
              onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))}
              placeholder={t("checkout_address_ph")}
              className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
            />
          )}
          {customer.orderType === "dine_in" && !lockedTableNumber && (
            <input
              type="text"
              required
              value={customer.tableNumber}
              onChange={(e) => setCustomer((c) => ({ ...c, tableNumber: e.target.value }))}
              placeholder={t("checkout_table_ph")}
              className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
            />
          )}
          <input
            type="text"
            value={customer.notes}
            onChange={(e) => setCustomer((c) => ({ ...c, notes: e.target.value }))}
            placeholder={t("checkout_notes_ph")}
            className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
          />

          {error && <p className="text-sm text-brand-red">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="min-h-11 rounded-lg bg-brand-green-bright px-4 py-3 text-sm font-bold text-[#0A1F16] disabled:opacity-50"
          >
            {pending ? "…" : t("checkout_submit")}
          </button>
        </form>
      )}

      <p className="text-center text-xs text-text-on-ink-dim">{t("public_menu_disclaimer")}</p>
    </main>
  );
}
