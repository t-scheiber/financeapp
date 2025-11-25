export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm sm:rounded-3xl sm:p-8">
          <h1 className="text-2xl font-bold text-foreground mb-6 sm:text-3xl sm:mb-8">
            Privacy Policy
          </h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-muted-foreground mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                1. Introduction
              </h2>
              <p className="text-foreground mb-4">
                Welcome to FinanceApp ("we," "our," or "us"). This is a{" "}
                <strong>personal hobby project created for private use</strong>.
                The source code is open source under the MIT license, meaning
                anyone can clone, fork, or use this code for their own purposes.
                However,{" "}
                <strong>
                  access to this hosted application instance is restricted to
                  selected individuals only
                </strong>
                .
              </p>
              <p className="text-foreground mb-4">
                We respect your privacy and are committed to protecting your
                personal information. This Privacy Policy explains how we
                collect, use, disclose, and safeguard your information when you
                use our financial dashboard application.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                2. Information We Collect
              </h2>

              <h3 className="text-xl font-medium text-foreground mb-3">
                2.1 Personal Information
              </h3>
              <p className="text-foreground mb-4">
                When you use FinanceApp, we may collect personal information
                that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 text-foreground mb-4">
                <li>Name and email address (when you sign in with Google)</li>
                <li>Profile information from your Google account</li>
                <li>Usage data and preferences</li>
              </ul>

              <h3 className="text-xl font-medium text-foreground mb-3">
                2.2 Automatically Collected Information
              </h3>
              <p className="text-foreground mb-4">
                We automatically collect certain information when you use our
                service:
              </p>
              <ul className="list-disc pl-6 text-foreground mb-4">
                <li>IP address and device information</li>
                <li>Browser type and version</li>
                <li>Pages visited and time spent on our application</li>
                <li>Referring website information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-foreground mb-4">
                We use the collected information for various purposes:
              </p>
              <ul className="list-disc pl-6 text-foreground mb-4">
                <li>Provide and maintain our financial dashboard service</li>
                <li>Authenticate users and manage accounts</li>
                <li>Display relevant financial data and news</li>
                <li>Improve our application and develop new features</li>
                <li>Communicate with you about updates and support</li>
                <li>Ensure security and prevent fraud</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                4. Information Sharing and Disclosure
              </h2>
              <p className="text-foreground mb-4">
                We do not sell, trade, or otherwise transfer your personal
                information to third parties without your consent, except as
                described in this policy:
              </p>
              <ul className="list-disc pl-6 text-foreground mb-4">
                <li>
                  <strong>Service Providers:</strong> We may share information
                  with trusted third-party service providers who assist us in
                  operating our application
                </li>
                <li>
                  <strong>Legal Requirements:</strong> We may disclose
                  information if required by law or to protect our rights
                </li>
                <li>
                  <strong>Business Transfers:</strong> In the event of a merger
                  or acquisition, user information may be transferred
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                5. Data Security
              </h2>
              <p className="text-foreground mb-4">
                We implement appropriate security measures to protect your
                personal information:
              </p>
              <ul className="list-disc pl-6 text-foreground mb-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments</li>
                <li>Access controls and authentication requirements</li>
                <li>Secure data centers and infrastructure</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                6. Data Retention
              </h2>
              <p className="text-foreground mb-4">
                We retain your personal information for as long as necessary to
                provide our services and fulfill the purposes outlined in this
                policy, unless a longer retention period is required by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                7. Your Rights
              </h2>
              <p className="text-foreground mb-4">
                Depending on your location, you may have the following rights
                regarding your personal information:
              </p>
              <ul className="list-disc pl-6 text-foreground mb-4">
                <li>Access to your personal information</li>
                <li>Correction of inaccurate information</li>
                <li>Deletion of your personal information</li>
                <li>Restriction of processing</li>
                <li>Data portability</li>
                <li>Objection to processing</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                8. Third-Party Services
              </h2>
              <p className="text-foreground mb-4">
                Our application integrates with third-party services for
                financial data and news:
              </p>
              <ul className="list-disc pl-6 text-foreground mb-4">
                <li>
                  <strong>Financial Data:</strong> Alpha Vantage API
                </li>
                <li>
                  <strong>News Data:</strong> NewsAPI
                </li>
                <li>
                  <strong>Authentication:</strong> Google OAuth
                </li>
              </ul>
              <p className="text-foreground mb-4">
                These services have their own privacy policies, and we encourage
                you to review them.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                9. Children's Privacy
              </h2>
              <p className="text-foreground mb-4">
                Our service is not intended for children under 13 years of age.
                We do not knowingly collect personal information from children
                under 13.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                10. Changes to This Policy
              </h2>
              <p className="text-foreground mb-4">
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by posting the new policy on this page
                and updating the "Last updated" date.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                11. Contact Us
              </h2>
              <p className="text-foreground mb-4">
                If you have any questions about this Privacy Policy or our
                privacy practices, please contact us at:
              </p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-foreground">
                  <strong>Email:</strong> financeapp@thomasscheiber.com
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
