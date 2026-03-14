export default function PrivacyPage() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: March 14, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">1. Information We Collect</h2>
            <p>We collect information you provide directly, such as your name, email address, and payment details when you create an account or subscribe to a plan. We also collect usage data including API calls, pages visited, and device information.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">2. How We Use Your Information</h2>
            <p>We use the information we collect to provide, maintain, and improve our services, process transactions, send service-related communications, and ensure the security of our platform.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">3. Data Sharing</h2>
            <p>We do not sell your personal information. We may share data with service providers who assist in operating our platform, or when required by law.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">4. Data Retention</h2>
            <p>We retain your data for as long as your account is active or as needed to provide services. You may request deletion of your data at any time by contacting us.</p>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-foreground mb-2">5. Contact</h2>
            <p>If you have questions about this Privacy Policy, please reach out via our <a href="/contact" className="text-primary hover:underline">contact page</a>.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
