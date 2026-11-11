import { NavLink, Outlet } from 'react-router';
import { Icon, type IconName } from '@/components/Icon';

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/discover', label: 'Discover', icon: 'horizon' },
  { to: '/plan', label: 'Plan', icon: 'route' },
  { to: '/journeys', label: 'Journeys', icon: 'ticket' },
  { to: '/explore', label: 'Explore', icon: 'compass' },
  { to: '/profile', label: 'Profile', icon: 'person' },
];

/** One shell for both platforms: content above, a translucent tab bar resting on the safe area. */
export function AppShell() {
  return (
    <div className="flex h-full flex-col bg-paper">
      <main className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain" style={{ paddingBottom: 'calc(var(--tabbar-h) + var(--safe-bottom))' }}>
        <Outlet />
      </main>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-night/88 backdrop-blur-xl"
        style={{ paddingBottom: 'var(--safe-bottom)' }}
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5" style={{ height: 'var(--tabbar-h)' }}>
          {TABS.map((t) => (
            <li key={t.to} className="flex">
              <NavLink
                to={t.to}
                className={({ isActive }) =>
                  `flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-[10.5px] tracking-[0.02em] transition-colors duration-200 ${isActive ? 'text-paper' : 'text-paper/45'}`
                }
              >
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
    </div>
  );
}
