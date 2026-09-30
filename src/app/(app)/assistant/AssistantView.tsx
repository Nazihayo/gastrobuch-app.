"use client";

import { useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { askAssistant, type ChatMessage } from "./actions";

export default function AssistantView({ restaurantName }: { restaurantName: string }) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || pending) return;

    setError(null);
    setInput("");
    const nextHistory: ChatMessage[] = [...messages, { role: "user", text: question }];
    setMessages(nextHistory);
    setPending(true);

    const result = await askAssistant(messages, question);
    setPending(false);

    if ("error" in result) {
      setError(result.error === "not_configured" ? t("assistant_not_configured") : t("assistant_error"));
      return;
    }

    setMessages([...nextHistory, { role: "assistant", text: result.reply }]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("assistant_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("assistant_lead")}</p>
      </div>

      <div className="flex min-h-[50vh] flex-col gap-3 rounded-xl border border-divider bg-ink-soft p-4">
        {messages.length === 0 && (
          <p className="text-sm text-text-on-ink-dim">
            {t("assistant_empty_prefix")} {restaurantName}. {t("assistant_empty_suffix")}
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "self-end bg-brand-green-bright text-[#0A1F16]"
                : "self-start bg-ink text-text-on-ink"
            }`}
          >
            {m.text}
          </div>
        ))}
        {pending && (
          <div className="self-start rounded-xl bg-ink px-3 py-2 text-sm text-text-on-ink-dim">
            …
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-sm text-brand-red">{error}</p>}

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("assistant_input_ph")}
          className="min-h-11 flex-1 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="min-h-11 rounded-lg bg-brand-green-bright px-4 text-sm font-bold text-[#0A1F16] disabled:opacity-50"
        >
          {t("assistant_send")}
        </button>
      </form>

      <p className="text-center text-xs text-text-on-ink-dim">{t("assistant_disclaimer")}</p>
    </div>
  );
}
