import { createBrowserRouter, Navigate } from 'react-router';
import { AppShell } from './app/AppShell';
import { SignIn, SignUp } from './screens/Auth';
import { BookingDetail } from './screens/BookingDetail';
import { Discover } from './screens/Discover';
import { Explore } from './screens/Explore';
import { AircraftDetail, OneWayDetail } from './screens/ExploreDetail';
import { Inbox } from './screens/Inbox';
import { Journeys } from './screens/Journeys';
import { Plan } from './screens/Plan';
import { Profile } from './screens/Profile';
import { RequestDetail } from './screens/RequestDetail';
import { RequestFlight } from './screens/RequestFlight';
import { Results } from './screens/Results';

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/discover" replace /> },
      { path: '/discover', element: <Discover /> },
      { path: '/plan', element: <Plan /> },
      { path: '/plan/results', element: <Results /> },
      { path: '/plan/request', element: <RequestFlight /> },
      { path: '/journeys', element: <Journeys /> },
      { path: '/journeys/request/:ref', element: <RequestDetail /> },
      { path: '/journeys/booking/:ref', element: <BookingDetail /> },
      { path: '/explore', element: <Explore /> },
      { path: '/explore/one-way/:id', element: <OneWayDetail /> },
      { path: '/explore/aircraft/:id', element: <AircraftDetail /> },
      { path: '/inbox', element: <Inbox /> },
      { path: '/profile', element: <Profile /> },
      { path: '/auth/sign-in', element: <SignIn /> },
      { path: '/auth/sign-up', element: <SignUp /> },
      { path: '*', element: <Navigate to="/discover" replace /> },
    ],
  },
]);
