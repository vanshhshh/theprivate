export const aircraftImages = [
  "https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1583416750470-965b2707b355?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1559628233-100c798642d4?auto=format&fit=crop&w=1400&q=80",
];

export const heroImage = "https://images.unsplash.com/photo-1540962351504-03099e0a754b?auto=format&fit=crop&w=2200&q=85";
export const loungeImage = "https://images.unsplash.com/photo-1583416750470-965b2707b355?auto=format&fit=crop&w=1800&q=82";

export function imageForSeed(seed?: string | null) {
  const text = seed || "aircraft";
  const total = text.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return aircraftImages[total % aircraftImages.length];
}
