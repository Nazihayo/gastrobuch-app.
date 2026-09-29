"use client";

import { useLanguage } from "@/lib/i18n/context";

export default function UndoToast({
  visible,
  label,
  onUndo,
}: {
  visible: boolean;
  label: string;
  onUndo: () => void;
}) {
  const { t } = useLanguage();
  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-md min-h-11 items-center justify-between gap-3 rounded-lg bg-ink-soft px-4 py-3 shadow-lg ring-1 ring-divider">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={onUndo}
        className="min-h-11 shrink-0 px-2 text-sm font-semibold text-brand-green-bright underline"
      >
        {t("undo_button")}
      </button>
    </div>
  );
}
