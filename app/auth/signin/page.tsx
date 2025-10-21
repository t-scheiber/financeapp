import Image from "next/image";
import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <Image
              src="/icon.svg"
              alt="FinanceApp logo"
              width={48}
              height={48}
              priority
            />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Sign in to Finance App
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Access our financial dashboard
          </p>
        </div>
        <div className="mt-8 space-y-6">
          <form
            action={async () => {
              "use server";
              await signIn("google", {
                redirectTo: "/",
              });
            }}
            className="space-y-4"
          >
            <Button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in with Google
            </Button>
          </form>

          <div className="text-center pt-4 border-t border-gray-200">
            <div className="flex justify-center space-x-6 text-sm">
              <a
                href="/privacy-policy"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Privacy Policy
              </a>
              <span className="text-gray-400">|</span>
              <a
                href="/terms-of-service"
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
