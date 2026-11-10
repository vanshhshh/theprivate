import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/display';
import { CREDITS as FILM } from '@/components/cinematic/media';
import scenes from '@/components/cinematic/scenes.json';

const CREDITS = [...FILM, ...Object.values(scenes).map((s) => s.credit)];

export const metadata: Metadata = { title: 'Photography credits' };

export default function MediaCredits() {
  return (
    <div className="mx-auto max-w-[820px] px-5 py-12 md:px-8">
      <PageHeader eyebrow="Legal" title="Photography credits" />
      <p className="mt-6 leading-relaxed text-ink-2">
        The film and the photographs throughout ThePrivate are the images below, used under their licences. The aircraft and cabin shown are illustrative: they are not ThePrivate listings and are not linked to any operator.
      </p>
      <ul className="mt-10 grid gap-px bg-line">
        {CREDITS.map((c) => (
          <li key={c.work} className="bg-paper py-6">
            <p className="font-display text-2xl">{c.work}</p>
            <p className="mt-2 text-[15px] text-ink-2">
              By {c.author} ·{' '}
              {c.licenseUrl ? (
                <a href={c.licenseUrl} className="underline decoration-line-strong underline-offset-4 hover:decoration-sectional" rel="license noopener noreferrer" target="_blank">
                  {c.license}
                </a>
              ) : (
                c.license
              )}
              {c.source && (
                <>
                  {' · '}
                  <a href={c.source} className="underline decoration-line-strong underline-offset-4 hover:decoration-sectional" rel="noopener noreferrer" target="_blank">
                    Source
                  </a>
                </>
              )}
            </p>
            <p className="mt-1 text-sm text-muted">Changes: {c.changes}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
