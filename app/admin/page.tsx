'use client';

import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useRouter } from 'next/navigation';
import { Loader2, Search } from '@/components/icons';

// Use client-side fetch to get counselors (admin API or public list)
// For admin we need server-side; use API route that returns counselors (admin-only later)
interface CounselorRow {
  id: string;
  display_name: string;
  email: string;
  ms_graph_user_email: string;
  created_at: string;
}

export default function AdminPage() {
  const { accounts } = useMsal();
  const router = useRouter();
  const [counselors, setCounselors] = useState<CounselorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (accounts.length === 0) {
      router.replace('/login');
      return;
    }
    async function load() {
      try {
        const email = accounts[0]?.username;
        if (!email) return;
        const res = await fetch(`/api/admin/counselors?email=${encodeURIComponent(email)}`);
        if (res.status === 403 || res.status === 401) {
          router.replace('/login');
          return;
        }
        const data = await res.json().catch(() => ({}));
        setCounselors(data.counselors ?? []);
      } catch {
        setCounselors([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [accounts.length, accounts[0]?.username, router]);

  const filtered = counselors.filter(
    (c) =>
      c.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (accounts.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Redirecting to sign in...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="font-headline text-3xl font-bold text-foreground mb-2">Admin – Counselor Lookup</h1>
      <p className="text-muted-foreground mb-6">View and search all registered counselors.</p>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-input bg-background py-2 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
        />
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 font-semibold text-foreground">Name</th>
                <th className="px-4 py-3 font-semibold text-foreground">Email</th>
                <th className="px-4 py-3 font-semibold text-foreground">MS Graph Email</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 text-foreground">{c.display_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.ms_graph_user_email}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-muted-foreground">No counselors found.</p>
          )}
        </div>
      )}
    </div>
  );
}
