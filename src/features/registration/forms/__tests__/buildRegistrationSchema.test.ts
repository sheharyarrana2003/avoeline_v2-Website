import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRegistrationSchema, buildMemberRegistrationSchema } from "../buildRegistrationSchema";
import type { FormFieldDraft } from "../formFields.types";

const baseFields: FormFieldDraft[] = [
  {
    key: "name",
    label: "Full name",
    type: "text",
    required: true,
    options: [],
    scope: "per_member",
  },
  { key: "email", label: "Email", type: "email", required: true, options: [], scope: "per_member" },
  {
    key: "phone",
    label: "Phone",
    type: "phone",
    required: false,
    options: [],
    scope: "per_member",
  },
  {
    key: "diet",
    label: "Diet",
    type: "dropdown",
    required: true,
    options: ["Vegan", "Halal"],
    scope: "per_member",
  },
];

test("accepts valid answers with empty honeypot", () => {
  const schema = buildRegistrationSchema(baseFields);
  const parsed = schema.safeParse({
    name: "Ayesha Khan",
    email: "a@example.com",
    phone: "+92 300 1234567",
    diet: "Halal",
    website: "",
  });
  assert.equal(parsed.success, true);
});

test("rejects filled honeypot", () => {
  const schema = buildRegistrationSchema(baseFields);
  const parsed = schema.safeParse({
    name: "Ayesha Khan",
    email: "a@example.com",
    diet: "Halal",
    website: "http://spam.example",
  });
  assert.equal(parsed.success, false);
});

test("rejects missing required email", () => {
  const schema = buildRegistrationSchema(baseFields);
  const parsed = schema.safeParse({
    name: "Ayesha",
    email: "",
    diet: "Vegan",
  });
  assert.equal(parsed.success, false);
});

test("rejects invalid dropdown option", () => {
  const schema = buildRegistrationSchema(baseFields);
  const parsed = schema.safeParse({
    name: "Ayesha",
    email: "a@example.com",
    diet: "Anything",
  });
  assert.equal(parsed.success, false);
});

test("file field requires path object when required", () => {
  const schema = buildRegistrationSchema([
    ...baseFields,
    {
      key: "payment_screenshot",
      label: "Payment screenshot",
      type: "file",
      required: true,
      options: [],
      scope: "per_group",
    },
  ]);
  const bad = schema.safeParse({
    name: "Ayesha",
    email: "a@example.com",
    diet: "Halal",
  });
  assert.equal(bad.success, false);
  const badMsg = bad.success ? "" : bad.error.issues[0]?.message || "";
  assert.match(badMsg, /upload|Payment screenshot/i);
  assert.equal(/expected object|received undefined/i.test(badMsg), false);
  const good = schema.safeParse({
    name: "Ayesha",
    email: "a@example.com",
    diet: "Halal",
    payment_screenshot: { path: "registration/evt/file.png" },
  });
  assert.equal(good.success, true);
});

test("member schema omits honeypot and per_group fields", () => {
  const schema = buildMemberRegistrationSchema([
    ...baseFields,
    {
      key: "group_note",
      label: "Note",
      type: "text",
      required: true,
      options: [],
      scope: "per_group",
    },
  ]);
  const shape = schema.shape;
  assert.equal("website" in shape, false);
  assert.equal("group_note" in shape, false);
  assert.equal("email" in shape, true);
});
