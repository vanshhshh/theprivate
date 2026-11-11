import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from './app/AppShell';
import { Discover } from './screens/Discover';
import { Explore } from './screens/Explore';
import { Journeys } from './screens/Journeys';
import { Plan } from './screens/Plan';
import { Profile } from './screens/Profile';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/discover" replace /> },
      { path: '/discover', element: <Discover /> },
      { path: '/plan', element: <Plan /> },
      { path: '/journeys', element: <Journeys /> },
      { path: '/explore', element: <Explore /> },
      { path: '/profile', element: <Profile /> },
      { path: '*', element: <Navigate to="/discover" replace /> },
    ],
  },
]);
