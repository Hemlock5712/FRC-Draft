'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { ThemeSwitcher } from '~/components/ThemeSwitcher';

export default function Navigation() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold text-primary-600 hover:text-primary-700">
              Fantasy Draft
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {!session ? (
              <Link
                href="/auth/signin"
                className="px-4 py-2 rounded-md bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors"
              >
                Log In
              </Link>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-md bg-primary-100 text-primary-700 hover:bg-primary-200 transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut()}
                  className="px-4 py-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            )}
            
            <Link
              href="/about"
              className="px-4 py-2 rounded-md bg-secondary-100 text-secondary-900 hover:bg-secondary-200 transition-colors"
            >
              About
            </Link>
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </nav>
  );
} 