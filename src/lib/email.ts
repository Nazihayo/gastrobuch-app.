// A thin wrapper over Resend's HTTP API — plain fetch, no SDK dependency,
// consistent with how this app keeps every optional integration (Stripe,
// Claude, OpenAI) to the smallest possible footprint. Returns false (not
// configured / failed) instead of throwing, so callers can degrade
// gracefully the same way everywhere else in this app does.
export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !to.trim()) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
