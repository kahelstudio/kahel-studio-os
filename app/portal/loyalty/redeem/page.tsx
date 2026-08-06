export const dynamic = "force-dynamic";

import Link from "next/link";
import { RewardBookingForm } from "@/components/client-portal/reward-booking-form";
import { requireCustomerIdentity } from "@/lib/server/customer-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export default async function RedeemLoyaltyRewardPage() {
  const identity = await requireCustomerIdentity("/portal/loyalty/redeem");
  const { data, error } = await getSupabaseAdmin().from("loyalty_rewards").select("id,sequence")
    .eq("client_id", identity.clientId).eq("status", "available").eq("review_required", false).order("sequence");
  if (error) throw new Error("Unable to load available rewards.");
  const rewards = (data ?? []).map((reward) => ({ id: reward.id, label: `Complimentary Solo Session #${reward.sequence}` }));
  return <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14"><Link href="/portal/loyalty" className="inline-flex min-h-11 items-center text-sm font-semibold text-kahel-700">Back to loyalty rewards</Link><h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Book your free Solo Session</h1><p className="mt-3 text-text-secondary">Choose your preferred schedule. The studio will confirm availability through the normal booking process.</p>{rewards.length ? <RewardBookingForm rewards={rewards} /> : <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-text-secondary">You do not have an available reward to use.</p>}</main>;
}
