"use client";
/**
 * saigonpowertx.com/membership — SAIGON POWER PLUS
 * Public marketing + enrollment page. Signups and quote requests sync to the
 * CRM via the giadienre intake API (lead_source "SaigonPowerTX Website");
 * card payment runs through HelcimPay.js (card data never touches our servers).
 */
import { useState, FormEvent } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "https://web-production-188939.up.railway.app";
const LEAD_SOURCE = "SaigonPowerTX Website";

// ── HelcimPay.js loader (same flow as giadienre.com) ──────────────────────────

declare global {
  interface Window {
    appendHelcimPayIframe?: (checkoutToken: string, allowExit?: boolean) => void;
  }
}

function loadHelcimScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window.appendHelcimPayIframe === "function") return resolve();
    const existing = document.querySelector<HTMLScriptElement>("script[data-helcim-pay]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://secure.helcim.app/helcim-pay/services/start.js";
    s.async = true;
    s.dataset.helcimPay = "true";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("failed"));
    document.head.appendChild(s);
  });
}

function openHelcimPay(checkoutToken: string): Promise<unknown> {
  return loadHelcimScript().then(() => new Promise((resolve, reject) => {
    const eventName = `helcim-pay-js-${checkoutToken}`;
    function cleanup() {
      window.removeEventListener("message", onMessage);
      document.getElementById("helcimPayIframe")?.remove();
    }
    function onMessage(ev: MessageEvent) {
      if (!ev.data || ev.data.eventName !== eventName) return;
      if (ev.data.eventStatus === "SUCCESS") { cleanup(); resolve(ev.data.eventMessage); }
      else if (ev.data.eventStatus === "ABORTED" || ev.data.eventStatus === "HIDE") {
        cleanup(); reject(new Error("cancelled"));
      }
    }
    window.addEventListener("message", onMessage);
    window.appendHelcimPayIframe?.(checkoutToken, true);
  }));
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${API}/api/v1/giadienre/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(typeof data?.detail === "string" ? data.detail : "failed");
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data;
}

// ── Small shared bits ─────────────────────────────────────────────────────────

const Check = ({ w = 17 }: { w?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: w }}>
    <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Bolt = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
    <path d="M13.2 2 5 13h6l-.3 9L19 10h-6l.2-8Z" fill="currentColor" />
  </svg>
);

const PLANS = {
  POWER_PLUS_RES: { label: "Residential", price: "$9.99" },
  POWER_PLUS_COM: { label: "Commercial", price: "$19.99" },
} as const;
type PlanId = keyof typeof PLANS;

type JoinStep = "form" | "submitting" | "paying" | "active" | "received";

export default function MembershipPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(0);

  // Join (enrollment) modal
  const [joinPlan, setJoinPlan] = useState<PlanId | null>(null);
  const [joinStep, setJoinStep] = useState<JoinStep>("form");
  const [join, setJoin] = useState({ full_name: "", email: "", phone: "", service_address: "", city: "", zip: "", business_name: "" });
  const [joinError, setJoinError] = useState<string | null>(null);
  const [reference, setReference] = useState("");
  const [cardLast4, setCardLast4] = useState("");

  // Quote form
  const [quote, setQuote] = useState({ accountType: "", name: "", phone: "", address: "", email: "", provider: "", contractEndDate: "" });
  const [quoteState, setQuoteState] = useState<"idle" | "sending" | "done">("idle");
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const openJoin = (plan: PlanId) => {
    setJoinPlan(plan);
    setJoinStep("form");
    setJoinError(null);
  };

  async function submitJoin(e: FormEvent) {
    e.preventDefault();
    if (!joinPlan) return;
    setJoinError(null);
    setJoinStep("submitting");
    try {
      const sub = await post("subscribe", {
        full_name: join.full_name,
        email: join.email,
        phone: join.phone,
        service_address: join.service_address,
        city: join.city,
        state: "TX",
        zip: join.zip,
        plan_id: joinPlan,
        billing_cycle: "monthly",
        form_type: "signup",
        lead_source: LEAD_SOURCE,
        extra: {
          account_type: joinPlan === "POWER_PLUS_COM" ? "commercial" : "residential",
          ...(join.business_name ? { business_name: join.business_name } : {}),
        },
      });
      setReference(sub?.reference || "");

      let session;
      try {
        session = await post("billing/pay-session", { subscription_id: sub.id });
      } catch (err) {
        if ((err as Error & { status?: number }).status === 503) {
          // online payments not switched on — the signup is in the CRM,
          // the team completes payment by phone
          setJoinStep("received");
          return;
        }
        throw err;
      }

      setJoinStep("paying");
      const event = await openHelcimPay(session.checkoutToken);
      const confirmed = await post("billing/pay-confirm", {
        subscription_id: sub.id,
        checkoutToken: session.checkoutToken,
        event,
      });
      setCardLast4(confirmed?.card_last4 || "");
      setJoinStep("active");
    } catch (err) {
      if (err instanceof Error && err.message === "cancelled") {
        setJoinStep("received"); // enrolled, payment pending — team follows up
        return;
      }
      setJoinError(err instanceof Error && err.message !== "failed"
        ? err.message
        : "Something went wrong — please try again or call (832) 937-9999.");
      setJoinStep("form");
    }
  }

  async function submitQuote(e: FormEvent) {
    e.preventDefault();
    setQuoteError(null);
    setQuoteState("sending");
    try {
      await post("subscribe", {
        full_name: quote.name,
        email: quote.email,
        phone: quote.phone,
        service_address: quote.address,
        state: "TX",
        current_provider: quote.provider,
        contract_end_date: quote.contractEndDate || null,
        form_type: "bill_analysis",
        lead_source: LEAD_SOURCE,
        extra: { account_type: quote.accountType, request: "quote" },
      });
      setQuoteState("done");
    } catch (err) {
      setQuoteError(err instanceof Error && err.message !== "failed"
        ? err.message
        : "Something went wrong — please try again or call (832) 937-9999.");
      setQuoteState("idle");
    }
  }

  const jf = (k: keyof typeof join) => ({
    value: join[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setJoin({ ...join, [k]: e.target.value }),
  });
  const qf = (k: keyof typeof quote) => ({
    value: quote[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setQuote({ ...quote, [k]: e.target.value }),
  });

  const faqs = [
    ["What do the subscriptions cover?", "Residential service is $9.99/month and commercial service is $19.99/month. Both cover Saigon Power account-management services such as dashboard access, contract tracking, renewal reminders, document storage, and quote assistance. Electricity charges from your provider are separate."],
    ["Can I cancel anytime?", "Yes. The membership is month-to-month and may be canceled according to the membership terms."],
    ["Does submitting a quote request switch my provider?", "No. A quote request only gives the team permission to contact you about available options. Enrollment requires a separate confirmation."],
    ["What if my contract does not end soon?", "Enter your contract end date. Saigon Power can keep it organized and help you prepare for the appropriate renewal window."],
    ["Is Saigon Power an electricity provider?", "Saigon Power is an energy broker and account-management service. Electricity service is supplied and billed by the selected retail electricity provider."],
  ];

  return (
    <div id="top">
      <style>{CSS}</style>

      <div className="topbar"><strong>Texas electricity made easier.</strong> Residential $9.99/month · Commercial $19.99/month. Cancel anytime.</div>

      <div className="nav-wrap">
        <nav className="container" aria-label="Primary navigation">
          <a className="brand" href="#top" aria-label="Saigon Power home">
            <span className="logo-mark" aria-hidden="true"><Bolt /></span>
            <span>Saigon Power<small>RESIDENTIAL &amp; COMMERCIAL ENERGY SUPPORT</small></span>
          </a>
          <div className={`nav-links${menuOpen ? " mobile-open" : ""}`} onClick={() => setMenuOpen(false)}>
            <a href="#how">How It Works</a>
            <a href="#membership">Membership</a>
            <a href="#benefits">Benefits</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="nav-actions">
            <a className="btn btn-light" href="/my">Log In</a>
            <a className="btn btn-primary" href="#quote">Get a Quote</a>
            <button className="menu-btn" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
        </nav>
      </div>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <span className="eyebrow">Electricity concierge for Texas</span>
              <h1>Better energy choices. <span className="accent">Less hassle.</span></h1>
              <p>Saigon Power keeps your electricity information organized, monitors your contract, and helps residential and commercial customers compare available plans when it is time to renew.</p>
              <div className="hero-actions">
                <button className="btn btn-primary" onClick={() => openJoin("POWER_PLUS_RES")}>
                  Join Residential for $9.99/month
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <a className="btn btn-light" href="#quote">Get a real-time quote</a>
              </div>
              <div className="trust-row">
                <span><Check w={18} />Cancel anytime</span>
                <span><Check w={18} />Renewal reminders</span>
                <span><Check w={18} />Human support</span>
              </div>
            </div>

            <div className="dashboard-card" aria-label="Customer dashboard preview">
              <div className="dash-head">
                <h3>Your Energy Dashboard</h3>
                <span className="live-pill">● MONITORING</span>
              </div>
              <div className="status-panel">
                <div className="status-label">Current contract status</div>
                <div className="status-main">You&rsquo;re covered until Oct. 18</div>
                <div className="progress"><span /></div>
                <div className="status-meta"><span>Contract started</span><span>98 days remaining</span></div>
              </div>
              <div className="mini-grid">
                <div className="mini-card"><small>Renewal status</small><strong className="good">On track</strong></div>
                <div className="mini-card"><small>Current provider</small><strong>Provider name</strong></div>
              </div>
              <div className="alert-card">
                <div className="alert-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.3 4.2 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
                <div><strong>We&rsquo;ll notify you before renewal time.</strong><p>No more scrambling at the last minute or forgetting your contract end date.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="logo-strip" aria-label="Service highlights">
          <div className="container logo-strip-inner">
            <span><strong>Built for Texas homes and businesses</strong></span><span className="dot" />
            <span>Simple membership</span><span className="dot" />
            <span>Contract monitoring</span><span className="dot" />
            <span>Bilingual support</span><span className="dot" />
            <span>Residential + Commercial memberships</span>
          </div>
        </section>

        <section className="section" id="how">
          <div className="container">
            <div className="section-title">
              <span className="eyebrow">How it works</span>
              <h2>From electric bill to organized account in three steps.</h2>
              <p>We designed the process to feel simple—even when electricity plans are not.</p>
            </div>
            <div className="steps">
              <article className="step">
                <span className="step-num">Step 01</span>
                <div className="step-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8m-6-6 6 6m-6-6v6h6M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3>Upload your bill</h3>
                <p>Upload a recent electric bill or enter your provider and contract information manually.</p>
              </article>
              <article className="step">
                <span className="step-num">Step 02</span>
                <div className="step-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M12 3 4 7v5c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V7l-8-4Z" stroke="currentColor" strokeWidth="2" /><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3>We monitor the details</h3>
                <p>Your account stores key contract information and watches for the right renewal window.</p>
              </article>
              <article className="step">
                <span className="step-num">Step 03</span>
                <div className="step-icon"><svg viewBox="0 0 24 24" fill="none"><path d="M4 19V9m6 10V5m6 14v-7m4 7H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></div>
                <h3>Compare and renew</h3>
                <p>When the time is right, request available rates and get help choosing your next plan.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section membership" id="membership">
          <div className="container membership-grid">
            <div className="membership-copy">
              <span className="eyebrow">Simple monthly subscriptions</span>
              <h2>Your electricity account, actually managed.</h2>
              <p>Saigon Power memberships cover account-management services only. Electricity usage, delivery charges, taxes, and provider charges remain separate.</p>
              <div className="feature-list">
                <div className="feature"><i><Check w={15} /></i><span>Secure customer profile and electric-bill storage</span></div>
                <div className="feature"><i><Check w={15} /></i><span>Contract-end-date tracking and renewal reminders</span></div>
                <div className="feature"><i><Check w={15} /></i><span>Access to quote assistance and customer support</span></div>
                <div className="feature"><i><Check w={15} /></i><span>Cancel your subscription anytime</span></div>
              </div>
              <a className="btn btn-dark" href="#quote">See available rates</a>
            </div>
            <div className="pricing-stack">
              <div className="price-card">
                <span className="price-badge">RESIDENTIAL SUBSCRIPTION</span>
                <div className="price"><strong>$9.99</strong><span>/ month</span></div>
                <p>For homeowners and residential electricity accounts that want ongoing support and renewal monitoring.</p>
                <ul>
                  <li><Check />Personal customer dashboard</li>
                  <li><Check />Contract and renewal tracking</li>
                  <li><Check />Quote and enrollment assistance</li>
                  <li><Check />Email and phone support</li>
                </ul>
                <button className="btn" onClick={() => openJoin("POWER_PLUS_RES")}>Start Residential</button>
                <small>No long-term subscription commitment.</small>
              </div>
              <div className="price-card light-card">
                <span className="price-badge">COMMERCIAL SUBSCRIPTION</span>
                <div className="price"><strong>$19.99</strong><span>/ month</span></div>
                <p>For businesses that need commercial account monitoring, quote support, and contract-renewal visibility.</p>
                <ul>
                  <li><Check />Commercial account dashboard</li>
                  <li><Check />Contract and renewal tracking</li>
                  <li><Check />Commercial quote assistance</li>
                  <li><Check />Priority support for business accounts</li>
                </ul>
                <button className="btn" onClick={() => openJoin("POWER_PLUS_COM")}>Start Commercial</button>
                <small>$19.99 per commercial account, billed monthly.</small>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="benefits">
          <div className="container">
            <div className="section-title">
              <span className="eyebrow">Why Saigon Power</span>
              <h2>Electricity is complicated. Your experience shouldn&rsquo;t be.</h2>
            </div>
            <div className="benefits-grid">
              <article className="benefit"><div className="benefit-icon"><svg viewBox="0 0 24 24" fill="none" style={{ width: 23 }}><path d="M12 6v6l4 2m6-2a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></div><div><h3>Never miss renewal timing</h3><p>We keep the contract end date visible and remind you before the renewal window arrives.</p></div></article>
              <article className="benefit"><div className="benefit-icon"><svg viewBox="0 0 24 24" fill="none" style={{ width: 23 }}><path d="M4 7h16M7 4v6m10-6v6M5 11h14v9H5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div><div><h3>Everything in one place</h3><p>Keep provider, plan, service address, documents, and account activity organized.</p></div></article>
              <article className="benefit"><div className="benefit-icon"><svg viewBox="0 0 24 24" fill="none" style={{ width: 23 }}><path d="M3 12h3l3-8 4 16 3-8h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div><div><h3>Rate-shopping assistance</h3><p>Request current plan options based on the information you provide and your service location.</p></div></article>
              <article className="benefit"><div className="benefit-icon"><svg viewBox="0 0 24 24" fill="none" style={{ width: 23 }}><path d="M8 10h8m-8 4h5m8-2a9 9 0 1 1-3-6.7L21 3v6h-6l2.1-2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></div><div><h3>Real human support</h3><p>Get help from the Saigon Power team when you have questions or are ready to enroll.</p></div></article>
            </div>
          </div>
        </section>

        <section className="quote-section" id="quote">
          <div className="container quote-grid">
            <div className="quote-copy">
              <span className="eyebrow">Get a quote</span>
              <h2>Let&rsquo;s find the right electricity plan.</h2>
              <p>Send your information and the Saigon Power team can review residential or commercial options for your service address and contract timing.</p>
              <div className="quote-note"><strong>Already under contract?</strong><br />That&rsquo;s okay. Share your contract end date so the team can follow up at the appropriate time.</div>
            </div>

            {quoteState === "done" ? (
              <div className="quote-form quote-done">
                <div className="done-icon"><Check w={30} /></div>
                <h3>Request received!</h3>
                <p>Thank you{quote.name ? `, ${quote.name.split(" ")[0]}` : ""} — the Saigon Power team will review current options for your address and reach out shortly.</p>
                <p className="done-sub">Questions right now? Call <a href="tel:8329379999"><strong>832-937-9999</strong></a>.</p>
              </div>
            ) : (
              <form className="quote-form" onSubmit={submitQuote}>
                <div className="form-head">
                  <h3>Request current rates</h3>
                  <span className="secure"><svg viewBox="0 0 24 24" fill="none" style={{ width: 16 }}><path d="M6 10V8a6 6 0 1 1 12 0v2m-13 0h14v11H5z" stroke="currentColor" strokeWidth="2" /></svg>Secure form</span>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="accountType">Account Type</label>
                    <select id="accountType" required {...qf("accountType")}>
                      <option value="">Select one</option>
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                    </select>
                  </div>
                  <div className="field"><label htmlFor="name">Full Name</label><input id="name" autoComplete="name" required placeholder="Your full name" {...qf("name")} /></div>
                  <div className="field"><label htmlFor="phone">Phone Number</label><input id="phone" autoComplete="tel" required placeholder="(832) 000-0000" {...qf("phone")} /></div>
                  <div className="field full"><label htmlFor="address">Service Address</label><input id="address" autoComplete="street-address" required placeholder="Street, city, state and ZIP" {...qf("address")} /></div>
                  <div className="field"><label htmlFor="email">Email Address</label><input id="email" type="email" autoComplete="email" required placeholder="you@example.com" {...qf("email")} /></div>
                  <div className="field"><label htmlFor="provider">Current Provider</label><input id="provider" placeholder="Provider name" {...qf("provider")} /></div>
                  <div className="field"><label htmlFor="date">Contract End Date</label><input id="date" type="date" {...qf("contractEndDate")} /></div>
                </div>
                <label className="form-consent"><input type="checkbox" required /><span>I agree to be contacted about electricity service options and understand that submitting this form does not enroll me in a plan.</span></label>
                {quoteError && <p className="form-error">{quoteError}</p>}
                <button className="btn btn-primary" type="submit" disabled={quoteState === "sending"}>
                  {quoteState === "sending" ? "Sending…" : <>Get My Quote <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></>}
                </button>
              </form>
            )}
          </div>
        </section>

        <section className="section" id="faq">
          <div className="container faq-wrap">
            <div className="section-title">
              <span className="eyebrow">Frequently asked questions</span>
              <h2>Clear answers, no electric-company alphabet soup.</h2>
            </div>
            {faqs.map(([q, a], i) => (
              <div key={q} className={`faq-item${faqOpen === i ? " open" : ""}`}>
                <button className="faq-q" onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}>{q}<span className="faq-plus">+</span></button>
                <div className="faq-a">{a}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="cta-band">
          <div className="container cta-box">
            <div><h2>Ready to stop worrying about renewal dates?</h2><p>Join Saigon Power or request a quote from the Saigon Power team.</p></div>
            <div className="cta-actions">
              <button className="btn btn-primary" onClick={() => openJoin("POWER_PLUS_RES")}>Join Membership</button>
              <a className="btn btn-light" href="#quote">Get a Quote</a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="brand"><span className="logo-mark"><Bolt /></span><span>Saigon Power<small>RESIDENTIAL &amp; COMMERCIAL ENERGY SUPPORT</small></span></div>
              <div className="footer-about">A simpler way to organize residential and commercial Texas electricity accounts, monitor contract timing, and request help comparing available plans.</div>
            </div>
            <div className="footer-col"><h4>Platform</h4><a href="#how">How It Works</a><a href="#membership">Membership</a><a href="#quote">Get a Quote</a><a href="/my">Customer Login</a></div>
            <div className="footer-col"><h4>Company</h4><a href="/en">About</a><a href="tel:8329379999">Contact</a><a href="#">Privacy Policy</a><a href="#">Terms of Service</a></div>
            <div className="footer-col"><h4>Saigon Power</h4><a href="tel:8329379999">832-937-9999</a><a href="mailto:lance@saigonllc.com">lance@saigonllc.com</a><span>Houston, Texas</span></div>
          </div>
          <div className="footer-bottom"><span>© 2026 Saigon Power. All rights reserved.</span><span className="powered">Rates, availability, and potential savings vary by service area, usage, provider, and market conditions.</span></div>
        </div>
      </footer>

      <div className="mobile-cta">
        <button className="btn btn-light" onClick={() => openJoin("POWER_PLUS_RES")}>Plans from $9.99</button>
        <a className="btn btn-primary" href="#quote">Get a Quote</a>
      </div>

      {/* ── Join / enrollment modal ── */}
      {joinPlan && (
        <div className="join-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget && joinStep !== "paying" && joinStep !== "submitting") setJoinPlan(null); }}>
          <div className="join-modal">
            {(joinStep === "active" || joinStep === "received") ? (
              <div className="join-done">
                <div className="done-icon"><Check w={30} /></div>
                <h3>{joinStep === "active" ? "Welcome to SAIGON POWER PLUS! 🎉" : "You're on the list!"}</h3>
                <p>
                  {joinStep === "active"
                    ? <>Your {PLANS[joinPlan].label} membership is <strong>active</strong>{cardLast4 ? <> — billed monthly to the card ending {cardLast4}</> : null}. The Saigon Power team will reach out to finish setting up your dashboard.</>
                    : <>We received your {PLANS[joinPlan].label} membership signup. The Saigon Power team will contact you shortly to complete payment and activate your account.</>}
                </p>
                {reference && <p className="join-ref">Reference: <strong>{reference}</strong></p>}
                <button className="btn btn-primary" onClick={() => setJoinPlan(null)}>Done</button>
              </div>
            ) : (
              <>
                <div className="join-head">
                  <div>
                    <span className="price-badge">{PLANS[joinPlan].label.toUpperCase()} MEMBERSHIP</span>
                    <h3>Join for {PLANS[joinPlan].price}/month</h3>
                  </div>
                  <button className="join-close" aria-label="Close" onClick={() => setJoinPlan(null)}>✕</button>
                </div>
                <form onSubmit={submitJoin}>
                  <div className="form-grid">
                    <div className="field full"><label htmlFor="j-name">Full Name</label><input id="j-name" autoComplete="name" required placeholder="Your full name" {...jf("full_name")} /></div>
                    {joinPlan === "POWER_PLUS_COM" && (
                      <div className="field full"><label htmlFor="j-biz">Business Name</label><input id="j-biz" autoComplete="organization" required placeholder="Your business name" {...jf("business_name")} /></div>
                    )}
                    <div className="field"><label htmlFor="j-email">Email Address</label><input id="j-email" type="email" autoComplete="email" required placeholder="you@example.com" {...jf("email")} /></div>
                    <div className="field"><label htmlFor="j-phone">Phone Number</label><input id="j-phone" autoComplete="tel" required placeholder="(832) 000-0000" {...jf("phone")} /></div>
                    <div className="field full"><label htmlFor="j-addr">Service Address</label><input id="j-addr" autoComplete="street-address" required placeholder="Street address" {...jf("service_address")} /></div>
                    <div className="field"><label htmlFor="j-city">City</label><input id="j-city" autoComplete="address-level2" required placeholder="Houston" {...jf("city")} /></div>
                    <div className="field"><label htmlFor="j-zip">ZIP Code</label><input id="j-zip" autoComplete="postal-code" required placeholder="77000" {...jf("zip")} /></div>
                  </div>
                  {joinError && <p className="form-error">{joinError}</p>}
                  <button className="btn btn-primary join-submit" type="submit" disabled={joinStep === "submitting" || joinStep === "paying"}>
                    {joinStep === "submitting" ? "Saving your details…"
                      : joinStep === "paying" ? "Waiting for secure payment…"
                      : <>Continue to secure payment <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg></>}
                  </button>
                  <p className="join-fine">Card details are entered in Helcim&rsquo;s secure payment window and never touch our servers. {PLANS[joinPlan].price}/month, cancel anytime.</p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Design CSS (ported 1:1 from saigonpowertx_membership.html) ────────────────

const CSS = `
    :root {
      --navy: #07182f;
      --navy-2: #0d2547;
      --blue: #146ef5;
      --blue-dark: #0b55c7;
      --cyan: #69d5ff;
      --yellow: #ffd24a;
      --ink: #10223e;
      --muted: #627089;
      --line: #dce5ef;
      --soft: #f4f8fc;
      --white: #ffffff;
      --success: #0e9f6e;
      --shadow: 0 24px 70px rgba(7, 24, 47, 0.13);
      --radius-lg: 28px;
      --radius-md: 18px;
      --radius-sm: 12px;
      --max: 1180px;
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: var(--white);
      line-height: 1.55;
      -webkit-font-smoothing: antialiased;
    }

    a { color: inherit; text-decoration: none; }
    button, input, select { font: inherit; }
    img, svg { display: block; max-width: 100%; }
    .container { width: min(calc(100% - 40px), var(--max)); margin: 0 auto; }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(20, 110, 245, 0.1);
      color: var(--blue-dark);
      font-size: 0.82rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .eyebrow::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--blue); box-shadow: 0 0 0 5px rgba(20,110,245,.12); }
    .section { padding: 96px 0; }
    .section-title { max-width: 720px; margin-bottom: 44px; }
    .section-title h2 { margin: 16px 0 12px; font-size: clamp(2rem, 4vw, 3.35rem); line-height: 1.05; letter-spacing: -0.045em; }
    .section-title p { margin: 0; color: var(--muted); font-size: 1.08rem; }

    .topbar {
      background: var(--navy);
      color: rgba(255,255,255,.82);
      font-size: .86rem;
      text-align: center;
      padding: 9px 16px;
    }
    .topbar strong { color: var(--white); }

    .nav-wrap {
      position: sticky;
      top: 0;
      z-index: 30;
      background: rgba(255,255,255,.9);
      backdrop-filter: blur(16px);
      border-bottom: 1px solid rgba(220,229,239,.8);
    }
    nav { height: 76px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
    .brand { display: flex; align-items: center; gap: 11px; font-weight: 900; letter-spacing: -0.04em; font-size: 1.25rem; }
    .logo-mark {
      width: 39px;
      height: 39px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: linear-gradient(145deg, var(--blue), #27b3ff);
      color: white;
      box-shadow: 0 10px 24px rgba(20,110,245,.25);
    }
    .brand span small { display: block; color: var(--muted); font-weight: 700; letter-spacing: 0; font-size: .62rem; margin-top: -3px; }
    .nav-links { display: flex; align-items: center; gap: 28px; color: #43516a; font-size: .94rem; font-weight: 700; }
    .nav-links a:hover { color: var(--blue); }
    .nav-actions { display: flex; align-items: center; gap: 10px; }
    .btn {
      border: 0;
      border-radius: 12px;
      padding: 13px 18px;
      font-weight: 800;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      transition: transform .2s ease, box-shadow .2s ease, background .2s ease;
    }
    .btn:hover { transform: translateY(-2px); }
    .btn-primary { background: var(--blue); color: white; box-shadow: 0 10px 24px rgba(20,110,245,.23); }
    .btn-primary:hover { background: var(--blue-dark); }
    .btn-primary:disabled { opacity: .65; cursor: wait; transform: none; }
    .btn-dark { background: var(--navy); color: white; box-shadow: 0 12px 24px rgba(7,24,47,.18); }
    .btn-light { background: white; color: var(--ink); border: 1px solid var(--line); }
    .menu-btn { display: none; width: 42px; height: 42px; border: 1px solid var(--line); background: white; border-radius: 10px; cursor: pointer; }

    .hero {
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(circle at 84% 15%, rgba(105,213,255,.34), transparent 31%),
        radial-gradient(circle at 8% 85%, rgba(255,210,74,.18), transparent 28%),
        linear-gradient(180deg, #f7fbff 0%, #ffffff 84%);
      padding: 82px 0 76px;
    }
    .hero::after {
      content: "";
      position: absolute;
      inset: auto -5% -250px -5%;
      height: 380px;
      background: repeating-linear-gradient(90deg, rgba(20,110,245,.035) 0 1px, transparent 1px 68px), repeating-linear-gradient(0deg, rgba(20,110,245,.035) 0 1px, transparent 1px 68px);
      transform: perspective(420px) rotateX(64deg);
      transform-origin: bottom;
    }
    .hero-grid { position: relative; z-index: 2; display: grid; grid-template-columns: 1.03fr .97fr; gap: 64px; align-items: center; }
    .hero h1 { font-size: clamp(3.1rem, 6vw, 5.6rem); line-height: .95; letter-spacing: -.065em; margin: 20px 0 24px; max-width: 700px; }
    .hero h1 .accent { color: var(--blue); position: relative; white-space: nowrap; }
    .hero p { max-width: 650px; color: var(--muted); font-size: 1.18rem; margin: 0 0 29px; }
    .hero-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 30px; }
    .hero-actions .btn { min-height: 52px; padding-inline: 22px; }
    .trust-row { display: flex; flex-wrap: wrap; gap: 18px; color: #3e4d67; font-size: .9rem; font-weight: 700; }
    .trust-row span { display: inline-flex; align-items: center; gap: 7px; }
    .trust-row svg { width: 18px; color: var(--success); }

    .dashboard-card {
      position: relative;
      border: 1px solid rgba(255,255,255,.8);
      border-radius: 30px;
      background: rgba(255,255,255,.82);
      box-shadow: var(--shadow);
      padding: 22px;
      backdrop-filter: blur(20px);
    }
    .dashboard-card::before {
      content: "";
      position: absolute;
      inset: -18px 42px auto -24px;
      height: 140px;
      background: linear-gradient(90deg, rgba(20,110,245,.25), rgba(105,213,255,.08));
      filter: blur(42px);
      z-index: -1;
    }
    .dash-head { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 6px 4px 18px; }
    .dash-head h3 { margin: 0; font-size: 1rem; }
    .live-pill { padding: 7px 10px; border-radius: 999px; background: #eafbf4; color: #087f59; font-size: .72rem; font-weight: 900; }
    .status-panel { border-radius: 22px; background: var(--navy); color: white; padding: 24px; overflow: hidden; position: relative; }
    .status-panel::after { content: ""; position: absolute; width: 210px; height: 210px; border-radius: 50%; background: rgba(105,213,255,.16); right: -90px; top: -100px; }
    .status-label { color: rgba(255,255,255,.64); font-size: .8rem; font-weight: 700; }
    .status-main { font-size: 1.65rem; font-weight: 900; letter-spacing: -.03em; margin: 6px 0 18px; }
    .progress { height: 9px; background: rgba(255,255,255,.12); border-radius: 999px; overflow: hidden; }
    .progress span { display: block; width: 72%; height: 100%; background: linear-gradient(90deg, var(--cyan), var(--yellow)); border-radius: inherit; }
    .status-meta { display: flex; justify-content: space-between; color: rgba(255,255,255,.7); font-size: .74rem; margin-top: 10px; }
    .mini-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; margin-top: 13px; }
    .mini-card { border: 1px solid var(--line); border-radius: 18px; padding: 17px; background: white; }
    .mini-card small { display: block; color: var(--muted); font-weight: 700; margin-bottom: 5px; }
    .mini-card strong { font-size: 1.07rem; }
    .mini-card .good { color: var(--success); }
    .alert-card { margin-top: 13px; padding: 15px 16px; border-radius: 16px; background: #fff8df; display: flex; gap: 12px; align-items: flex-start; border: 1px solid #ffe39a; }
    .alert-icon { width: 34px; height: 34px; border-radius: 10px; flex: 0 0 auto; display: grid; place-items: center; background: var(--yellow); }
    .alert-card strong { display: block; font-size: .89rem; }
    .alert-card p { margin: 2px 0 0; font-size: .77rem; color: #786b40; }

    .logo-strip { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); padding: 24px 0; background: white; }
    .logo-strip-inner { display: flex; align-items: center; justify-content: center; gap: 14px 42px; flex-wrap: wrap; color: var(--muted); font-size: .86rem; font-weight: 800; text-align: center; }
    .logo-strip strong { color: var(--ink); }
    .dot { width: 4px; height: 4px; border-radius: 50%; background: #b5c1cf; }

    .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
    .step { border: 1px solid var(--line); border-radius: 24px; padding: 28px; background: white; position: relative; overflow: hidden; }
    .step:hover { box-shadow: 0 18px 46px rgba(7,24,47,.08); transform: translateY(-4px); transition: .25s ease; }
    .step-num { font-size: .76rem; font-weight: 900; color: var(--blue); text-transform: uppercase; letter-spacing: .12em; }
    .step-icon { width: 52px; height: 52px; border-radius: 16px; display: grid; place-items: center; margin: 20px 0 22px; background: var(--soft); color: var(--blue); }
    .step-icon svg { width: 25px; }
    .step h3 { margin: 0 0 9px; font-size: 1.24rem; letter-spacing: -.02em; }
    .step p { margin: 0; color: var(--muted); }

    .membership { background: var(--soft); }
    .membership-grid { display: grid; grid-template-columns: .9fr 1.1fr; gap: 64px; align-items: center; }
    .pricing-stack { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: stretch; }
    .price-card.light-card { background: white; color: var(--ink); border: 1px solid var(--line); }
    .price-card.light-card::before { background: radial-gradient(circle, rgba(20,110,245,.10), transparent 66%); }
    .price-card.light-card .price-badge { background: #eef5ff; border-color: #d8e6ff; color: var(--blue); }
    .price-card.light-card > p { color: var(--muted); }
    .price-card.light-card ul { border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
    .price-card.light-card li { color: var(--ink); }
    .price-card.light-card li svg { color: var(--blue); }
    .price-card.light-card .btn { background: var(--navy); color: white; }

    .membership-copy h2 { font-size: clamp(2.35rem, 4.6vw, 4rem); line-height: 1; letter-spacing: -.05em; margin: 18px 0; }
    .membership-copy p { color: var(--muted); font-size: 1.08rem; }
    .feature-list { display: grid; gap: 13px; margin: 28px 0 32px; }
    .feature { display: flex; gap: 12px; align-items: flex-start; font-weight: 700; }
    .feature i { width: 24px; height: 24px; border-radius: 50%; background: #dff8ed; color: var(--success); display: grid; place-items: center; flex: 0 0 auto; font-style: normal; }
    .feature i svg { width: 15px; }
    .price-card { background: var(--navy); color: white; padding: 38px; border-radius: 30px; box-shadow: var(--shadow); position: relative; overflow: hidden; }
    .price-card::before { content: ""; position: absolute; width: 360px; height: 360px; border-radius: 50%; background: radial-gradient(circle, rgba(105,213,255,.22), transparent 66%); right: -120px; top: -130px; }
    .price-badge { display: inline-block; padding: 8px 11px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.12); border-radius: 999px; color: var(--cyan); font-size: .78rem; font-weight: 900; }
    .price { display: flex; align-items: end; gap: 8px; margin: 24px 0 9px; }
    .price strong { font-size: 4.25rem; line-height: .85; letter-spacing: -.07em; }
    .price span { color: rgba(255,255,255,.66); font-weight: 700; }
    .price-card > p { color: rgba(255,255,255,.7); margin: 0 0 24px; }
    .price-card ul { list-style: none; padding: 22px 0; margin: 0; border-top: 1px solid rgba(255,255,255,.12); border-bottom: 1px solid rgba(255,255,255,.12); display: grid; gap: 14px; }
    .price-card li { display: flex; gap: 10px; align-items: center; color: rgba(255,255,255,.88); }
    .price-card li svg { width: 17px; color: var(--cyan); }
    .price-card .btn { width: 100%; margin-top: 24px; background: var(--yellow); color: var(--navy); min-height: 53px; }
    .price-card small { display: block; text-align: center; color: rgba(255,255,255,.5); margin-top: 12px; }
    .price-card.light-card small { color: var(--muted); }

    .benefits-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
    .benefit { background: white; border: 1px solid var(--line); border-radius: 22px; padding: 26px; display: flex; gap: 18px; }
    .benefit-icon { width: 46px; height: 46px; border-radius: 14px; background: #eaf3ff; color: var(--blue); display: grid; place-items: center; flex: 0 0 auto; }
    .benefit-icon svg { width: 23px; }
    .benefit h3 { margin: 0 0 6px; font-size: 1.1rem; }
    .benefit p { margin: 0; color: var(--muted); font-size: .95rem; }

    .quote-section { padding: 96px 0; background: linear-gradient(145deg, var(--navy), var(--navy-2)); color: white; position: relative; overflow: hidden; }
    .quote-section::before { content: ""; position: absolute; width: 520px; height: 520px; border-radius: 50%; background: radial-gradient(circle, rgba(20,110,245,.45), transparent 68%); left: -190px; top: -260px; }
    .quote-grid { position: relative; display: grid; grid-template-columns: .85fr 1.15fr; gap: 56px; align-items: start; }
    .quote-copy h2 { font-size: clamp(2.4rem, 5vw, 4.35rem); line-height: .98; letter-spacing: -.055em; margin: 18px 0; }
    .quote-copy p { color: rgba(255,255,255,.7); font-size: 1.06rem; }
    .quote-copy .eyebrow { background: rgba(105,213,255,.12); color: var(--cyan); }
    .quote-copy .eyebrow::before { background: var(--cyan); box-shadow: 0 0 0 5px rgba(105,213,255,.12); }
    .quote-note { margin-top: 28px; padding: 17px; border-radius: 16px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); font-size: .9rem; color: rgba(255,255,255,.78); }
    .quote-form { background: white; color: var(--ink); border-radius: 28px; padding: 30px; box-shadow: 0 28px 70px rgba(0,0,0,.22); }
    .form-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 22px; }
    .form-head h3 { margin: 0; font-size: 1.35rem; }
    .secure { font-size: .76rem; color: var(--success); font-weight: 900; display: flex; align-items: center; gap: 6px; }
    .secure svg { width: 16px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .field { display: grid; gap: 7px; }
    .field.full { grid-column: 1 / -1; }
    label { font-size: .82rem; color: #465570; font-weight: 800; }
    input, select { width: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 13px 14px; outline: none; color: var(--ink); background: #fff; }
    input:focus, select:focus { border-color: var(--blue); box-shadow: 0 0 0 4px rgba(20,110,245,.1); }
    .form-consent { display: flex; gap: 10px; color: var(--muted); font-size: .76rem; margin: 16px 0; }
    .form-consent input { width: auto; margin-top: 4px; }
    .quote-form .btn { width: 100%; min-height: 52px; }
    .form-error { margin: 0 0 14px; padding: 11px 14px; border-radius: 12px; background: #fdeeee; border: 1px solid #f5c6c6; color: #a13030; font-size: .86rem; font-weight: 700; }

    .quote-done { text-align: center; padding: 56px 30px; }
    .done-icon { width: 62px; height: 62px; border-radius: 50%; background: #dff8ed; color: var(--success); display: grid; place-items: center; margin: 0 auto 18px; }
    .quote-done h3 { margin: 0 0 10px; font-size: 1.5rem; }
    .quote-done p { color: var(--muted); margin: 0 0 8px; }
    .done-sub a { color: var(--blue); }

    .faq-wrap { max-width: 850px; margin: 0 auto; }
    .faq-item { border-bottom: 1px solid var(--line); }
    .faq-q { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 20px; text-align: left; padding: 22px 0; border: 0; background: transparent; cursor: pointer; color: var(--ink); font-weight: 850; font-size: 1.04rem; }
    .faq-plus { width: 30px; height: 30px; border-radius: 9px; background: var(--soft); display: grid; place-items: center; flex: 0 0 auto; transition: transform .2s; }
    .faq-a { display: none; padding: 0 50px 22px 0; color: var(--muted); }
    .faq-item.open .faq-a { display: block; }
    .faq-item.open .faq-plus { transform: rotate(45deg); }

    .cta-band { padding: 0 0 90px; }
    .cta-box { border-radius: 28px; background: linear-gradient(120deg, #eaf4ff, #f7fbff 60%, #fff8dd); padding: 44px; display: flex; justify-content: space-between; align-items: center; gap: 30px; border: 1px solid #d9e9fa; }
    .cta-box h2 { margin: 0 0 8px; font-size: clamp(1.8rem, 4vw, 2.8rem); letter-spacing: -.04em; }
    .cta-box p { margin: 0; color: var(--muted); }
    .cta-actions { display: flex; gap: 10px; flex: 0 0 auto; }

    footer { background: #051326; color: rgba(255,255,255,.68); padding: 58px 0 26px; }
    .footer-grid { display: grid; grid-template-columns: 1.5fr .7fr .7fr 1fr; gap: 42px; padding-bottom: 42px; }
    footer .brand { color: white; margin-bottom: 16px; }
    .footer-about { max-width: 390px; font-size: .9rem; }
    .footer-col h4 { color: white; margin: 0 0 15px; font-size: .9rem; }
    .footer-col a { display: block; margin: 10px 0; font-size: .88rem; }
    .footer-col a:hover { color: white; }
    .footer-bottom { border-top: 1px solid rgba(255,255,255,.1); padding-top: 22px; display: flex; justify-content: space-between; gap: 20px; font-size: .75rem; }
    .powered { color: rgba(255,255,255,.45); }

    .mobile-cta { display: none; }

    .join-overlay { position: fixed; inset: 0; z-index: 60; background: rgba(7,24,47,.62); backdrop-filter: blur(6px); display: grid; place-items: center; padding: 18px; overflow-y: auto; }
    .join-modal { width: min(560px, 100%); background: white; color: var(--ink); border-radius: 24px; padding: 28px; box-shadow: 0 34px 90px rgba(0,0,0,.35); max-height: calc(100vh - 36px); overflow-y: auto; }
    .join-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
    .join-head h3 { margin: 12px 0 0; font-size: 1.45rem; letter-spacing: -.02em; }
    .join-head .price-badge { background: #eef5ff; border: 1px solid #d8e6ff; color: var(--blue); }
    .join-close { width: 36px; height: 36px; border: 1px solid var(--line); background: white; border-radius: 10px; cursor: pointer; color: var(--muted); flex: 0 0 auto; }
    .join-submit { width: 100%; min-height: 52px; margin-top: 16px; }
    .join-fine { margin: 12px 0 0; color: var(--muted); font-size: .76rem; text-align: center; }
    .join-done { text-align: center; padding: 26px 6px 10px; }
    .join-done h3 { margin: 0 0 10px; font-size: 1.4rem; }
    .join-done p { color: var(--muted); margin: 0 0 10px; }
    .join-ref { font-size: .85rem; }
    .join-done .btn { min-width: 160px; margin-top: 10px; }

    @media (max-width: 960px) {
      .nav-links, .nav-actions .btn-light { display: none; }
      .menu-btn { display: grid; place-items: center; }
      .nav-links.mobile-open { display: grid; position: absolute; left: 20px; right: 20px; top: 70px; background: white; border: 1px solid var(--line); padding: 20px; border-radius: 16px; box-shadow: var(--shadow); gap: 16px; }
      .hero-grid, .membership-grid, .quote-grid { grid-template-columns: 1fr; }
      .pricing-stack { grid-template-columns: 1fr; }
      .hero-grid { gap: 48px; }
      .dashboard-card { max-width: 650px; }
      .membership-grid { gap: 40px; }
      .quote-grid { gap: 38px; }
      .footer-grid { grid-template-columns: 1.2fr 1fr 1fr; }
      .footer-grid > :first-child { grid-column: 1 / -1; }
    }

    @media (max-width: 700px) {
      .container { width: min(calc(100% - 28px), var(--max)); }
      .section { padding: 72px 0; }
      .hero { padding: 62px 0 56px; }
      .hero h1 { font-size: clamp(2.75rem, 14vw, 4.1rem); }
      .hero-actions { display: grid; }
      .hero-actions .btn { width: 100%; }
      .steps, .benefits-grid, .form-grid, .pricing-stack { grid-template-columns: 1fr; }
      .field.full { grid-column: auto; }
      .mini-grid { grid-template-columns: 1fr; }
      .price-card, .quote-form { padding: 24px; }
      .price strong { font-size: 3.6rem; }
      .cta-box { padding: 30px 24px; display: grid; }
      .cta-actions { width: 100%; display: grid; }
      .footer-grid { grid-template-columns: 1fr 1fr; gap: 30px; }
      .footer-grid > :first-child { grid-column: 1 / -1; }
      .footer-bottom { flex-direction: column; }
      .mobile-cta { display: flex; position: fixed; z-index: 40; bottom: 12px; left: 12px; right: 12px; gap: 8px; background: rgba(255,255,255,.94); backdrop-filter: blur(16px); border: 1px solid var(--line); box-shadow: 0 18px 45px rgba(7,24,47,.2); padding: 8px; border-radius: 16px; }
      .mobile-cta .btn { flex: 1; padding: 12px 9px; font-size: .84rem; }
      body { padding-bottom: 78px; }
    }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; }
    }
`;
