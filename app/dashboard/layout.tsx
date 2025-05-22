'use client';

import { redirect } from 'next/navigation';
import { authOptions } from '../../lib/auth';
import { useSession } from 'next-auth/react';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();

  // Redirect to sign in if not authenticated
  if (status === 'unauthenticated') {
    redirect('/auth/signin');
  }

  // Show loading state while checking session
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Dashboard</h1>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
} 