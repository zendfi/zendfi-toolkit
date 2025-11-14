
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'CredentialsSignin':
        return 'Invalid email or password. Please try again.';
      case 'EmailSignin':
        return 'Error sending email. Please try again.';
      case 'OAuthSignin':
        return 'Error with OAuth provider. Please try again.';
      case 'OAuthCallback':
        return 'Error in OAuth callback. Please try again.';
      case 'OAuthCreateAccount':
        return 'Could not create OAuth account. Please try again.';
      case 'EmailCreateAccount':
        return 'Could not create email account. Please try again.';
      case 'Callback':
        return 'Error in callback. Please try again.';
      case 'OAuthAccountNotLinked':
        return 'This email is already associated with another account.';
      case 'SessionRequired':
        return 'Please sign in to access this page.';
      case 'Default':
      default:
        return 'An authentication error occurred. Please try again.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="bg-gradient-to-br from-gray-900 to-gray-950 rounded-2xl border border-gray-800 p-8 shadow-xl">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-white mb-2">
            Authentication Error
          </h1>

          {/* Error Message */}
          <p className="text-gray-400 text-center mb-8">
            {getErrorMessage(error)}
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="block w-full rounded-lg bg-gradient-to-r from-[#5B6EE8] to-[#4C5FD5] px-4 py-3 text-center font-medium text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
            >
              Try Again
            </Link>

            <Link
              href="/auth/signup"
              className="block w-full rounded-lg border border-gray-700 bg-gray-800/50 px-4 py-3 text-center text-gray-300 hover:bg-gray-800 hover:text-white transition-all"
            >
              Create Account
            </Link>

            <Link
              href="/"
              className="block w-full text-center text-gray-500 hover:text-gray-300 transition-colors mt-4"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
}
