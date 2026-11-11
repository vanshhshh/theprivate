import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from './app/AppShell';
import { RouteError } from './app/RouteError';
import { Skeleton } from './components/ui';
import { Discover } from './screens/Discover';
import { Explore } from './screens/Explore';
import { Journeys } from './screens/Journeys';
import { Plan } from './screens/Plan';
import { Profile } from './screens/Profile';

/** Secondary screens are split out of the start-up bundle and fetched from the app package on demand. */
function page<T extends Record<string, ComponentType>>(load: () => Promise<T>, name: keyof T) {
  const C = lazy(async () => ({ default: (await load())[name] as ComponentType }));
  return (
    <Suspense fallback={<Skeleton />}>
      <C />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/discover" replace /> },
      { path: '/discover', element: <Discover /> },
      { path: '/plan', element: <Plan /> },
      { path: '/plan/results', element: page(() => import('./screens/Results'), 'Results') },
      { path: '/plan/request', element: page(() => import('./screens/RequestFlight'), 'RequestFlight') },
      { path: '/journeys', element: <Journeys /> },
      { path: '/journeys/request/:ref', element: page(() => import('./screens/RequestDetail'), 'RequestDetail') },
      { path: '/journeys/booking/:ref', element: page(() => import('./screens/BookingDetail'), 'BookingDetail') },
      { path: '/explore', element: <Explore /> },
      { path: '/explore/one-way/:id', element: page(() => import('./screens/ExploreDetail'), 'OneWayDetail') },
      { path: '/explore/aircraft/:id', element: page(() => import('./screens/ExploreDetail'), 'AircraftDetail') },
      { path: '/inbox', element: page(() => import('./screens/Inbox'), 'Inbox') },
      { path: '/profile', element: <Profile /> },
      { path: '/auth/sign-in', element: page(() => import('./screens/Auth'), 'SignIn') },
      { path: '/auth/sign-up', element: page(() => import('./screens/Auth'), 'SignUp') },
      { path: '*', element: <Navigate to="/discover" replace /> },
    ],
  },
]);
