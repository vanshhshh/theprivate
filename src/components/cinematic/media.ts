/**
 * Homepage film media. Every plate here is real, licensed photography built by
 * scripts/media/build_film_assets.py (sources, licences and edits in public/media/film/credits.json).
 *
 * A slot set to `null` is a MISSING ASSET. It is never filled with a substitute: in development
 * the film shows a labelled slot so the choreography can be reviewed; in production it is omitted.
 * See docs/MEDIA_ASSET_PLAN.md for the exact specification of each missing asset.
 */

export interface Plate {
  /** Largest file; used as `src`. */
  src: string;
  srcSet: string;
  /** Intrinsic aspect ratio (width / height) of the plate. */
  aspect: number;
  alt: string;
}

const set = (name: string, widths: number[]) => widths.map((w) => `/media/film/${name}-${w}.webp ${w}w`).join(', ');

/** Embraer Lineage 1000 cabin, window panes keyed to alpha so the sky plate shows through. */
export const CABIN: Plate & {
  /** Centre of the forward window pane, as fractions of the plate (from the 4000×2664 original). */
  focal: { x: number; y: number };
  /** Size of the forward pane as fractions of plate width / height. */
  pane: { w: number; h: number };
  /** object-position used for the plate so the window stays in frame on every aspect ratio. */
  position: { x: number; y: number };
} = {
  src: '/media/film/cabin-1920.webp',
  srcSet: set('cabin', [1280, 1920, 3200]),
  aspect: 4000 / 2664,
  alt: 'The cabin of a business jet: a cream leather seat beside a walnut table set for tea, with sunlight through the windows.',
  focal: { x: 3172 / 4000, y: 1032 / 2664 },
  pane: { w: (2 * 238) / 4000, h: (2 * 385) / 2664 },
  position: { x: 0.85, y: 0.45 },
};

/** Golden-hour sea of clouds seen at cruise altitude. Seen through the window, then full frame. */
export const SKY_HORIZON: Plate = {
  src: '/media/film/sky-horizon-1920.webp',
  srcSet: set('sky-horizon', [1280, 1920, 3200]),
  aspect: 3 / 2,
  alt: '',
};

/** Sunset cloud deck seen from above. The camera tilts down onto it before the chart. */
export const SKY_DESCENT: Plate = {
  src: '/media/film/sky-descent-1600.webp',
  srcSet: set('sky-descent', [1024, 1600, 2560]),
  aspect: 3 / 2,
  alt: '',
};

/**
 * J-1: the aircraft, isolated on alpha and mirrored so its key light matches SKY_HORIZON's sun.
 * INTERIM: supplied by ThePrivate; its C2PA credentials identify it as AI-generated (OpenAI), so it
 * is disclosed in the caption and on /legal/media-credits. Replace with licensed air-to-air
 * photography (spec in docs/MEDIA_ASSET_PLAN.md). Set to null to fall back to the sky alone.
 */
export const JET: (Plate & { kind: 'still'; generated: boolean }) | null = {
  kind: 'still',
  generated: true,
  src: '/media/film/jet-1440.webp',
  srcSet: set('jet', [960, 1440]),
  aspect: 1440 / 356,
  alt: '',
};

export const MISSING_JET_SPEC =
  'J-1 · Air-to-air tracking plate of one business jet, front three-quarter, climbing 10–15°, golden hour, sun camera-left, above a cloud deck. 6K+ stills or 4K 60 fps footage, licensed for web use, tail number removed or authorised.';

export const CREDITS = [
  {
    work: 'Business jet in flight (illustrative)',
    author: 'Supplied by ThePrivate; AI-generated image (OpenAI, per its C2PA content credentials)',
    license: 'Used by ThePrivate',
    licenseUrl: null,
    source: null,
    changes: 'Generated lettering removed, aircraft cut out from its background, mirrored, and composited over the sky photograph above the clouds.',
  },
  {
    work: 'Embraer Lineage 1000 interior seat',
    author: 'JetRequest.com',
    license: 'CC BY-SA 3.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Embraer_Lineage_1000_interior_seat.jpg',
    changes: 'Cropped, resized, window panes keyed to transparency and composited with a sky photograph. Our adaptation is released under CC BY-SA 3.0.',
  },
  {
    work: 'Summer above the clouds',
    author: 'Liane Metzler',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Summer_above_the_clouds_(Unsplash).jpg',
    changes: 'Resized.',
  },
  {
    work: 'Aerial cloud sunset',
    author: 'Christian Seeling',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    source: 'https://commons.wikimedia.org/wiki/File:Aerial_cloud_sunset._(Unsplash).jpg',
    changes: 'Resized.',
  },
] as const;
