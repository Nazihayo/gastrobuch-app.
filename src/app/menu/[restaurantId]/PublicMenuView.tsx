"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { fmtMoney, type CountryCode } from "@/lib/countries";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import LanguageToggle from "@/components/LanguageToggle";
import { submitOrder, type CustomerInfo, type LoyaltyProgress } from "./actions";

const SPEECH_LANG: Record<string, string> = { de: "de-DE", ar: "ar-SA", en: "en-US" };
const LARGE_TEXT_STORAGE_KEY = "gastrohub_menu_large_text";

type SpeechRecognitionResultLike = { transcript: string };
interface MinimalSpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<SpeechRecognitionResultLike>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => MinimalSpeechRecognition;
  webkitSpeechRecognition?: new () => MinimalSpeechRecognition;
};

export type PublicMenuItem = {
  id: string;
  name: string;
  price: number;
  available: boolean;
  photoUrl: string | null;
  category: "food" | "drink";
  dietTag: "vegan" | "vegetarian" | null;
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
  const { t, locale } = useLanguage();
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
  const [plantBasedOnly, setPlantBasedOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [largeText, setLargeText] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);

  const hasPlantBasedItems = items.some((i) => i.dietTag !== null);
  const visibleItems = items.filter((i) => {
    if (plantBasedOnly && i.dietTag === null) return false;
    if (query.trim() && !i.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    // Deliberately client-only: feature support and the saved preference
    // can't be known during SSR, so this can't be computed before mount.
    const win = window as SpeechRecognitionWindow;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMicSupported(Boolean(win.SpeechRecognition || win.webkitSpeechRecognition));
    try {
      setLargeText(localStorage.getItem(LARGE_TEXT_STORAGE_KEY) === "1");
    } catch {
      // localStorage can be blocked (private browsing); large-text just stays off
    }
  }, []);

  useEffect(() => {
    document.documentElement.style.fontSize = largeText ? "115%" : "";
    try {
      localStorage.setItem(LARGE_TEXT_STORAGE_KEY, largeText ? "1" : "0");
    } catch {
      // ignore — see above
    }
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [largeText]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  function handleVoiceSearch() {
    const win = window as SpeechRecognitionWindow;
    const SpeechRecognitionCtor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = SPEECH_LANG[locale] ?? "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) setQuery(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  function toggleReadMenuAloud() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const lines = visibleItems.map(
      (item) => `${item.name}, ${fmtMoney(item.price, country)}`
    );
    const utterance = new SpeechSynthesisUtterance(
      [restaurantName, ...lines].join(". ")
    );
    utterance.lang = SPEECH_LANG[locale] ?? "en-US";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

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
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setLargeText((v) => !v)}
          aria-pressed={largeText}
          aria-label={t("public_menu_large_text")}
          className={`flex min-h-11 items-center gap-1 rounded-full border px-3 text-xs font-semibold ${
            largeText
              ? "border-brand-green-bright text-brand-green-bright"
              : "border-divider text-text-on-ink-dim"
          }`}
        >
          Aa
        </button>
        <LanguageToggle />
      </div>
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

      <div className="flex gap-2">
        <label className="sr-only" htmlFor="menu-search">
          {t("public_menu_search_ph")}
        </label>
        <input
          id="menu-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("public_menu_search_ph")}
          className="min-h-11 w-0 min-w-0 flex-1 rounded-lg border border-divider bg-ink-soft px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
        />
        {micSupported && (
          <button
            type="button"
            onClick={handleVoiceSearch}
            aria-pressed={listening}
            aria-label={t("public_menu_voice_search")}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-lg ${
              listening
                ? "border-brand-green-bright text-brand-green-bright"
                : "border-divider text-text-on-ink-dim"
            }`}
          >
            🎤
          </button>
        )}
        <button
          type="button"
          onClick={toggleReadMenuAloud}
          aria-pressed={speaking}
          aria-label={t("public_menu_read_aloud")}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-lg ${
            speaking
              ? "border-brand-green-bright text-brand-green-bright"
              : "border-divider text-text-on-ink-dim"
          }`}
        >
          {speaking ? "⏹" : "🔊"}
        </button>
      </div>

      {hasPlantBasedItems && (
        <button
          type="button"
          onClick={() => setPlantBasedOnly((v) => !v)}
          className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium ${
            plantBasedOnly
              ? "border-brand-green-bright text-brand-green-bright"
              : "border-divider text-text-on-ink-dim"
          }`}
        >
          🌱 {t("public_menu_plant_based_filter")}
        </button>
      )}

      <div className="flex flex-col gap-2.5">
        {visibleItems.length === 0 && (
          <p className="text-center text-sm text-text-on-ink-dim">
            {t("public_menu_no_results")}
          </p>
        )}
        {visibleItems.map((item) => {
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
                <p className="truncate text-sm font-medium">
                  {item.dietTag === "vegan" ? "🌱 " : item.dietTag === "vegetarian" ? "🥦 " : ""}
                  {item.name || "—"}
                </p>
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
                    aria-label={`${t("public_menu_qty_decrease")} ${item.name}`}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-divider text-lg disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-num text-sm" aria-live="polite">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty(item.id, qty + 1)}
                    aria-label={`${t("public_menu_qty_increase")} ${item.name}`}
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
