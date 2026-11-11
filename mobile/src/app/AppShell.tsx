import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { Icon, type IconName } from '@/components/Icon';
import { appPathFor } from '@/lib/links';
import { useOnline } from '@/lib/network';
import { PushBridge } from '@/native/push';

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/discover', label: 'Discover', icon: 'horizon' },
  { to: '/plan', label: 'Plan', icon: 'route' },
  { to: '/journeys', label: 'Journeys', icon: 'ticket' },
  { to: '/explore', label: 'Explore', icon: 'compass' },
  { to: '/profile', label: 'Profile', icon: 'person' },
];
const ROOTS = new Set(TABS.map((t) => t.to));

/** Native behaviour: Android back button, and theprivate.in links opening the matching screen. */
function useNativeNavigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const path = useRef(pathname);
  path.current = pathname;
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const back = App.addListener('backButton', () => {
      if (ROOTS.has(path.current)) void App.exitApp();
      else navigate(-1);
    });
    const link = App.addListener('appUrlOpen', ({ url }) => {
      // Only theprivate.in links are honoured, and only to known screens (lib/links.ts).
      const target = appPathFor(url);
      if (target) navigate(target);
    });
    return () => {
      void back.then((h) => h.remove());
      void link.then((h) => h.remove());
    };
  }, [navigate]);
}

/** One shell for both platforms: content, an offline banner, and the tab bar on main screens. */
export function AppShell() {
  const { pathname } = useLocation();
  const online = useOnline();
  const main = useRef<HTMLElement>(null);
  const showTabs = ROOTS.has(pathname);
  useNativeNavigation();
  // Braces matter: newer Chromium returns a Promise from scrollTo(), which React would treat as a cleanup.
  useEffect(() => {
    main.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex h-full flex-col bg-paper">
      {!online && (
        <div role="status" className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center gap-2 bg-night px-4 pb-2 text-[12.5px] text-paper" style={{ paddingTop: 'calc(var(--safe-top) + 6px)' }}>
          <Icon name="wifi-off" className="size-4" /> You’re offline. Showing what’s saved on this phone.
        </div>
      )}
      <PushBridge />
      <main ref={main} className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ paddingBottom: showTabs ? 'calc(var(--tabbar-h) + var(--safe-bottom))' : 'var(--safe-bottom)' }}>
        <Outlet />
      </main>
      {showTabs && (
        <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-night/88 backdrop-blur-xl" style={{ paddingBottom: 'var(--safe-bottom)' }}>
          <ul className="mx-auto grid max-w-lg grid-cols-5" style={{ height: 'var(--tabbar-h)' }}>
            {TABS.map((t) => (
              <li key={t.to} className="flex">
                <NavLink to={t.to} className={({ isActive }) => `flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-[10.5px] tracking-[0.02em] transition-colors duration-200 ${isActive ? 'text-paper' : 'text-paper/45'}`}>
                  {({ isActive }) => (
                    <>
                      <Icon name={t.icon} className="size-[22px]" strokeWidth={isActive ? 1.8 : 1.4} />
                      <span>{t.label}</span>
                      <span aria-hidden className={`h-[2px] w-4 rounded-full transition-opacity ${isActive ? 'bg-dusk opacity-100' : 'opacity-0'}`} />
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
