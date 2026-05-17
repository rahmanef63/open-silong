/** Hand-picked Unsplash photos for the cover picker. Direct CDN URLs
 *  — no API key needed. Shown in the Unsplash tab as default state
 *  before the user types a search.
 *
 *  Why bundle a curated list:
 *  - Lets the Unsplash tab feel useful even when UNSPLASH_ACCESS_KEY
 *    isn't configured on the backend.
 *  - Gives consistent "starter" covers across deployments so a fresh
 *    workspace has Notion-quality images out-of-the-box.
 *
 *  Attribution: every Unsplash photo URL embeds the photo id (the
 *  `photo-<id>` segment). Click-through to the photographer/source is
 *  rebuilt at click time via the standard unsplash.com/photos/<id>
 *  link. License: Unsplash License (free for commercial + editorial,
 *  no attribution required but provided anyway). */

import type { UnsplashPhoto } from "@convex/features/unsplash/actions";

interface CuratedSeed {
  id: string;
  photographer: string;
  alt: string;
}

const SEEDS: CuratedSeed[] = [
  { id: "1506905925346-21bda4d32df4", photographer: "eberhard grossgasteiger", alt: "Mountain valley with low clouds" },
  { id: "1501785888041-af3ef285b470", photographer: "Luca Bravo", alt: "Aurora over a lakeside cabin" },
  { id: "1469474968028-56623f02e42e", photographer: "Modestas Urbonas", alt: "Snowy peaks at sunset" },
  { id: "1470770841072-f978cf4d019e", photographer: "Luca Bravo", alt: "Forest road in autumn" },
  { id: "1418065460487-3e41a6c84dc5", photographer: "Joel Filipe", alt: "Ocean coastline aerial" },
  { id: "1500530855697-b586d89ba3ee", photographer: "Mike Kotsch", alt: "Mountains reflected in lake" },
  { id: "1447752875215-b2761acb3c5d", photographer: "v2osk", alt: "Forest path foggy morning" },
  { id: "1542273917363-3b1817f69a2d", photographer: "Brandon Atchison", alt: "Beach sunset purple sky" },
  { id: "1500964757637-c85e8a162699", photographer: "Holger Link", alt: "Coastal cliffs in Iceland" },
  { id: "1418065460487-3e41a6c84dc5", photographer: "Joel Filipe", alt: "Desert dunes warm light" },
  { id: "1497436072909-60f360e1d4b1", photographer: "Bailey Zindel", alt: "Alpine lake reflection" },
  { id: "1493246507139-91e8fad9978e", photographer: "John Westrock", alt: "Sand patterns aerial" },
  { id: "1465056836041-7f43ac27dcb5", photographer: "eberhard grossgasteiger", alt: "Misty pine forest hills" },
  { id: "1472214103451-9374bd1c798e", photographer: "Casey Horner", alt: "Star trails over mountains" },
  { id: "1519681393784-d120267933ba", photographer: "Benjamin Voros", alt: "Snowy mountain peak alpenglow" },
  { id: "1464822759023-fed622ff2c3b", photographer: "eberhard grossgasteiger", alt: "Foggy mountain layers" },
  { id: "1455218873509-8097305ee378", photographer: "Casey Horner", alt: "Milky way over forest" },
  { id: "1426604966848-d7adac402bff", photographer: "Wil Stewart", alt: "Yosemite valley golden hour" },
  { id: "1502082553048-f009c37129b9", photographer: "eberhard grossgasteiger", alt: "Dolomites morning fog" },
  { id: "1444080748397-f442aa95c3e5", photographer: "eberhard grossgasteiger", alt: "Mountain road through valley" },
  { id: "1485470733090-0aae1788d5af", photographer: "eberhard grossgasteiger", alt: "Pine forest cliff edge" },
  { id: "1486870591958-9b9d0d1dda99", photographer: "Hendrik Cornelissen", alt: "Sunset waves coastline" },
  { id: "1426170042593-200f250dfdaf", photographer: "Daniel Roe", alt: "Mountain lake mirrored peaks" },
  { id: "1418489098061-ce87b5dc3aee", photographer: "Joshua Earle", alt: "Frozen lake mountain backdrop" },
];

const REGULAR = (id: string) => `https://images.unsplash.com/photo-${id}?w=1280&q=80&fm=jpg&fit=crop`;
const THUMB = (id: string) => `https://images.unsplash.com/photo-${id}?w=320&q=70&fm=jpg&fit=crop`;
const FULL = (id: string) => `https://images.unsplash.com/photo-${id}?q=85&fm=jpg`;
const SOURCE = (id: string) => `https://unsplash.com/photos/${id}`;

export const CURATED_UNSPLASH: UnsplashPhoto[] = SEEDS.map((s) => ({
  id: s.id,
  regular: REGULAR(s.id),
  thumb: THUMB(s.id),
  full: FULL(s.id),
  width: 1280,
  height: 768,
  alt: s.alt,
  photographer: s.photographer,
  photographerUrl: `https://unsplash.com/@${s.photographer.toLowerCase().replace(/\s+/g, "")}`,
  source: SOURCE(s.id),
}));
