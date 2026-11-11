import { Browser } from '@capacitor/browser';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/api/client';
import type { Notification } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { env } from '@/config/env';
import { EmptyState, ErrorState, LinkButton, Skeleton, TopBar } from '@/components/ui';
import { relative } from '@/lib/format';
import { appPathFor } from '@/lib/links';
import { useApi } from '@/lib/useApi';

/** Updates about requests, offers, trips and listings. Real notifications only. */
export function Inbox() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const signedIn = state.status === 'signed-in';
  const { data, error, loading, reload } = useApi<{ items: Notification[]; unread: number }>(signedIn ? '/api/mobile/v1/notifications' : null);
  const [busy, setBusy] = useState(false);

  const open = async (n: Notification) => {
    if (!n.read) void api(`/api/mobile/v1/notifications/${n.id}/read`, { method: 'POST' }).then(reload).catch(() => {});
    if (!n.link) return;
    const inApp = appPathFor(n.link);
    if (inApp) navigate(inApp);
    else await Browser.open({ url: `${env.apiBaseUrl}${n.link}` });
  };

  const markAll = async () => {
    setBusy(true);
    await api('/api/mobile/v1/notifications/read-all', { method: 'POST' }).catch(() => {});
    setBusy(false);
    reload();
  };

  return (
    <div className="min-h-full bg-paper">
      <TopBar
        title="Inbox"
        action={data && data.unread > 0 ? <button type="button" disabled={busy} onClick={() => void markAll()} className="h-11 px-3 text-[13.5px] font-medium text-sectional">Mark all read</button> : undefined}
      />
      {state.status === 'signed-out' && <EmptyState title="Sign in to see updates" action={<LinkButton to="/auth/sign-in?next=/inbox">Sign in</LinkButton>} />}
      {signedIn && loading && !data && <Skeleton />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && data.items.length === 0 && <EmptyState title="Nothing here yet">Updates about your requests, offers and trips will appear here.</EmptyState>}
      {data && data.items.length > 0 && (
        <ul className="divide-y divide-line">
          {data.items.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => void open(n)} className="grid w-full grid-cols-[10px_1fr] gap-4 px-6 py-5 text-left">
                <span className={`mt-2 size-2 rounded-full ${n.read ? '' : 'bg-magenta'}`} aria-label={n.read ? 'Read' : 'Unread'} />
                <span className="min-w-0">
                  <span className={`block text-[15px] ${n.read ? 'text-ink-2' : 'font-semibold text-ink'}`}>{n.title}</span>
                  <span className="mt-0.5 block text-[14px] leading-relaxed text-muted">{n.body}</span>
                  <span className="strip mt-1.5 block text-[11.5px] text-muted">{relative(n.createdAt)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
