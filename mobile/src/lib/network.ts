import { Network } from '@capacitor/network';
import { useEffect, useState } from 'react';

/** Live connectivity (native NetworkMonitor / browser online events). */
export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    let alive = true;
    void Network.getStatus().then((s) => alive && setOnline(s.connected));
    const sub = Network.addListener('networkStatusChange', (s) => setOnline(s.connected));
    return () => {
      alive = false;
      void sub.then((h) => h.remove());
    };
  }, []);
  return online;
}
