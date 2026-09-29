import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "@/app/onboarding/OnboardingForm";

// Same form as first-time onboarding, reused for adding an additional
// restaurant — createRestaurant() doesn't care whether this is your first
// membership or your fifth.
export default async function NewRestaurantPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <OnboardingForm />;
}
