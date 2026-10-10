"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { fmtMoney, type CountryCode } from "@/lib/countries";
import { createClient } from "@/lib/supabase/client";
import { joinTableCart, submitTableCart } from "./actions";

const GUEST_ID_KEY = "gastrohub_guest_id";
const GUEST_NAME_KEY = "gastrohub_guest_name";

export type SharedCartMenuItem = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  photoUrl: string | null;
  category: "food" | "drink";
  dietTag: "vegan" | "vegetarian" | null;
};

type CartRow = {
  id: string;
  guest_id: string;
  guest_name: string;
  recipe_id: string | null;
  name: string;
  price: number;
  quantity: number;
};

function randomGuestId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function SharedTableCartView({
  restaurantId,
  restaurantName,
  restaurantLogoUrl,
  country,
  items,
  tableNumber,
}: {
  restaurantId: string;
  restaurantName: string;
  restaurantLogoUrl: string | null;
  country: CountryCode;
  items: SharedCartMenuItem[];
  tableNumber: string;
}) {
  const { t } = useLanguage();
  const [guestId, setGuestId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cartRows, setCartRows] = useState<CartRow[]>([]);
  const [joinError, setJoinError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Guest identity lives only in this device's localStorage — there's no
  // account system for table guests, same as the rest of the public menu.
  // Deliberately client-only: localStorage can't be read during SSR, so
  // this can't be computed before mount.
  useEffect(() => {
    try {
      let id = window.localStorage.getItem(GUEST_ID_KEY);
      if (!id) {
        id = randomGuestId();
        window.localStorage.setItem(GUEST_ID_KEY, id);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
      setGuestId(id);
      setGuestName(window.localStorage.getItem(GUEST_NAME_KEY));
    } catch {
      // localStorage can be blocked (private browsing) — fall back to a
      // session-only guest id so the shared cart still works this visit.
      setGuestId(randomGuestId());
    }
  }, []);

  useEffect(() => {
    if (!guestName) return;
    joinTableCart(restaurantId, tableNumber).then((result) => {
      if (result.sessionId) setSessionId(result.sessionId);
      else setJoinError(true);
    });
  }, [guestName, restaurantId, tableNumber]);

  useEffect(() => {
    if (!sessionId) return;
    const supabase = createClient();

    supabase
      .from("table_cart_items")
      .select("id, guest_id, guest_name, recipe_id, name, price, quantity")
      .eq("table_session_id", sessionId)
      .then(({ data }) => {
        if (data) setCartRows(data as CartRow[]);
      });

    const channel = supabase
      .channel(`table-cart-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "table_cart_items", filter: `table_session_id=eq.${sessionId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setCartRows((prev) => [...prev, payload.new as CartRow]);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as CartRow;
            setCartRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          } else if (payload.eventType === "DELETE") {
            const removedId = (payload.old as { id: string }).id;
            setCartRows((prev) => prev.filter((r) => r.id !== removedId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  function saveGuestName() {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;
    try {
      window.localStorage.setItem(GUEST_NAME_KEY, trimmed);
    } catch {
      // localStorage can be blocked (private browsing) — the name just
      // won't be remembered for next time, this visit still works.
    }
    setGuestName(trimmed);
  }

  async function addItem(item: SharedCartMenuItem) {
    if (!sessionId || !guestId || !guestName) return;
    const supabase = createClient();
    const existing = cartRows.find((r) => r.guest_id === guestId && r.recipe_id === item.id);
    if (existing) {
      await supabase.from("table_cart_items").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
    } else {
      await supabase.from("table_cart_items").insert({
        restaurant_id: restaurantId,
        table_session_id: sessionId,
        guest_id: guestId,
        guest_name: guestName,
        recipe_id: item.id,
        name: item.name,
        price: item.price,
        category: item.category,
        quantity: 1,
      });
    }
  }

  async function removeOne(row: CartRow) {
    const supabase = createClient();
    if (row.quantity > 1) {
      await supabase.from("table_cart_items").update({ quantity: row.quantity - 1 }).eq("id", row.id);
    } else {
      await supabase.from("table_cart_items").delete().eq("id", row.id);
    }
  }

  const grandTotal = useMemo(
    () => cartRows.reduce((sum, r) => sum + r.price * r.quantity, 0),
    [cartRows]
  );
  const byGuest = useMemo(() => {
    const groups = new Map<string, CartRow[]>();
    for (const row of cartRows) {
      const list = groups.get(row.guest_name) ?? [];
      list.push(row);
      groups.set(row.guest_name, list);
    }
    return Array.from(groups.entries());
  }, [cartRows]);

  async function handleSubmit() {
    if (!sessionId || !guestName || !phone.trim()) {
      setSubmitError(t("shared_cart_missing_info"));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const result = await submitTableCart(restaurantId, sessionId, guestName, phone, notes);
    setSubmitting(false);
    if (result.success && result.orderId) {
      setOrderId(result.orderId);
      setShowCheckout(false);
    } else {
      setSubmitError(t("shared_cart_submit_error"));
    }
  }

  if (!guestName) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold">{restaurantName}</h1>
          <p className="mt-2 text-sm text-text-on-ink-dim">
            {t("shared_cart_intro").replace("{table}", tableNumber)}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder={t("shared_cart_name_ph")}
            maxLength={40}
            className="min-h-11 rounded-lg border border-divider bg-transparent px-3 py-2 text-center text-sm outline-none focus:border-brand-green-bright"
          />
          <button
            type="button"
            onClick={saveGuestName}
            disabled={!nameDraft.trim()}
            className="min-h-11 rounded-full bg-brand-green-bright px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {t("shared_cart_join_btn")}
          </button>
        </div>
      </main>
    );
  }

  if (orderId) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
        <span className="text-4xl">✅</span>
        <h1 className="font-display text-2xl font-bold">{restaurantName}</h1>
        <p className="text-sm text-text-on-ink-dim">{t("shared_cart_sent_lead")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6 pb-32">
      <div className="flex items-center gap-3">
        {restaurantLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- public Supabase Storage URL
          <img src={restaurantLogoUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
        )}
        <div>
          <h1 className="font-display text-lg font-bold">{restaurantName}</h1>
          <p className="text-xs text-text-on-ink-dim">
            {t("shared_cart_table_label").replace("{table}", tableNumber)} · {guestName}
          </p>
        </div>
      </div>

      {joinError && <p className="text-sm text-brand-red">{t("shared_cart_join_error")}</p>}

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => addItem(item)}
            disabled={!item.available || !sessionId}
            className="flex flex-col items-start gap-1 rounded-xl border border-divider bg-ink-soft p-3 text-left disabled:opacity-40"
          >
            {item.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- public Supabase Storage URL
              <img src={item.photoUrl} alt="" className="h-20 w-full rounded-lg object-cover" />
            )}
            <span className="text-sm font-semibold">{item.name}</span>
            <span className="text-xs text-text-on-ink-dim">{fmtMoney(item.price, country)}</span>
          </button>
        ))}
      </div>

      {cartRows.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-divider bg-ink p-4">
          <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
            <div className="max-h-40 overflow-y-auto">
              {byGuest.map(([name, rows]) => (
                <div key={name} className="mb-2">
                  <p className="text-xs font-semibold text-text-on-ink-dim">{name}</p>
                  {rows.map((row) => (
                    <div key={row.id} className="flex items-center justify-between py-0.5 text-sm">
                      <span>
                        {row.quantity}× {row.name}
                      </span>
                      <span className="flex items-center gap-2">
                        {fmtMoney(row.price * row.quantity, country)}
                        {row.guest_id === guestId && (
                          <button
                            type="button"
                            onClick={() => removeOne(row)}
                            aria-label="remove one"
                            className="text-text-on-ink-dim hover:text-brand-red"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-divider pt-2 text-sm font-semibold">
              <span>{t("shared_cart_total_label")}</span>
              <span>{fmtMoney(grandTotal, country)}</span>
            </div>
            {!showCheckout ? (
              <button
                type="button"
                onClick={() => setShowCheckout(true)}
                className="min-h-11 rounded-full bg-brand-green-bright px-4 py-2 text-sm font-bold text-ink"
              >
                {t("shared_cart_send_btn")}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("shared_cart_phone_ph")}
                  className="min-h-11 rounded-lg border border-divider bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
                />
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("shared_cart_notes_ph")}
                  className="min-h-11 rounded-lg border border-divider bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
                />
                {submitError && <p className="text-xs text-brand-red">{submitError}</p>}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="min-h-11 rounded-full bg-brand-green-bright px-4 py-2 text-sm font-bold text-ink disabled:opacity-60"
                >
                  {submitting ? "…" : t("shared_cart_confirm_btn")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
