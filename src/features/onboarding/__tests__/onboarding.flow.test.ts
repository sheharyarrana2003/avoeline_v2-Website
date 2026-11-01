/**
 * Live DB smoke for free → complete and paid → reject → approve.
 * Does not import server-only app modules (uses @supabase/supabase-js directly).
 *
 * Run: npm run test:smoke:onboarding
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const enabled = process.env.SMOKE_ONBOARDING === "1";

describe("onboarding DB smoke (optional)", { skip: !enabled }, () => {
  it("free plan → setup_complete; paid → reject → approve → complete", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.ok(url && key, "Need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");

    const admin = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userId = randomUUID();
    const email = `smoke-onboard-${userId.slice(0, 8)}@avoeline.demo`;
    const password = `Smoke${randomUUID().slice(0, 8)}!aA1`;

    const { error: authErr } = await admin.auth.admin.createUser({
      id: userId,
      email,
      email_confirm: true,
      password,
      user_metadata: { full_name: "Smoke Org", user_type: "organizer" },
    });
    assert.ifError(authErr);

    try {
      const now = new Date().toISOString();
      await admin.from("users").upsert({
        id: userId,
        email,
        full_name: "Smoke Org",
        user_type: "organizer",
        setup_complete: false,
        onboarding_status: "incomplete",
        email_verified: true,
        updated_at: now,
      });

      // --- free path ---
      const { error: freeProfileErr } = await admin.from("organizer_profiles").upsert({
        user_id: userId,
        plan_type: "free",
      });
      assert.ifError(freeProfileErr);

      const { error: freeUserErr } = await admin
        .from("users")
        .update({
          setup_complete: true,
          onboarding_status: "complete",
          pending_plan_key: null,
          updated_at: now,
        })
        .eq("id", userId);
      assert.ifError(freeUserErr);

      const { data: afterFree } = await admin
        .from("users")
        .select("setup_complete, onboarding_status")
        .eq("id", userId)
        .maybeSingle();
      assert.equal(afterFree?.setup_complete, true);
      assert.equal(afterFree?.onboarding_status, "complete");

      // --- paid path ---
      await admin
        .from("users")
        .update({
          setup_complete: false,
          onboarding_status: "incomplete",
          pending_plan_key: null,
          updated_at: now,
        })
        .eq("id", userId);

      const { data: paidPlan } = await admin
        .from("subscription_plans")
        .select("key, price_monthly, currency")
        .eq("audience", "organizer")
        .gt("price_monthly", 0)
        .eq("is_active", true)
        .order("sort_order")
        .limit(1)
        .maybeSingle();
      assert.ok(paidPlan?.key, "Need an active paid organizer plan");

      const { data: payment, error: payErr } = await admin
        .from("payments")
        .insert({
          payer_id: userId,
          purpose: "subscription",
          reference_type: "organizer_plan",
          reference_id: randomUUID(),
          total_amount: Number(paidPlan!.price_monthly),
          currency: paidPlan!.currency || "PKR",
          status: "pending",
          screenshot_url: `subscription/${userId}/smoke.jpg`,
        })
        .select("id")
        .single();
      assert.ifError(payErr);
      assert.ok(payment?.id);

      await admin
        .from("users")
        .update({
          setup_complete: false,
          onboarding_status: "awaiting_payment",
          pending_plan_key: paidPlan!.key,
          updated_at: now,
        })
        .eq("id", userId);

      // reject
      await admin
        .from("payments")
        .update({ status: "failed", updated_at: now })
        .eq("id", payment!.id);
      await admin
        .from("users")
        .update({ onboarding_status: "incomplete", updated_at: now })
        .eq("id", userId);

      const { data: payment2, error: pay2Err } = await admin
        .from("payments")
        .insert({
          payer_id: userId,
          purpose: "subscription",
          reference_type: "organizer_plan",
          reference_id: randomUUID(),
          total_amount: Number(paidPlan!.price_monthly),
          currency: paidPlan!.currency || "PKR",
          status: "pending",
          screenshot_url: `subscription/${userId}/smoke2.jpg`,
        })
        .select("id")
        .single();
      assert.ifError(pay2Err);

      await admin
        .from("users")
        .update({
          onboarding_status: "awaiting_payment",
          pending_plan_key: paidPlan!.key,
          updated_at: now,
        })
        .eq("id", userId);

      // approve (changed_by nullable — no fake owner FK)
      await admin.from("plan_changes").insert({
        organizer_id: userId,
        vendor_id: null,
        from_plan: "free",
        to_plan: paidPlan!.key,
        changed_by: null,
        reason: "Smoke approve",
      });
      await admin.from("organizer_profiles").upsert({
        user_id: userId,
        plan_type: paidPlan!.key,
      });
      await admin
        .from("payments")
        .update({ status: "verified", screenshot_verified: true, updated_at: now })
        .eq("id", payment2!.id);
      await admin
        .from("users")
        .update({
          setup_complete: true,
          onboarding_status: "complete",
          pending_plan_key: null,
          updated_at: now,
        })
        .eq("id", userId);

      const { data: afterApprove } = await admin
        .from("users")
        .select("setup_complete, onboarding_status, pending_plan_key")
        .eq("id", userId)
        .maybeSingle();
      assert.equal(afterApprove?.setup_complete, true);
      assert.equal(afterApprove?.onboarding_status, "complete");
      assert.equal(afterApprove?.pending_plan_key, null);

      const { data: profile } = await admin
        .from("organizer_profiles")
        .select("plan_type")
        .eq("user_id", userId)
        .maybeSingle();
      assert.equal(profile?.plan_type, paidPlan!.key);
    } finally {
      await admin.from("payments").delete().eq("payer_id", userId);
      await admin.from("plan_changes").delete().eq("organizer_id", userId);
      await admin.from("organizer_profiles").delete().eq("user_id", userId);
      await admin.from("users").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  });
});
