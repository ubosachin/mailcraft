'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function EditorRedirector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Initializing editor...');

  useEffect(() => {
    async function resolveRoute() {
      const explicitId = searchParams.get('id') || searchParams.get('campaignId');
      if (explicitId) {
        router.replace(`/editor/${explicitId}`);
        return;
      }

      const templateSlug = searchParams.get('template');
      if (templateSlug) {
        setStatus(`Setting up campaign with template "${templateSlug}"...`);
        try {
          const cloneRes = await fetch(`/api/v1/templates/${templateSlug}/clone`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ campaignName: 'New Campaign' }),
          });

          if (cloneRes.ok) {
            const cloneData = await cloneRes.json();
            router.replace(`/editor/${cloneData.data.campaignId}`);
            return;
          }
        } catch {
          // fallback to templates
        }
      }

      // Check existing draft campaigns
      try {
        const campRes = await fetch('/api/v1/campaigns', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (campRes.status === 401) {
          window.location.assign('/login?redirect=/editor');
          return;
        }
        if (campRes.ok) {
          const campData = await campRes.json();
          const list = Array.isArray(campData.data?.campaigns)
            ? campData.data.campaigns
            : Array.isArray(campData.data)
            ? campData.data
            : [];
          if (list.length > 0) {
            const latest = list[0];
            router.replace(`/editor/${latest.id}`);
            return;
          }
        }
      } catch {
        // continue
      }

      // If no campaign exists yet, redirect to choose a template
      router.replace('/templates');
    }

    resolveRoute();
  }, [router, searchParams]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
      <h2 className="text-sm font-bold text-slate-800">{status}</h2>
      <p className="text-xs text-slate-500 mt-1">
        Loading your promotional workspace
      </p>
    </div>
  );
}

export default function EditorRootPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <h2 className="text-sm font-bold text-slate-800">
            Connecting to MailCraft Studio...
          </h2>
        </div>
      }
    >
      <EditorRedirector />
    </Suspense>
  );
}
