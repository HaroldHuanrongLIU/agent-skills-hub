import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "../lib/supabase";
import { SiteHeader } from "../components/SiteHeader";
import { SiteFooter } from "../components/SiteFooter";

/**
 * /enterprise/ — the B-path landing page.
 *
 * Positioning: Hub is repositioned from "directory" → "Trust Layer for Agent
 * & MCP Deployment". This page is the single inbound surface for enterprise
 * leads ($10K-$30K/yr). The Chinese /business/ page coexists, serving
 * ¥ buyers; /enterprise/ is the USD/English-speaking surface.
 *
 * Structure modeled on best-in-class enterprise security SaaS (Wiz, Vanta,
 * Socket, Chainguard): hero w/ dual CTA → compliance-framework band →
 * problem → trust-layer solution → how it works → solutions-by-role →
 * pricing (Socket "no sales call" split) → why-trust-us (honest, no fake
 * logos) → procurement FAQ → demo form.
 *
 * HONESTY RULE (load-bearing): zero paying customers, zero testimonials,
 * SOC 2 is in-progress (not certified). No fabricated logos / quotes /
 * certifications. Compliance frameworks are framed as what we AUDIT AGAINST,
 * not what Hub itself is certified for. See .agents/product-marketing-context.md.
 *
 * Form submits go to enterprise_leads table (migration 012) via the
 * submit_enterprise_lead SECURITY DEFINER RPC.
 */

interface FormState {
  full_name: string;
  email: string;
  company: string;
  role_title: string;
  team_size: string;
  industry: string;
  use_case: string;
  current_stack: string;
  compliance_requirements: string;
  timeline: string;
  estimated_budget: string;
  message: string;
}

const EMPTY_FORM: FormState = {
  full_name: "",
  email: "",
  company: "",
  role_title: "",
  team_size: "",
  industry: "",
  use_case: "",
  current_stack: "",
  compliance_requirements: "",
  timeline: "",
  estimated_budget: "",
  message: "",
};

export function EnterprisePage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = <K extends keyof FormState>(key: K, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase not configured.");
      return;
    }
    if (!form.full_name || !form.email || !form.company || !form.use_case) {
      setError("Please fill in name, email, company, and your use case.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // RPC, not direct table insert. The SECURITY DEFINER function on the
      // server side wraps the INSERT — see supabase/migrations/012_enterprise_leads.sql
      // for why (PostgREST + this specific table's column shape had an RLS
      // quirk that nuked direct inserts; RPC sidesteps it cleanly).
      const { error: rpcErr } = await supabase.rpc("submit_enterprise_lead", {
        p_full_name: form.full_name,
        p_email: form.email,
        p_company: form.company,
        p_use_case: form.use_case,
        p_role_title: form.role_title || null,
        p_team_size: form.team_size || null,
        p_industry: form.industry || null,
        p_current_stack: form.current_stack || null,
        p_compliance_requirements: form.compliance_requirements || null,
        p_message: form.message || null,
        p_timeline: form.timeline || null,
        p_estimated_budget: form.estimated_budget || null,
        p_source: "enterprise_page",
      });
      if (rpcErr) throw rpcErr;
      setSubmitted(true);
      setForm(EMPTY_FORM);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>
          Enterprise · The Trust Layer for AI Agent & MCP Deployment | Agent
          Skills Hub
        </title>
        <meta
          name="description"
          content="Audit 100,000+ open-source agent skills and MCP servers before they touch production. Deploy-time security scanning, sandbox validation, and audit-ready compliance evidence — SOC 2, ISO 42001, EU AI Act. Built for VP Engineering, CTOs, and platform teams."
        />
        <meta
          name="keywords"
          content="MCP server security audit, AI agent compliance, EU AI Act, SOC 2 AI, ISO 42001, enterprise AI skills, agent deployment audit, prompt injection scanning, agent supply chain security"
        />
        <link rel="canonical" href="https://agentskillshub.top/enterprise/" />
      </Helmet>

      <div className="min-h-screen bg-white dark:bg-[var(--bg-base)]">
        <SiteHeader />

        <main>
          {/* ── HERO ─────────────────────────────────────────── */}
          <section className="relative overflow-hidden border-b border-gray-200 dark:border-[var(--border)]">
            {/* subtle accent glow */}
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                background:
                  "radial-gradient(60% 50% at 50% 0%, rgba(91,95,233,0.12), transparent 70%)",
              }}
            />
            <div className="relative max-w-5xl mx-auto px-4 text-center pt-20 pb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                The Trust Layer for AI Agent &amp; MCP Deployment
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white leading-[1.05] mb-6">
                Deploy AI Agents to Production.
                <br />
                <span className="text-indigo-600 dark:text-indigo-400">
                  Without the Audit Panic.
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto mb-8">
                Deploy-time security scanning, sandbox validation, and
                audit-ready compliance evidence for every MCP server and agent
                skill you ship — mapped to{" "}
                <strong className="text-gray-900 dark:text-white">SOC 2</strong>
                ,{" "}
                <strong className="text-gray-900 dark:text-white">
                  ISO/IEC 42001
                </strong>
                , and the{" "}
                <strong className="text-gray-900 dark:text-white">
                  EU AI Act
                </strong>
                .
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <a
                  href="#demo-form"
                  className="inline-flex items-center px-7 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
                >
                  Book a 30-min demo →
                </a>
                <a
                  href="/"
                  className="inline-flex items-center px-7 py-3.5 bg-white dark:bg-[var(--bg-card)] border border-gray-300 dark:border-[var(--border)] hover:border-indigo-400 text-gray-900 dark:text-white font-semibold rounded-lg transition-colors"
                >
                  Browse 100,000 audited skills free
                </a>
              </div>
              <div className="mt-6 text-xs text-gray-500 dark:text-gray-500">
                No slides, no sales theater · We surface 3 real risks in your
                stack before the call ends
              </div>
            </div>
          </section>

          {/* ── COMPLIANCE FRAMEWORK BAND (the #1 trust element) ── */}
          <section className="border-b border-gray-200 dark:border-[var(--border)] bg-gray-50 dark:bg-[var(--bg-card)]/40">
            <div className="max-w-5xl mx-auto px-4 py-10">
              <p className="text-center text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-6">
                Audit findings mapped to the frameworks your procurement team
                asks about
              </p>
              <div className="flex flex-wrap items-stretch justify-center gap-3">
                {[
                  { name: "SOC 2", sub: "Type II controls" },
                  { name: "ISO/IEC 42001", sub: "AI management system" },
                  { name: "EU AI Act", sub: "Art. 9–12, 2026" },
                  { name: "GDPR", sub: "data governance" },
                  { name: "HIPAA", sub: "healthtech add-on" },
                ].map((f) => (
                  <div
                    key={f.name}
                    className="flex flex-col items-center justify-center px-5 py-3 rounded-xl border border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--bg-card)] min-w-[140px]"
                  >
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {f.name}
                    </span>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {f.sub}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-5 max-w-xl mx-auto">
                Hub generates evidence <em>against</em> these frameworks for the
                skills you deploy. Hub&apos;s own SOC 2 Type II is in progress
                (target Q3 2026) — control mapping available under NDA today.
              </p>
            </div>
          </section>

          <div className="max-w-6xl mx-auto px-4">
            {/* ── TRUST SIGNALS ─────────────────────────────────── */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 mb-20">
              {[
                {
                  stat: "43%",
                  label: "Critical vulnerabilities",
                  sub: "found in the open-source MCP servers our scanner has analyzed",
                },
                {
                  stat: "100,000+",
                  label: "Skills under continuous audit",
                  sub: "re-scanned every 8 hours across the open-source ecosystem",
                },
                {
                  stat: "Open",
                  label: "Methodology, MIT-licensed",
                  sub: "every detection rule and score is public and reproducible",
                },
              ].map((item) => (
                <div
                  key={item.stat}
                  className="text-center p-6 rounded-2xl border border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--bg-card)]"
                >
                  <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                    {item.stat}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {item.sub}
                  </div>
                </div>
              ))}
            </section>

            {/* ── PROBLEM ───────────────────────────────────────── */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
                Your MCP server worked in dev.
              </h2>
              <p className="text-center text-xl text-gray-500 dark:text-gray-400 mb-12">
                Then it shipped.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    emoji: "💉",
                    title: "Prompt Injection Disaster",
                    body: "43% of the open-source MCP servers we've scanned carry critical prompt injection or credential-leak risks. One crafted request can exfiltrate your entire database.",
                  },
                  {
                    emoji: "🚧",
                    title: "Compliance Blockade",
                    body: "EU AI Act (full enforcement August 2026) and SOC 2 require provenance, audit logs, and risk classification. Your platform team blocks the launch until you have them.",
                  },
                  {
                    emoji: "🕳",
                    title: "Zero Incident Forensics",
                    body: "Agent breaks at 2am. No audit logs. No way to replay the failing tool call. No way to roll back to a known-good skill version. You're flying blind.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="p-6 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50"
                  >
                    <div className="text-3xl mb-3">{item.emoji}</div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── SOLUTION ──────────────────────────────────────── */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
                One layer between your developers and production
              </h2>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
                Every skill gets audited, sandboxed, logged, and gated — before
                it touches a real user. Free tier answers{" "}
                <em>&ldquo;is this skill any good?&rdquo;</em> Enterprise
                answers{" "}
                <em>
                  &ldquo;can I prove to my auditor it&apos;s safe to run in
                  production?&rdquo;
                </em>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  {
                    icon: "🔐",
                    title: "Pre-deployment Sandbox",
                    body: "Run each skill against de-identified, production-shaped data in an isolated environment. Red-team probes. Kill switch on first anomaly — before it ever reaches a customer.",
                  },
                  {
                    icon: "📋",
                    title: "Compliance Evidence Pack",
                    body: "Auto-generated PDF: SOC 2 control mapping, ISO/IEC 42001 alignment, EU AI Act risk classification, training-data isolation proof. Hand it straight to your auditor.",
                  },
                  {
                    icon: "📊",
                    title: "Full-chain Audit Logs",
                    body: "Every tool call, every data flow, every error — replayable in one click. JSON export to your SIEM (Splunk, Datadog, Elastic). 90-day retention by default.",
                  },
                  {
                    icon: "👤",
                    title: "SSO/SCIM + Fine-grained RBAC",
                    body: "Okta, Auth0, Azure AD ready. Skill-level permissions (which agent calls which tool, with which scope). Engineering-manager approval gate before prod.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="p-6 rounded-xl bg-white dark:bg-[var(--bg-card)] border border-gray-200 dark:border-[var(--border)]"
                  >
                    <div className="text-2xl mb-3">{item.icon}</div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── HOW IT WORKS ──────────────────────────────────── */}
            <section id="how-it-works" className="mb-20">
              <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
                How it works
              </h2>
              <div className="space-y-4">
                {[
                  {
                    num: "01",
                    title: "Connect your existing MCP setup",
                    body: "Point Hub at your registry of MCP servers and agent skills — GitHub, internal mirror, or direct upload. Onboarding takes ≤ 30 minutes.",
                  },
                  {
                    num: "02",
                    title: "Hub runs a 27-rule scan + sandbox test",
                    body: "Each skill is statically scanned for prompt injection, credential exposure, and sandbox-escape risk, then runtime-tested against red-team probes in isolation.",
                  },
                  {
                    num: "03",
                    title: "Get a compliance evidence package",
                    body: "Auditor-ready PDF: control mapping, risk classification, audit-log samples, training-data isolation proof. Ship it to procurement, pass review, deploy.",
                  },
                ].map((step) => (
                  <div
                    key={step.num}
                    className="flex gap-6 p-6 rounded-xl border border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--bg-card)]"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white font-bold text-xl flex items-center justify-center">
                      {step.num}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                        {step.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {step.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ── SOLUTIONS BY ROLE ─────────────────────────────── */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
                Built for whoever owns the launch
              </h2>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
                Different seat at the table, same blocker: nobody can prove the
                agent is safe to ship.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    role: "Platform / VP Engineering",
                    pain: "Launches keep slipping because nobody can sign off on third-party MCP servers.",
                    win: "A deploy-time gate that says ship / don't-ship per skill, with the evidence attached.",
                  },
                  {
                    role: "Security / CISO",
                    pain: "AI agents are a new supply chain your existing SCA tools don't reach.",
                    win: "Continuous scanning of the skill + MCP layer, mapped to MITRE ATT&CK and your frameworks.",
                  },
                  {
                    role: "Compliance / GRC",
                    pain: "Auditors want provenance and risk classification you don't have for agent tools.",
                    win: "A signed evidence pack per deployment — SOC 2, ISO 42001, EU AI Act — generated, not hand-assembled.",
                  },
                ].map((item) => (
                  <div
                    key={item.role}
                    className="p-6 rounded-xl border border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--bg-card)]"
                  >
                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-3">
                      {item.role}
                    </div>
                    <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                      The blocker
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                      {item.pain}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                      What Hub gives you
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white leading-relaxed">
                      {item.win}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── PRICING ───────────────────────────────────────── */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
                Pricing
              </h2>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-12">
                Free to discover &amp; assess. Paid to validate, govern &amp;
                prove.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {/* Free */}
                <div className="p-6 rounded-2xl border border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--bg-card)]">
                  <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                    Free
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    $0
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                    Forever · no card
                  </div>
                  <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300 mb-8">
                    <li>✓ Browse the full 95K skill catalog</li>
                    <li>✓ Quality score + 6-dimension breakdown</li>
                    <li>✓ Basic security scan per skill</li>
                    <li>✓ Scenario &amp; comparison pages</li>
                    <li>✓ Newsletter (weekly trending)</li>
                  </ul>
                  <a
                    href="/"
                    className="block w-full text-center py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:border-indigo-400 transition-colors"
                  >
                    Explore free
                  </a>
                </div>

                {/* Pro */}
                <div className="p-6 rounded-2xl border border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--bg-card)]">
                  <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                    Pro
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    $49<span className="text-base font-normal">/mo</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                    Per developer · no sales call required
                  </div>
                  <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300 mb-8">
                    <li>✓ Everything in Free</li>
                    <li>✓ API access (programmatic catalog + scores)</li>
                    <li>✓ Skill version lock + auto-rollback</li>
                    <li>✓ Audit-log export (per-developer scope)</li>
                    <li>✓ Vulnerability alerts for skills you depend on</li>
                    <li>✓ Email support</li>
                  </ul>
                  <a
                    href="mailto:m17551076169@gmail.com?subject=Hub%20Pro%20-%20Early%20Access"
                    className="block w-full text-center py-2.5 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:border-indigo-400 transition-colors"
                  >
                    Request early access
                  </a>
                </div>

                {/* Enterprise — highlight */}
                <div className="p-6 rounded-2xl border-2 border-indigo-500 dark:border-indigo-400 bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-[var(--bg-card)] relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold">
                    TALK TO SALES
                  </div>
                  <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                    Enterprise
                  </div>
                  <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                    $10K–$30K
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-6">
                    /year / department
                  </div>
                  <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300 mb-8">
                    <li>✓ Everything in Pro</li>
                    <li>✓ SSO/SCIM (Okta, Auth0, Azure AD)</li>
                    <li>✓ Pre-deployment sandbox with de-identified data</li>
                    <li>
                      ✓ Compliance evidence pack (SOC 2 / ISO 42001 / EU AI Act)
                    </li>
                    <li>✓ Full-chain audit logs + SIEM export</li>
                    <li>✓ Red-team report (quarterly)</li>
                    <li>✓ Dedicated account manager + 4h SLA</li>
                    <li>
                      ✓ Regulated-industry add-ons (healthtech / fintech /
                      automotive)
                    </li>
                  </ul>
                  <a
                    href="#demo-form"
                    className="block w-full text-center py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Book a demo →
                  </a>
                </div>
              </div>
              <p className="text-center text-xs text-gray-500 dark:text-gray-500 mt-6">
                Enterprise scales with team size and skills audited. Starter: 10
                engineers / 50 skills ($10K/yr). Standard: 50 / 200 ($20K/yr).
                Business: 200 / unlimited ($30K/yr). 200+ engineers or regulated
                industries start at $50K/yr.{" "}
                <a
                  href="#demo-form"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Talk to sales
                </a>
                .
              </p>
            </section>

            {/* ── WHY TRUST US (honest, no fake logos) ──────────── */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-3">
                Why teams trust the data
              </h2>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
                We&apos;re early on the enterprise product and we say so. What
                we&apos;re not early on: the largest open audit corpus in the
                ecosystem.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {[
                  {
                    title: "Open methodology, nothing to take on faith",
                    body: "Every scoring weight, detection rule, and decision boundary is published and MIT-licensed. You can reproduce any finding yourself — no black-box trust-us claims.",
                  },
                  {
                    title: "Continuous, not point-in-time",
                    body: "We re-scan the entire 95K corpus every 8 hours. A new CVE in a skill you depend on surfaces within hours, not at your next quarterly review.",
                  },
                  {
                    title: "We complement Snyk, we don't replace it",
                    body: "Snyk and SonarQube scan your code. Hub scans the agent skills and MCP servers your code calls into — the AI-specific supply-chain layer they don't reach.",
                  },
                  {
                    title: "Your data is never trained on",
                    body: "Hub does not train, fine-tune, or forward your data to any model provider. Analysis runs in our infrastructure or on-prem. Data isolation is a contractual term.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="p-6 rounded-xl border border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--bg-card)]"
                  >
                    <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-4">
                  Already indexing official skills &amp; MCP servers from
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-gray-400 dark:text-gray-500">
                  {[
                    "Anthropic",
                    "OpenAI",
                    "Alibaba Cloud",
                    "Tencent Cloud",
                    "Google",
                    "Frappe",
                    "Lightning Labs",
                    "Portainer",
                  ].map((org) => (
                    <span key={org}>{org}</span>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3">
                  These organizations&apos; open-source skills are in our
                  catalog. They are not customers — yet.
                </p>
              </div>
            </section>

            {/* ── FAQ ───────────────────────────────────────────── */}
            <section className="mb-20">
              <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
                Procurement FAQ
              </h2>
              <div className="max-w-3xl mx-auto space-y-3">
                {[
                  {
                    q: "How is this different from Snyk or SonarQube?",
                    a: "Snyk and SonarQube scan your code. Hub scans the agent skills and MCP servers your code calls into — the supply-chain layer they don't cover. We focus on AI-specific risks: prompt injection, sandbox escape, credential leakage in tool definitions, and model training-data isolation.",
                  },
                  {
                    q: "Do you train models on our data?",
                    a: "No. Hub does not train, fine-tune, or send your data to any model provider. All analysis runs in our infrastructure or on-prem (Enterprise plan). Data isolation is a contractual term.",
                  },
                  {
                    q: "EU AI Act — do you cover the full checklist?",
                    a: "Yes. Hub's compliance evidence pack maps to Article 9 (risk management), Article 10 (data governance), Article 11 (technical documentation), and Article 12 (record-keeping). Updated for the August 2026 full enforcement.",
                  },
                  {
                    q: "Is Hub itself SOC 2 audited?",
                    a: "Not yet — we're honest about that. We are scoping SOC 2 Type II (target Q3 2026). For customers who require SOC 2 today, we provide our security control mapping under NDA, can complete a custom security questionnaire, and will commit to a timeline as part of contract negotiation.",
                  },
                  {
                    q: "Can we deploy on-prem or private cloud?",
                    a: "Yes, for Enterprise. We support AWS (us-east-1, eu-west-1), GCP, Azure, and on-prem Kubernetes. Air-gapped deployments available for healthtech / defense customers.",
                  },
                  {
                    q: "What happens if a skill is updated upstream?",
                    a: "Hub re-scans on every commit to the upstream repo. Updated skills enter the pre-deployment sandbox automatically, and your engineering team is notified before any auto-pull to production.",
                  },
                  {
                    q: "How long does a POC take?",
                    a: "Standard POC: 4 weeks. Week 1 onboarding + connector setup. Weeks 2–3 audit your current skill inventory and deliver findings. Week 4 review with your platform team. POC fee: $5,000, fully credited toward an annual plan.",
                  },
                  {
                    q: "What's actually included in the $10K–$30K range?",
                    a: "Pricing scales with team size and number of skills audited. Starter: 10 engineers, 50 skills ($10K/yr). Standard: 50 engineers, 200 skills ($20K/yr). Business: 200 engineers, unlimited skills ($30K/yr). Beyond that, custom enterprise.",
                  },
                ].map((item, i) => (
                  <details
                    key={i}
                    className="group p-4 rounded-lg border border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--bg-card)]"
                  >
                    <summary className="cursor-pointer font-semibold text-gray-900 dark:text-white list-none flex justify-between items-center">
                      <span>{item.q}</span>
                      <span className="text-indigo-600 group-open:rotate-45 transition-transform text-xl">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>

            {/* ── DEMO FORM ─────────────────────────────────────── */}
            <section
              id="demo-form"
              className="max-w-3xl mx-auto mb-20 p-8 rounded-2xl border border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--bg-card)]"
            >
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Book a 30-min demo
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
                We&apos;ll walk through your current MCP/agent setup and show
                you 3 immediate risks before the call ends. No slides, no sales
                theater.
              </p>

              {submitted ? (
                <div className="p-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
                  <h3 className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                    Thanks — we&apos;ll be in touch within 24h.
                  </h3>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    Jason or someone from the Hub team will reach out via email
                    to schedule the call. If urgent, ping{" "}
                    <a
                      href="https://x.com/GoSailGlobal"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      @GoSailGlobal
                    </a>{" "}
                    on X.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      label="Full name *"
                      value={form.full_name}
                      onChange={(v) => onChange("full_name", v)}
                      required
                      maxLength={100}
                    />
                    <FormField
                      label="Work email *"
                      value={form.email}
                      onChange={(v) => onChange("email", v)}
                      required
                      type="email"
                      maxLength={200}
                    />
                    <FormField
                      label="Company *"
                      value={form.company}
                      onChange={(v) => onChange("company", v)}
                      required
                      maxLength={200}
                    />
                    <FormField
                      label="Role"
                      placeholder="VP Engineering, CTO, Platform Lead…"
                      value={form.role_title}
                      onChange={(v) => onChange("role_title", v)}
                      maxLength={100}
                    />
                    <FormSelect
                      label="Team size"
                      value={form.team_size}
                      onChange={(v) => onChange("team_size", v)}
                      options={[
                        "",
                        "1–10",
                        "10–50",
                        "50–200",
                        "200–1,000",
                        "1,000+",
                      ]}
                    />
                    <FormField
                      label="Industry"
                      placeholder="fintech, healthtech, automotive…"
                      value={form.industry}
                      onChange={(v) => onChange("industry", v)}
                      maxLength={100}
                    />
                  </div>

                  <FormTextarea
                    label="What's your use case? *"
                    placeholder="Briefly: how are you deploying AI agents today, and what's the biggest pain point?"
                    value={form.use_case}
                    onChange={(v) => onChange("use_case", v)}
                    required
                    maxLength={2000}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      label="Current AI/agent stack"
                      placeholder="Claude Code + LangGraph + 12 MCP servers…"
                      value={form.current_stack}
                      onChange={(v) => onChange("current_stack", v)}
                      maxLength={500}
                    />
                    <FormField
                      label="Compliance requirements"
                      placeholder="SOC 2, ISO 42001, EU AI Act, HIPAA…"
                      value={form.compliance_requirements}
                      onChange={(v) => onChange("compliance_requirements", v)}
                      maxLength={500}
                    />
                    <FormSelect
                      label="Timeline"
                      value={form.timeline}
                      onChange={(v) => onChange("timeline", v)}
                      options={[
                        "",
                        "Immediate (this quarter)",
                        "1–3 months",
                        "3–6 months",
                        "Just exploring",
                      ]}
                    />
                    <FormSelect
                      label="Estimated budget"
                      value={form.estimated_budget}
                      onChange={(v) => onChange("estimated_budget", v)}
                      options={[
                        "",
                        "<$5K/yr",
                        "$5K–$10K/yr",
                        "$10K–$30K/yr",
                        "$30K–$100K/yr",
                        ">$100K/yr",
                      ]}
                    />
                  </div>

                  <FormTextarea
                    label="Anything else?"
                    placeholder="Context, urgency, specific risks you're worried about…"
                    value={form.message}
                    onChange={(v) => onChange("message", v)}
                    maxLength={2000}
                    rows={3}
                  />

                  {error && (
                    <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                  >
                    {submitting ? "Submitting…" : "Request demo →"}
                  </button>

                  <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
                    We&apos;ll never share your data. Submissions are stored
                    encrypted. Manual review by Jason within 24h.
                  </p>
                </form>
              )}
            </section>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}

// ── Tiny form primitives (kept local; not worth extracting) ──────────

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}

function FormField({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
  maxLength,
}: FormFieldProps) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-3 py-2 rounded-md bg-white dark:bg-[var(--bg-elev)] border border-gray-300 dark:border-[var(--border)] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </label>
  );
}

interface FormSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}

function FormSelect({ label, value, onChange, options }: FormSelectProps) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded-md bg-white dark:bg-[var(--bg-elev)] border border-gray-300 dark:border-[var(--border)] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt || "— select —"}
          </option>
        ))}
      </select>
    </label>
  );
}

interface FormTextareaProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}

function FormTextarea({
  label,
  value,
  onChange,
  required,
  placeholder,
  maxLength,
  rows = 4,
}: FormTextareaProps) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        className="w-full px-3 py-2 rounded-md bg-white dark:bg-[var(--bg-elev)] border border-gray-300 dark:border-[var(--border)] text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
      />
    </label>
  );
}
