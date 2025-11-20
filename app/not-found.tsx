import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-8xl font-bold text-accent">404</h1>
          <h2 className="text-2xl font-semibold text-foreground">
            Page Not Found
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Sorry, we couldn't find the page you're looking for. The page may
            have been moved or doesn't exist.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link href="/">
            <Button variant="default" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              Search Companies
            </Button>
          </Link>
        </div>

        <div className="pt-8 text-xs text-muted-foreground">
          <p>
            Need help?{" "}
            <Link
              href="/settings"
              className="text-accent hover:underline font-medium"
            >
              Visit Settings
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

