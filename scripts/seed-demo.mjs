/**
 * Demo tenants + dashboard rows (capped lists for tab smoke).
 * Run:  npm run seed:demo
 *
 * Cap (default 2): DEMO_SEED_CAP=2
 * Password for every demo login (override with DEMO_SEED_PASSWORD):
 *   AvoelineDemo1!
 *
 * Emails: see docs/TESTING.md § Demo seed.
 */
import { createHash, randomBytes } from "crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const PASSWORD = process.env.DEMO_SEED_PASSWORD || "AvoelineDemo1!";
if (PASSWORD.length < 8) {
  console.error("DEMO_SEED_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

const TAG = "avoeline-demo";
const CAP = Math.min(5, Math.max(1, Number(process.env.DEMO_SEED_CAP) || 2));
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
console.log(`Demo seed cap = ${CAP}`);

const FREE = [
  "events_dashboard",
  "ai_planner",
  "analytics_basic",
  "registrations",
  "access_control",
  "sponsors_basic",
  "teams_basic",
];
const ALL = [
  ...FREE,
  "teams_advanced_roles",
  "vendor_store",
  "certificates",
  "api_access",
  "website_builder",
  "ai_designer",
  "ushers_ops",
  "hackathon_ops",
  "sponsors_invoicing_templates",
];

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}
function joinCode(prefix, n) {
  return `${prefix}${String(n).padStart(2, "0")}`.slice(0, 6).toUpperCase();
}
function isoDays(offset, hour = 9) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
function ymd(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
function clock(h) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:00 ${ampm}`;
}
async function throwIf(error, label) {
  if (!error) return;
  throw new Error(`${label}: ${error.message}${error.details ? ` (${error.details})` : ""}`);
}

const userCache = new Map();
async function findAuthId(email) {
  for (let page = 1; page < 30; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser({ email, name, userType, plan, orgName, extra = {} }) {
  email = email.toLowerCase();
  if (userCache.has(email)) return userCache.get(email);
  let id = await findAuthId(email);
  if (id) {
    const { error } = await admin.auth.admin.updateUserById(id, {
      password: PASSWORD,
      email_confirm: true,
      ban_duration: "none",
      user_metadata: { full_name: name },
    });
    await throwIf(error, `auth update ${email}`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: name },
    });
    await throwIf(error, `auth create ${email}`);
    id = data.user.id;
  }
  const now = new Date().toISOString();
  const { error: userErr } = await admin.from("users").upsert({
    id,
    email,
    full_name: name,
    user_type: userType,
    account_status: "active",
    is_owner: false,
    must_reset_password: false,
    setup_complete: true,
    email_verified: true,
    extra: { demo_seed: TAG, ...extra },
    updated_at: now,
  });
  await throwIf(userErr, `users ${email}`);
  if (userType === "organizer") {
    const { error } = await admin.from("organizer_profiles").upsert({
      user_id: id,
      org_name: orgName || name,
      plan_type: plan || "free",
      review_status: "approved",
      is_verified: true,
    });
    await throwIf(error, `organizer_profiles ${email}`);
  }
  if (userType === "vendor") {
    const { error } = await admin.from("vendor_profiles").upsert({
      user_id: id,
      business_name: orgName || name,
      business_email: email,
      status: "approved",
      is_verified: true,
      service_categories: ["catering", "av", "decor", "photography", "security"],
    });
    await throwIf(error, `vendor_profiles ${email}`);
  }
  if (userType === "attendee") {
    const { error } = await admin.from("attendee_profiles").upsert({
      user_id: id,
      university: "University of Management and Technology",
      department: "CS",
      interests: ["hackathons", "ai", "startups"],
    });
    await throwIf(error, `attendee_profiles ${email}`);
  }
  userCache.set(email, id);
  console.log(`✓ ${email} (${userType}${plan ? ` / ${plan}` : ""})`);
  return id;
}

async function ensureOrg({ name, type, ownerId, parentId, email }) {
  const { data: existing } = await admin
    .from("organizations")
    .select("id")
    .eq("name", name)
    .eq("org_type", type)
    .maybeSingle();
  if (existing?.id) {
    await admin
      .from("organizations")
      .update({
        owner_user_id: ownerId,
        parent_org_id: parentId || null,
        contact_email: email,
        is_verified: true,
        is_demo: true,
      })
      .eq("id", existing.id);
    return existing.id;
  }
  const { data, error } = await admin
    .from("organizations")
    .insert({
      name,
      org_type: type,
      owner_user_id: ownerId,
      parent_org_id: parentId || null,
      contact_email: email,
      is_verified: true,
      is_demo: true,
      description: `Demo ${type} for Avoeline walkthroughs.`,
      extra: { demo_seed: TAG },
    })
    .select("id")
    .single();
  await throwIf(error, `org ${name}`);
  return data.id;
}

async function member(orgId, userId, role) {
  const { error } = await admin
    .from("org_memberships")
    .upsert({ org_id: orgId, user_id: userId, role }, { onConflict: "org_id,user_id" });
  await throwIf(error, `membership ${role}`);
}

async function grantModules(orgId, grantedBy, keys) {
  for (const module_key of keys) {
    const { error } = await admin
      .from("org_module_access")
      .upsert(
        { org_id: orgId, module_key, enabled: true, granted_by: grantedBy },
        { onConflict: "org_id,module_key" },
      );
    await throwIf(error, `module ${module_key}`);
  }
}

async function alreadySeededEvents(organizerId) {
  const { data } = await admin
    .from("events")
    .select("id,title,event_format_id")
    .eq("organizer_id", organizerId)
    .eq("extra->>demo_seed", TAG);
  return data ?? [];
}

function eventPayload({
  organizerId,
  orgId,
  title,
  formatId,
  superId,
  daysFrom,
  lengthDays = 1,
  isHackathon = false,
  isFree = true,
}) {
  const start = ymd(daysFrom);
  const end = ymd(daysFrom + lengthDays);
  return {
    organizer_id: organizerId,
    org_id: orgId || null,
    title,
    short_description: `${title} — demo listing for walkthroughs.`,
    description: `<p>${title} is seeded demo data. Use it to click through dashboards, staff, attendees, and (if a hackathon) competitions.</p>`,
    status: "published",
    visibility: "public",
    super_category_id: superId,
    event_format_id: formatId,
    category: superId,
    format: "physical",
    city: "Lahore",
    country: "Pakistan",
    venue_name: "UMT Campus",
    address: "C-II Johar Town, Lahore",
    start_date: start,
    end_date: end,
    start_time: clock(9),
    end_time: clock(17),
    timezone: "Asia/Karachi",
    total_seats: 120,
    available_seats: 100,
    is_free: isFree,
    currency: "PKR",
    requires_approval: false,
    requires_registration: true,
    published_at: new Date().toISOString(),
    is_demo: true,
    extra: {
      demo_seed: TAG,
      isHackathon,
      schedule: {
        startDate: start,
        endDate: end,
        startTime: clock(9),
        endTime: clock(17),
        timezone: "Asia/Karachi",
      },
    },
  };
}

async function seedListRows(eventId, organizerId, attendees) {
  const speakerPool = [
    "Ayesha Malik",
    "Dr. Imran Qureshi",
    "Sara Khan",
    "Bilal Ahmed",
    "Nadia Raza",
  ];
  const rolePool = ["Keynote", "Judge", "Mentor", "Panelist", "MC"];
  const speakers = speakerPool.slice(0, CAP);
  const regs = attendees.slice(0, CAP);
  const { count: speakerCount } = await admin
    .from("event_speakers")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  if ((speakerCount ?? 0) === 0) {
    const { error: spErr } = await admin.from("event_speakers").insert(
      speakers.map((name, i) => ({
        event_id: eventId,
        name,
        designation: rolePool[i] || "Speaker",
        company: "Avoeline Demo",
        email: `speaker${i + 1}@avoeline.demo`,
        session_title: `Session ${i + 1}`,
        extra: { demo_seed: TAG },
      })),
    );
    await throwIf(spErr, "speakers");
  }

  const { count: agendaCount } = await admin
    .from("event_agenda_items")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  if ((agendaCount ?? 0) === 0) {
    const { error: agErr } = await admin.from("event_agenda_items").insert(
      speakers.map((name, i) => ({
        event_id: eventId,
        title: `Block ${i + 1}: ${name}`,
        item_type: i === 0 ? "keynote" : "session",
        session_date: ymd(10),
        start_clock: clock(9 + i),
        end_clock: clock(10 + i),
        location: `Hall ${i + 1}`,
        speaker_names: [name],
        extra: { demo_seed: TAG },
      })),
    );
    await throwIf(agErr, "agenda");
  }

  const { count: regCount } = await admin
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  if ((regCount ?? 0) === 0 && regs.length) {
    const { error: regErr } = await admin.from("registrations").insert(
      regs.map((a, i) => ({
        event_id: eventId,
        organizer_id: organizerId,
        attendee_name: a.name,
        attendee_email: a.email,
        user_id: a.id,
        status:
          i === regs.length - 1 && regs.length > 1
            ? "waitlisted"
            : i === 0 && regs.length > 1
              ? "checked_in"
              : "registered",
        payment_status: "free",
        extra: { demo_seed: TAG },
      })),
    );
    await throwIf(regErr, "registrations");
  }
}

async function seedSponsors(eventId) {
  const { count } = await admin
    .from("event_sponsors_partners")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  if ((count ?? 0) > 0) return;
  const names = ["Nestle", "Jazz", "Systems Ltd", "Careem", "Habib Bank"].slice(0, CAP);
  const { error } = await admin.from("event_sponsors_partners").insert(
    names.map((name, i) => ({
      event_id: eventId,
      name,
      type: i === 0 ? "sponsor" : "partner",
      role: i === 0 ? "sponsor" : "collaborator",
      extra: { demo_seed: TAG },
    })),
  );
  if (error && !/column|kind|name/i.test(error.message)) await throwIf(error, "sponsors");
}

function slugifyId(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function ensureBaseCategories() {
  const supers = ["Technology", "Corporate", "Education"];
  const formats = ["Seminar", "Workshop", "Conference", "Hackathon", "Networking Mixer"];
  const now = new Date().toISOString();
  const rows = [
    ...supers.map((name) => ({
      id: slugifyId(name),
      category_type: "super_category",
      name,
      description: `Demo super category ${name}.`,
      active: true,
      checklist: [],
      created_at: now,
      updated_at: now,
      extra: { status: "approved", demo_seed: TAG },
    })),
    ...formats.map((name) => ({
      id: slugifyId(name),
      category_type: "event_format",
      name,
      description: `Demo format ${name}.`,
      active: true,
      checklist: [],
      created_at: now,
      updated_at: now,
      extra: { status: "approved", demo_seed: TAG },
    })),
  ];
  const { error } = await admin.from("event_categories").upsert(rows, { onConflict: "id" });
  await throwIf(error, "event_categories");
  console.log("✓ event_categories (super + formats used by demo events)");
}

async function ensureBasePlans() {
  const rows = [
    {
      key: "free",
      name: "Free",
      description: "Core event tools.",
      price_monthly: 0,
      price_yearly: 0,
      currency: "PKR",
      is_active: true,
      sort_order: 0,
      included_modules: FREE,
      audience: "organizer",
    },
    {
      key: "pro",
      name: "Pro",
      description: "Hackathon + marketplace + certs.",
      price_monthly: 4999,
      price_yearly: 49999,
      currency: "PKR",
      is_active: true,
      sort_order: 10,
      included_modules: [
        ...FREE,
        "hackathon_ops",
        "teams_advanced_roles",
        "vendor_store",
        "certificates",
      ],
      audience: "organizer",
    },
    {
      key: "enterprise",
      name: "Enterprise",
      description: "All organizer modules.",
      price_monthly: 14999,
      price_yearly: 149999,
      currency: "PKR",
      is_active: true,
      sort_order: 20,
      included_modules: ALL,
      audience: "organizer",
    },
    {
      key: "vendor_free",
      name: "Vendor Free",
      description: "Basic marketplace listing and quotes.",
      price_monthly: 0,
      price_yearly: 0,
      currency: "PKR",
      is_active: true,
      sort_order: 0,
      included_modules: ["vendor_dashboard", "vendor_quotes", "vendor_services", "vendor_bookings"],
      audience: "vendor",
    },
    {
      key: "vendor_pro",
      name: "Vendor Pro",
      description: "Portfolio highlights and analytics.",
      price_monthly: 2999,
      price_yearly: 29999,
      currency: "PKR",
      is_active: true,
      sort_order: 10,
      included_modules: [
        "vendor_dashboard",
        "vendor_quotes",
        "vendor_services",
        "vendor_bookings",
        "vendor_portfolio",
        "vendor_event_marketing",
        "vendor_analytics",
      ],
      audience: "vendor",
    },
  ];
  const { error } = await admin.from("subscription_plans").upsert(rows, { onConflict: "key" });
  await throwIf(error, "subscription_plans");
  console.log("✓ subscription_plans (free/pro/enterprise + vendor)");
}

async function main() {
  console.log("Seeding demo tenants… password is not printed. See docs/TESTING.md.");
  await ensureBasePlans();
  await ensureBaseCategories();

  const staffId = await ensureUser({
    email: "staff.demo@avoeline.demo",
    name: "Platform Staff Demo",
    userType: "platform_admin",
    extra: { role: "staff" },
  });
  await admin
    .from("users")
    .update({
      is_owner: false,
      admin_permissions: ["organizers", "events", "vendors", "support", "categories"],
    })
    .eq("id", staffId);

  const depts = [];
  const deptPlans = ["enterprise", "pro", "free", "pro", "enterprise"].slice(0, CAP);
  const deptNames = [
    "Faculty of Computing",
    "Faculty of Business",
    "School of Media",
    "Faculty of Engineering",
    "Office of Student Affairs",
  ].slice(0, CAP);
  for (let i = 0; i < CAP; i++) {
    const email = `dept${i + 1}@avoeline.demo`;
    const id = await ensureUser({
      email,
      name: `${deptNames[i]} Admin`,
      userType: "organizer",
      plan: deptPlans[i],
      orgName: deptNames[i],
    });
    const orgId = await ensureOrg({ name: deptNames[i], type: "department", ownerId: id, email });
    await member(orgId, id, "department_admin");
    await admin
      .from("organizer_profiles")
      .update({ org_id: orgId, org_name: deptNames[i], plan_type: deptPlans[i] })
      .eq("user_id", id);
    depts.push({ id, orgId, email, name: deptNames[i], plan: deptPlans[i] });
    const keys =
      deptPlans[i] === "enterprise"
        ? ALL
        : deptPlans[i] === "pro"
          ? [...FREE, "hackathon_ops", "teams_advanced_roles", "vendor_store", "certificates"]
          : FREE;
    for (const module_key of keys) {
      const { data: existingOv } = await admin
        .from("feature_overrides")
        .select("id")
        .eq("organizer_id", id)
        .eq("module_key", module_key)
        .maybeSingle();
      if (existingOv?.id) continue;
      await admin.from("feature_overrides").insert({
        organizer_id: id,
        module_key,
        denied: false,
        reason: "demo seed",
      });
    }
  }

  const clubNames = [
    "UMT Ushers Demo",
    "IEEE Student Branch",
    "Dramatics Club",
    "Entrepreneurship Society",
    "Sports Society",
  ].slice(0, CAP);
  const clubs = [];
  for (let i = 0; i < CAP; i++) {
    const parent = depts[Math.min(i, depts.length - 1)];
    const email = `club${i + 1}@avoeline.demo`;
    const id = await ensureUser({
      email,
      name: `${clubNames[i]} President`,
      userType: "organizer",
      plan: parent.plan,
      orgName: clubNames[i],
    });
    const orgId = await ensureOrg({
      name: clubNames[i],
      type: "club",
      ownerId: id,
      parentId: parent.orgId,
      email,
    });
    await member(orgId, id, "president");
    await admin
      .from("organizer_profiles")
      .update({ org_id: orgId, org_name: clubNames[i], plan_type: parent.plan })
      .eq("user_id", id);
    const modules =
      i === 0 ? ALL : [...FREE, "hackathon_ops", "teams_advanced_roles", "vendor_store"];
    await grantModules(orgId, parent.id, modules);
    clubs.push({ id, orgId, email, name: clubNames[i], parent });
  }

  const orgSpecs = [
    {
      email: "org.free@avoeline.demo",
      name: "Free Plan Organizer",
      plan: "free",
      org: "Lahore Meetup Co",
    },
    {
      email: "org.enterprise@avoeline.demo",
      name: "Enterprise Organizer",
      plan: "enterprise",
      org: "Avoeline Labs",
    },
    {
      email: "org.pro@avoeline.demo",
      name: "Pro Plan Organizer",
      plan: "pro",
      org: "Pro Events Studio",
    },
    {
      email: "org.campus@avoeline.demo",
      name: "Campus Organizer",
      plan: "pro",
      org: "Campus Live",
    },
    {
      email: "org.basic@avoeline.demo",
      name: "Starter Organizer",
      plan: "free",
      org: "Basic Gatherings",
    },
  ].slice(0, CAP);
  // Always keep enterprise hero when CAP>=2 so hackathon tabs are testable.
  if (CAP >= 2 && !orgSpecs.some((o) => o.plan === "enterprise")) {
    orgSpecs[1] = {
      email: "org.enterprise@avoeline.demo",
      name: "Enterprise Organizer",
      plan: "enterprise",
      org: "Avoeline Labs",
    };
  }
  const orgs = [];
  for (const spec of orgSpecs) {
    const id = await ensureUser({
      email: spec.email,
      name: spec.name,
      userType: "organizer",
      plan: spec.plan,
      orgName: spec.org,
    });
    orgs.push({ ...spec, id });
    const keys =
      spec.plan === "enterprise"
        ? ALL
        : spec.plan === "pro"
          ? [...FREE, "hackathon_ops", "teams_advanced_roles", "vendor_store", "certificates"]
          : FREE;
    for (const module_key of keys) {
      const { data: existingOv } = await admin
        .from("feature_overrides")
        .select("id")
        .eq("organizer_id", id)
        .eq("module_key", module_key)
        .maybeSingle();
      if (existingOv?.id) continue;
      await admin.from("feature_overrides").insert({
        organizer_id: id,
        module_key,
        denied: false,
        reason: "demo seed",
      });
    }
  }

  const vendorSpecs = [
    { email: "vendor.catering@avoeline.demo", name: "Spice Route Catering", cat: "catering" },
    { email: "vendor.av@avoeline.demo", name: "StageLight AV", cat: "av" },
    { email: "vendor.photo@avoeline.demo", name: "LensCraft Studio", cat: "photography" },
    { email: "vendor.decor@avoeline.demo", name: "Bloom Decor", cat: "decor" },
    { email: "vendor.security@avoeline.demo", name: "SafeGate Security", cat: "security" },
  ].slice(0, CAP);
  const vendors = [];
  for (const spec of vendorSpecs) {
    const id = await ensureUser({
      email: spec.email,
      name: spec.name,
      userType: "vendor",
      orgName: spec.name,
    });
    vendors.push({ ...spec, id });
  }

  const attendees = [];
  for (let i = 1; i <= CAP; i++) {
    const email = `attendee${i}@avoeline.demo`;
    const id = await ensureUser({
      email,
      name: `Demo Attendee ${i}`,
      userType: "attendee",
    });
    attendees.push({ id, email, name: `Demo Attendee ${i}` });
  }

  for (const v of vendors) {
    const { data: existing } = await admin
      .from("vendor_services")
      .select("id")
      .eq("vendor_id", v.id);
    if ((existing ?? []).length >= CAP) continue;
    const { error } = await admin.from("vendor_services").insert(
      Array.from({ length: CAP }, (_, idx) => idx + 1).map((n) => ({
        vendor_id: v.id,
        name: `${v.name} Package ${n}`,
        category: v.cat,
        price: 25000 * n,
        description: `Demo service package ${n} from ${v.name}.`,
        inclusions: ["Setup", "On-site staff", "Teardown"],
        extra: { demo_seed: TAG },
      })),
    );
    await throwIf(error, `services ${v.email}`);
  }

  const hero = orgs.find((o) => o.plan === "enterprise") || orgs[0];
  if (!hero) throw new Error("No organizer seeded — need at least one org.");
  const existingHero = await alreadySeededEvents(hero.id);
  // Paid + hackathon cover most organizer event tabs with CAP=2.
  const titles = [
    {
      title: "Avoeline Product Summit",
      format: "conference",
      super: "technology",
      days: 20,
      hack: false,
    },
    {
      title: "Demo Spring Hackathon",
      format: "hackathon",
      super: "technology",
      days: 3,
      hack: true,
      length: 2,
    },
    {
      title: "Women in Tech Mixer",
      format: "networking-mixer",
      super: "corporate",
      days: 14,
      hack: false,
    },
    { title: "AI Workshop Series", format: "workshop", super: "education", days: 7, hack: false },
    {
      title: "Campus CTF Night",
      format: "hackathon",
      super: "technology",
      days: -2,
      hack: true,
      length: 1,
    },
  ].slice(0, CAP);
  const created = [];
  for (const t of titles) {
    const already = existingHero.find((e) => e.title === t.title);
    if (already) {
      created.push({ ...t, id: already.id });
      await seedListRows(already.id, hero.id, attendees);
      continue;
    }
    const { data, error } = await admin
      .from("events")
      .insert(
        eventPayload({
          organizerId: hero.id,
          title: t.title,
          formatId: t.format,
          superId: t.super,
          daysFrom: t.days,
          lengthDays: t.length ?? 0,
          isHackathon: t.hack,
          isFree: !t.hack,
        }),
      )
      .select("id")
      .single();
    await throwIf(error, `event ${t.title}`);
    created.push({ ...t, id: data.id });
    await seedListRows(data.id, hero.id, attendees);
  }

  const paid = created.find((e) => e.title === "Avoeline Product Summit");
  if (paid) {
    const { count: tierCount } = await admin
      .from("ticket_tiers")
      .select("id", { count: "exact", head: true })
      .eq("event_id", paid.id);
    if ((tierCount ?? 0) === 0) {
      const tierNames = ["Early bird", "General", "Student", "VIP", "Group"].slice(0, CAP);
      const tierPrices = [1500, 2500, 800, 8000, 2000].slice(0, CAP);
      await admin.from("ticket_tiers").insert(
        tierNames.map((name, i) => ({
          event_id: paid.id,
          name,
          price: tierPrices[i],
          seats_available: 40,
          active: true,
          extra: { demo_seed: TAG },
        })),
      );
    }
    await seedSponsors(paid.id);
  }

  const hack =
    created.find((e) => e.title === "Demo Spring Hackathon") || created.find((e) => e.hack);
  if (hack) {
    const trackSpecs = [
      { name: "Cyber CTF", kind: "ctf" },
      { name: "Business Innovation", kind: "business" },
      { name: "Web Dev Sprint", kind: "web_dev" },
      { name: "Design Jam", kind: "design" },
      { name: "Data Challenge", kind: "data" },
    ].slice(0, CAP);
    const { data: existingTracks } = await admin
      .from("hackathon_tracks")
      .select("id, name, extra")
      .eq("event_id", hack.id);
    let tracks = (existingTracks ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.extra?.kind || "other",
    }));
    if (tracks.length < CAP) {
      for (const spec of trackSpecs) {
        if (tracks.some((t) => t.name === spec.name)) continue;
        const { data, error } = await admin
          .from("hackathon_tracks")
          .insert({
            event_id: hack.id,
            organizer_id: hero.id,
            name: spec.name,
            kind: spec.kind,
            description: `${spec.name} demo track.`,
            instructions: `Demo instructions for ${spec.name}. Follow phase deadlines and submit before the competition closes.`,
            rules_text: "Be respectful. No sharing flags. One account per team.",
            fee: 0,
            currency: "PKR",
            min_team_size: 1,
            max_team_size: 4,
            extra: { kind: spec.kind, demo_seed: TAG },
          })
          .select("id")
          .single();
        await throwIf(error, `track ${spec.name}`);
        tracks.push({ ...spec, id: data.id });
        await admin.from("hackathon_config").upsert(
          [
            { track_id: data.id, config_key: "live_scoreboard", enabled: true, config_value: {} },
            { track_id: data.id, config_key: "phased_structure", enabled: true, config_value: {} },
            {
              track_id: data.id,
              config_key: "ctf_flags",
              enabled: spec.kind === "ctf",
              config_value: {},
            },
          ],
          { onConflict: "track_id,config_key" },
        );
      }
    }
    const ctf = tracks.find((t) => t.kind === "ctf") || tracks[0];
    const { data: existingPhases } = await admin
      .from("hackathon_phases")
      .select("id")
      .eq("event_id", hack.id)
      .limit(1);
    let phaseId = existingPhases?.[0]?.id ?? null;
    if (!phaseId) {
      const { data: phase, error: phErr } = await admin
        .from("hackathon_phases")
        .insert({
          event_id: hack.id,
          track_id: ctf.id,
          name: "Qualifier",
          sort_order: 1,
          order_index: 1,
          opens_at: isoDays(-1),
          closes_at: isoDays(20),
          extra: { demo_seed: TAG },
        })
        .select("id")
        .single();
      await throwIf(phErr, "phase");
      phaseId = phase.id;
    }
    const { count: taskCount } = await admin
      .from("hackathon_tasks")
      .select("id", { count: "exact", head: true })
      .eq("track_id", ctf.id);
    if ((taskCount ?? 0) === 0 && phaseId) {
      const taskTitles = ["Warmup", "Web 101", "Forensics", "Crypto", "Pwn"].slice(0, CAP);
      const { error: taskErr } = await admin.from("hackathon_tasks").insert(
        taskTitles.map((title, i) => ({
          track_id: ctf.id,
          phase_id: phaseId,
          title,
          category: "demo",
          points: 100 * (i + 1),
          description: `Demo CTF task ${title}. Submit the correct flag on the server (not shown in this description).`,
          flag_hash: sha256(`FLAG{demo${i + 1}}`),
        })),
      );
      await throwIf(taskErr, "tasks");
    }

    // Repair pass: keep re-runs usable for compete/settings smoke.
    await admin.from("hackathon_settings").upsert(
      {
        event_id: hack.id,
        max_attachment_mb: 10,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" },
    );
    for (const t of tracks) {
      await admin
        .from("hackathon_tracks")
        .update({
          kind: t.kind === "ctf" ? "ctf" : "other",
          instructions: `Rules & instructions for ${t.name}. Be respectful. No sharing flags. One account per team. Follow phase deadlines.`,
          rules_text: `Rules & instructions for ${t.name}. Be respectful. No sharing flags. One account per team. Follow phase deadlines.`,
          opens_at: null,
          closes_at: null,
          roster_locks_at: null,
          submission_deadline_at: null,
        })
        .eq("id", t.id);
    }
    if (ctf?.id) {
      await admin.from("hackathon_config").upsert(
        [
          {
            event_id: hack.id,
            track_id: ctf.id,
            config_key: "per_task_timer",
            enabled: true,
            config_value: { latePolicy: "late" },
          },
          {
            event_id: hack.id,
            track_id: ctf.id,
            config_key: "anti_cheat_tab_close",
            enabled: true,
            config_value: {},
          },
          {
            event_id: hack.id,
            track_id: ctf.id,
            config_key: "hackathon_timer",
            enabled: true,
            config_value: {},
          },
        ],
        { onConflict: "track_id,config_key" },
      );
      await admin
        .from("hackathon_tasks")
        .update({ time_limit_minutes: 30 })
        .eq("track_id", ctf.id)
        .eq("title", "Warmup");
    }

    const { count: teamCount } = await admin
      .from("hackathon_teams")
      .select("id", { count: "exact", head: true })
      .eq("event_id", hack.id);
    if ((teamCount ?? 0) === 0) {
      const teamNames = ["Alpha", "Bravo", "Charlie", "Delta", "Echo"];
      const nTeams = Math.min(CAP, tracks.length, attendees.length);
      for (let i = 0; i < nTeams; i++) {
        const track = tracks[i];
        const lead = attendees[i];
        const { data: team, error: tErr } = await admin
          .from("hackathon_teams")
          .insert({
            event_id: hack.id,
            track_id: track.id,
            name: `Team ${teamNames[i]}`,
            join_code: joinCode("HT", i + 1),
            fee_status: "fee_paid",
            access_code_hash: sha256(`AV-DEMO00${i + 1}`),
            extra: { demo_seed: TAG, accessCode: `AV-DEMO00${i + 1}` },
          })
          .select("id")
          .single();
        await throwIf(tErr, "hackathon team");
        const { data: reg } = await admin
          .from("registrations")
          .select("id")
          .eq("event_id", hack.id)
          .eq("user_id", lead.id)
          .maybeSingle();
        if (reg?.id) {
          await admin.from("hackathon_team_members").insert({
            hackathon_team_id: team.id,
            registration_id: reg.id,
            user_id: lead.id,
            name: lead.name,
            email: lead.email,
            is_owner: true,
            status: "active",
          });
          await admin
            .from("hackathon_teams")
            .update({ member_registration_ids: [reg.id] })
            .eq("id", team.id);
          await admin
            .from("registrations")
            .update({
              status: "registered",
              extra: { demo_seed: TAG, hackathonTeamId: team.id, hackathonTrackId: track.id },
            })
            .eq("id", reg.id);
        }
      }
    }
  }

  for (const o of orgs) {
    if (o.plan === "enterprise") continue;
    const existing = await alreadySeededEvents(o.id);
    if (existing.length >= 1) continue;
    const title = `${o.org} Showcase`;
    const { data, error } = await admin
      .from("events")
      .insert(
        eventPayload({
          organizerId: o.id,
          title,
          formatId: "workshop",
          superId: "corporate",
          daysFrom: 21,
        }),
      )
      .select("id")
      .single();
    await throwIf(error, title);
    await seedListRows(data.id, o.id, attendees);
  }

  const { data: staffTeams } = await admin
    .from("teams")
    .select("id, name")
    .eq("organizer_id", hero.id)
    .eq("context_type", "event_staff");
  if (!(staffTeams ?? []).some((t) => t.name === "Ops Desk Demo")) {
    const { data: team, error } = await admin
      .from("teams")
      .insert({
        name: "Ops Desk Demo",
        context_type: "event_staff",
        organizer_id: hero.id,
        created_by: hero.id,
        join_code: joinCode("OPS", 1),
      })
      .select("id")
      .single();
    await throwIf(error, "staff team");
    await admin.from("team_members").insert([
      { team_id: team.id, user_id: hero.id, role: "lead", display_name: "Enterprise Organizer" },
      ...attendees.slice(0, Math.max(1, CAP - 1)).map((a) => ({
        team_id: team.id,
        user_id: a.id,
        role: "member",
        display_name: a.name,
        email: a.email,
      })),
    ]);
    const { data: evs } = await admin
      .from("events")
      .select("id")
      .eq("organizer_id", hero.id)
      .eq("extra->>demo_seed", TAG)
      .limit(CAP);
    for (const ev of evs ?? []) {
      await admin
        .from("event_staff_assignments")
        .upsert(
          { event_id: ev.id, team_id: team.id, member_ids: [] },
          { onConflict: "event_id,team_id" },
        );
    }
  }

  // Competition-lead ACL fixture: Cyber CTF–scoped position on Ops Desk Demo
  {
    const { data: opsTeam } = await admin
      .from("teams")
      .select("id")
      .eq("organizer_id", hero.id)
      .eq("name", "Ops Desk Demo")
      .maybeSingle();
    const { data: hackEv } = await admin
      .from("events")
      .select("id")
      .eq("organizer_id", hero.id)
      .eq("title", "Demo Spring Hackathon")
      .eq("extra->>demo_seed", TAG)
      .maybeSingle();
    if (opsTeam?.id && hackEv?.id) {
      const { data: ctfTrack } = await admin
        .from("hackathon_tracks")
        .select("id")
        .eq("event_id", hackEv.id)
        .eq("name", "Cyber CTF")
        .maybeSingle();
      if (ctfTrack?.id) {
        const { data: existingPos } = await admin
          .from("team_positions")
          .select("id")
          .eq("team_id", opsTeam.id)
          .eq("title", "Cyber CTF Lead")
          .maybeSingle();
        let positionId = existingPos?.id;
        if (!positionId) {
          const { data: created, error: posErr } = await admin
            .from("team_positions")
            .insert({
              team_id: opsTeam.id,
              title: "Cyber CTF Lead",
              permissions: ["hackathon:manage", "hackathon:judge", "exports:run"],
              extra: { trackIds: [ctfTrack.id], demo_seed: TAG },
            })
            .select("id")
            .single();
          await throwIf(posErr, "Cyber CTF Lead position");
          positionId = created.id;
        } else {
          await admin
            .from("team_positions")
            .update({
              permissions: ["hackathon:manage", "hackathon:judge", "exports:run"],
              extra: { trackIds: [ctfTrack.id], demo_seed: TAG },
            })
            .eq("id", positionId);
        }
        const leadEmail = attendees[0]?.email;
        if (leadEmail && positionId) {
          const { data: leadUser } = await admin
            .from("users")
            .select("id")
            .eq("email", leadEmail)
            .maybeSingle();
          if (leadUser?.id) {
            await admin
              .from("team_members")
              .update({ position_id: positionId })
              .eq("team_id", opsTeam.id)
              .eq("user_id", leadUser.id);
          }
        }
      }
    }
  }

  const clubHero = clubs[0];
  const { data: clubTeams } = await admin.from("teams").select("id").eq("org_id", clubHero.orgId);
  if ((clubTeams ?? []).length < 1) {
    const { data: team, error } = await admin
      .from("teams")
      .insert({
        name: "Executive Board",
        context_type: "club_committee",
        org_id: clubHero.orgId,
        organizer_id: clubHero.id,
        created_by: clubHero.id,
        join_code: joinCode("CLB", 1),
      })
      .select("id")
      .single();
    await throwIf(error, "club team");
    await admin.from("team_members").insert(
      [clubHero, ...clubs.slice(1)].slice(0, CAP).map((c, i) => ({
        team_id: team.id,
        user_id: c.id,
        role: i === 0 ? "lead" : "member",
        display_name: c.name,
      })),
    );
  }

  const clubEvents = await alreadySeededEvents(clubHero.id);
  if (clubEvents.length < CAP) {
    for (const title of ["Ushers Orientation", "Blood Drive Volunteer Day"].slice(0, CAP)) {
      if (clubEvents.some((e) => e.title === title)) continue;
      const { data, error } = await admin
        .from("events")
        .insert(
          eventPayload({
            organizerId: clubHero.id,
            orgId: clubHero.orgId,
            title,
            formatId: "workshop",
            superId: "education",
            daysFrom: 12,
          }),
        )
        .select("id")
        .single();
      await throwIf(error, title);
      await seedListRows(data.id, clubHero.id, attendees);
    }
  }

  const deptEvents = await alreadySeededEvents(depts[0].id);
  if (deptEvents.length < 1) {
    const { data, error } = await admin
      .from("events")
      .insert(
        eventPayload({
          organizerId: depts[0].id,
          orgId: depts[0].orgId,
          title: "Faculty Open House",
          formatId: "seminar",
          superId: "education",
          daysFrom: 18,
        }),
      )
      .select("id")
      .single();
    await throwIf(error, "dept event");
    await seedListRows(data.id, depts[0].id, attendees);
  }
  if (CAP >= 2 && depts[1] && (await alreadySeededEvents(depts[1].id)).length < 1) {
    const { data, error } = await admin
      .from("events")
      .insert(
        eventPayload({
          organizerId: depts[1].id,
          orgId: depts[1].orgId,
          title: "Business Career Fair",
          formatId: "seminar",
          superId: "corporate",
          daysFrom: 25,
        }),
      )
      .select("id")
      .single();
    await throwIf(error, "dept2 event");
    await seedListRows(data.id, depts[1].id, attendees);
  }

  const { count: annCount } = await admin
    .from("org_announcements")
    .select("id", { count: "exact", head: true })
    .eq("org_id", depts[0].orgId);
  if ((annCount ?? 0) === 0) {
    await admin.from("org_announcements").insert({
      org_id: depts[0].orgId,
      title: "Budget freeze lifted",
      body: "Demo announcement: clubs may submit event budgets again.",
      created_by: depts[0].id,
      broadcast_to_all: true,
    });
  }

  const { count: reqCount } = await admin
    .from("org_requests")
    .select("id", { count: "exact", head: true })
    .eq("org_id", clubHero.orgId);
  if ((reqCount ?? 0) === 0) {
    await admin.from("org_requests").insert({
      org_id: clubHero.orgId,
      request_type: "budget",
      title: "Orientation banners",
      details: "Need PKR 25,000 for print.",
      requested_amount: 25000,
      status: "pending",
      requested_by: clubHero.id,
    });
  }

  const { data: heroEvents } = await admin
    .from("events")
    .select("id")
    .eq("organizer_id", hero.id)
    .limit(1);
  const eventForQuote = heroEvents?.[0]?.id;
  if (eventForQuote) {
    const { data: existingBookings } = await admin
      .from("bookings")
      .select("id")
      .eq("organizer_id", hero.id);
    if ((existingBookings ?? []).length < CAP) {
      const statuses = [
        "quote_requested",
        "quote_sent",
        "quote_accepted",
        "confirmed",
        "completed",
      ];
      const { error } = await admin.from("bookings").insert(
        vendors.slice(0, CAP).map((v, i) => ({
          event_id: eventForQuote,
          organizer_id: hero.id,
          vendor_id: v.id,
          status: statuses[i] || "quote_requested",
          service_type: v.cat,
          total_amount: 40000 + i * 5000,
          currency: "PKR",
          quote: { amount: 40000 + i * 5000, note: "Demo quote" },
          extra: { demo_seed: TAG },
        })),
      );
      await throwIf(error, "bookings");
    }
  }

  for (const [i, a] of attendees.entries()) {
    const { count: nCount } = await admin
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", a.id)
      .eq("extra->>demo_seed", TAG);
    if ((nCount ?? 0) > 0) continue;
    await admin.from("notifications").insert({
      user_id: a.id,
      title: "You're registered",
      message: "Demo notification for your test ticket.",
      type: "registration",
      status: i === 0 ? "unread" : "read",
      extra: { demo_seed: TAG },
    });
  }

  console.log(
    `Done (cap=${CAP}). Logins in docs/TESTING.md §0b. Password: DEMO_SEED_PASSWORD (default AvoelineDemo1!).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
