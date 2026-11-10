'use client';

import { buttonClass } from '@/components/ui/button';

/** "Download" uses the browser's Save as PDF: the receipt page is print-styled. */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass('secondary', 'md')}>
      Download or print (PDF)
    </button>
  );
}
