import { redirect } from "next/navigation";
import { refreshStripeStatus } from "../stripeActions";

export default async function StripeReturnPage() {
  await refreshStripeStatus();
  redirect("/profile");
}
