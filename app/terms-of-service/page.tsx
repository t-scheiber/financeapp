export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-card rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-foreground mb-8">
            Terms of Service
          </h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-muted-foreground mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                1. Acceptance of Terms
              </h2>
              <p className="text-foreground mb-4">
                Welcome to FinanceApp. This is a{" "}
                <strong>
                  hobby project created for private/personal use only
                </strong>
                . The source code is open source under the MIT license, meaning
                anyone can clone, fork, or use this code for their own purposes.
                However,{" "}
                <strong>
                  access to this hosted application instance is restricted to
                  selected individuals only
                </strong>
                .
              </p>
              <p className="text-foreground mb-4">
                By accessing and using this service, you accept and agree to be
                bound by the terms and provision of this agreement. If you do
                not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                2. Description of Service
              </h2>
              <p className="text-foreground mb-4">
                FinanceApp is a personal financial dashboard application created
                as a hobby project. It provides selected users with access to
                stock prices, financial news, dividend information, and related
                financial data. The service aggregates data from various
                financial APIs and presents it in an easy-to-use dashboard
                format.
              </p>
              <div className="bg-accent/10 border-l-4 border-accent p-4 mb-4">
                <p className="text-accent">
                  <strong>Important:</strong> While the source code is freely
                  available under the MIT license, access to this particular
                  hosted instance is by invitation only. The code can be used by
                  anyone for any purpose, but this specific deployment serves
                  only authorized users.
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                3. User Accounts and Registration
              </h2>

              <h3 className="text-xl font-medium text-foreground mb-3">
                3.1 Account Creation
              </h3>
              <p className="text-foreground mb-4">
                To use FinanceApp, you must authenticate using your Google
                account. By signing in with Google, you agree to allow
                FinanceApp to access basic profile information from your Google
                account.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3">
                3.2 Account Responsibilities
              </h3>
              <p className="text-foreground mb-4">You are responsible for:</p>
              <ul className="list-disc pl-6 text-foreground mb-4">
                <li>
                  Maintaining the confidentiality of your account credentials
                </li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use</li>
                <li>
                  Ensuring your account information is accurate and up-to-date
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                4. Acceptable Use Policy
              </h2>
              <p className="text-foreground mb-4">
                You agree not to use FinanceApp to:
              </p>
              <ul className="list-disc pl-6 text-foreground mb-4">
                <li>
                  Violate any local, state, national, or international law or
                  regulation
                </li>
                <li>
                  Transmit any material that is unlawful, harmful, threatening,
                  abusive, or objectionable
                </li>
                <li>
                  Attempt to gain unauthorized access to our systems or other
                  users' accounts
                </li>
                <li>
                  Use automated tools to scrape or download data without
                  permission
                </li>
                <li>Interfere with or disrupt our service or servers</li>
                <li>
                  Use the service for any commercial purposes without our
                  written consent
                </li>
                <li>Share your account credentials with others</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                5. Financial Data and Investment Decisions
              </h2>

              <h3 className="text-xl font-medium text-foreground mb-3">
                5.1 No Investment Advice
              </h3>
              <p className="text-foreground mb-4">
                FinanceApp provides financial data and information for
                informational purposes only. Nothing on our platform constitutes
                investment advice, recommendations, or solicitations to buy or
                sell securities.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3">
                5.2 Data Accuracy
              </h3>
              <p className="text-foreground mb-4">
                While we strive to provide accurate financial data, we cannot
                guarantee the accuracy, completeness, or timeliness of
                information provided by third-party sources. Financial markets
                are volatile and data may be delayed or incorrect.
              </p>

              <h3 className="text-xl font-medium text-foreground mb-3">
                5.3 Investment Decisions
              </h3>
              <p className="text-foreground mb-4">
                You acknowledge that any investment decisions you make based on
                information from FinanceApp are solely your responsibility. We
                strongly recommend consulting with qualified financial advisors
                before making investment decisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                6. Intellectual Property Rights
              </h2>
              <p className="text-foreground mb-4">
                The FinanceApp service and its original content, features, and
                functionality are owned by FinanceApp and are protected by
                international copyright, trademark, patent, trade secret, and
                other intellectual property laws.
              </p>
              <p className="text-foreground mb-4">
                You may not reproduce, distribute, modify, or create derivative
                works of our content without our express written permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                7. Third-Party Services and APIs
              </h2>
              <p className="text-foreground mb-4">
                FinanceApp integrates with third-party financial data providers
                and news sources. These services are subject to their own terms
                of service and privacy policies. We are not responsible for the
                availability, accuracy, or practices of these third-party
                services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                8. Disclaimer of Warranties
              </h2>
              <p className="text-foreground mb-4">
                FinanceApp is provided "as is" and "as available" without
                warranties of any kind, either express or implied, including but
                not limited to:
              </p>
              <ul className="list-disc pl-6 text-foreground mb-4">
                <li>Merchantability or fitness for a particular purpose</li>
                <li>Accuracy or reliability of financial data</li>
                <li>Uninterrupted or error-free service</li>
                <li>Security of the service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                9. Limitation of Liability
              </h2>
              <p className="text-foreground mb-4">
                To the maximum extent permitted by law, FinanceApp shall not be
                liable for any indirect, incidental, special, consequential, or
                punitive damages, or any loss of profits or revenues, whether
                incurred directly or indirectly, or any loss of data, use,
                goodwill, or other intangible losses resulting from:
              </p>
              <ul className="list-disc pl-6 text-foreground mb-4">
                <li>Your use or inability to use our service</li>
                <li>Any unauthorized access to our systems</li>
                <li>Investment decisions made based on our data</li>
                <li>Any bugs, viruses, or other harmful components</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                10. Indemnification
              </h2>
              <p className="text-foreground mb-4">
                You agree to indemnify and hold FinanceApp harmless from any
                claims, damages, losses, costs, and expenses (including legal
                fees) arising from your use of our service or violation of these
                Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                11. Termination
              </h2>
              <p className="text-foreground mb-4">
                We may terminate or suspend your account and access to our
                service at our sole discretion, without prior notice, for
                conduct that we believe violates these Terms or is harmful to
                other users, us, or third parties, or for any other reason.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                12. Changes to Terms
              </h2>
              <p className="text-foreground mb-4">
                We reserve the right to modify these Terms at any time. We will
                notify users of material changes by posting the updated Terms on
                our website and updating the "Last updated" date. Your continued
                use of FinanceApp after changes become effective constitutes
                acceptance of the modified Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                13. Governing Law
              </h2>
              <p className="text-foreground mb-4">
                These Terms shall be governed by and construed in accordance
                with the laws of Austria, without regard to conflict
                of law principles. Any disputes arising from these Terms or your
                use of FinanceApp shall be subject to the exclusive jurisdiction
                of the courts in Austria.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                14. Severability
              </h2>
              <p className="text-foreground mb-4">
                If any provision of these Terms is found to be unenforceable or
                invalid, that provision will be limited or eliminated to the
                minimum extent necessary so that the Terms will otherwise remain
                in full force and effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                15. Contact Information
              </h2>
              <p className="text-foreground mb-4">
                If you have any questions about these Terms of Service, please
                contact us:
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
