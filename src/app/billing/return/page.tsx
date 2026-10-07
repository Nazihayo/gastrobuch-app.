import { redirect } from "next/navigation";
import { refreshSubscriptionStatus } from "../actions";

export default async function BillingReturnPage() {
  await refreshSubscriptionStatus();
  redirect("/");
}
