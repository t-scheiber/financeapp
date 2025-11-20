import Image from "next/image";
import Link from "next/link";
import { Dashboard } from "@/components/dashboard";
import { Button } from "@/components/ui/button";
import { getServerSession } from "@/lib/auth-server";
import { getDashboardSnapshot } from "@/lib/services/dashboard";
import { ensureUserByEmail } from "@/lib/services/users";
import { CRON_INTERVAL_HOURS } from "@/lib/constants/limits";
import { Bell, LineChart, Shield, TrendingUp } from "lucide-react";

export default async function Home() {
  const session = await getServerSession();

  if (session?.user) {
    const snapshot = await getDashboardSnapshot();
    const userRecord =
      session.user.email
        ? await ensureUserByEmail({
            email: session.user.email,
            name: session.user.name ?? null,
            image: session.user.image ?? null,
          })
        : null;
    return (
      <div className="min-h-screen">
        <Dashboard
          initialCompanies={snapshot}
          generatedAt={new Date().toISOString()}
          initialGuideSeen={userRecord?.hasSeenGuide ?? true}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <section className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-4 pb-16 pt-20 sm:px-6 lg:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_50%_-20%,color-mix(in_oklch,var(--accent)_18%,transparent),transparent_60%)] opacity-70"
          />

          <div className="max-w-4xl space-y-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent/10">
              <Image
                src="/icon.svg"
                alt="FinanceApp logo"
                width={56}
                height={56}
                priority
              />
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Track Your Financial Future
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
                Monitor stock prices, dividends, and market news for your
                portfolio. Get real-time insights and make informed investment
                decisions.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="shadow-lg shadow-accent/20">
                <Link href="/auth/signin">Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8"
        >
          <div className="mb-12 space-y-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything You Need to Stay Informed
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Comprehensive tools to track and analyze your investments
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <TrendingUp className="h-6 w-6" />,
                title: "Real-Time Prices",
                description:
                  `Track stock prices with automatic updates every ${CRON_INTERVAL_HOURS} hours`,
              },
              {
                icon: <LineChart className="h-6 w-6" />,
                title: "Dividend Tracking",
                description:
                  "Monitor dividend payments and history for your holdings",
              },
              {
                icon: <Bell className="h-6 w-6" />,
                title: "Price Alerts",
                description:
                  "Get notified when stocks reach your target prices",
              },
              {
                icon: <Shield className="h-6 w-6" />,
                title: "Secure & Private",
                description:
                  "Your data is encrypted and protected with enterprise-grade security",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="glass-panel rounded-3xl p-6 text-center"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
                  {feature.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="glass-panel rounded-3xl p-8 text-center sm:p-12">
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-muted-foreground">
              Sign in now to access your personalized financial dashboard
            </p>
            <Button asChild size="lg" className="shadow-lg shadow-accent/20">
              <Link href="/auth/signin">Sign In to Continue</Link>
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
