export default function TermsPage() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: March 14, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using Nebula Crawl, you agree to be bound by these Terms of Service. If you do not agree, you may not use the service.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. Use of the Service</h2>
            <p>You may use our API and related services only for lawful purposes and in accordance with these terms. You are responsible for all activity under your account.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. API Usage</h2>
            <p>API usage is subject to rate limits and credit allocations based on your subscription plan. Exceeding your plan limits may result in throttled or suspended access.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Payment &amp; Billing</h2>
            <p>Paid plans are billed monthly or annually. Refunds are handled on a case-by-case basis. You may cancel your subscription at any time.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Limitation of Liability</h2>
            <p>Nebula Crawl is provided "as is" without warranties. We are not liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">6. Contact</h2>
            <p>For questions about these terms, please visit our <a href="/contact" className="text-primary hover:underline">contact page</a>.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
