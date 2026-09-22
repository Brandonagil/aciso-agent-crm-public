import { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'AI Agent Dashboard'
};

export default function DashboardPage() {
  // Redirect to the overview page by default
  redirect('/dashboard/overview');
}