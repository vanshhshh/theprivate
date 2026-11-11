import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { BiometricGate } from './auth/biometric';
import { bootNative } from './native/boot';
import { router } from './router';
import './styles/app.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BiometricGate>
        <RouterProvider router={router} />
      </BiometricGate>
    </AuthProvider>
  </StrictMode>,
);

void bootNative();
