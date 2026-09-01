const ADJECTIVES = [
  "Quiet", "Morning", "Blue", "Copper", "Golden", "Silver", "Amber",
  "Bright", "Calm", "Gentle", "Steady", "Autumn", "Winter", "Summer",
  "Spring", "Coral", "Violet", "Emerald", "Crimson", "Indigo", "Silent",
  "Northern", "Southern", "Hidden", "Distant", "Warm", "Cool", "Soft",
  "Clear", "Deep", "High", "Curious", "Brave", "Kind", "Swift",
  "Patient", "Radiant", "Cheerful", "Frosty", "Sunny",
] as const;

const NOUNS = [
  "Coffee", "Lantern", "River", "Moon", "Harbor", "Meadow", "Forest",
  "Ridge", "Valley", "Bridge", "Garden", "Orchard", "Cabin", "Compass",
  "Anchor", "Falcon", "Sparrow", "Otter", "Fox", "Owl", "Deer", "Maple",
  "Willow", "Pine", "Star", "Cloud", "Rain", "Snow", "Stone", "Pebble",
  "Trail", "Lighthouse", "Windmill", "Kite", "Meadowlark", "Canyon",
  "Prairie", "Glacier", "Comet", "Horizon",
] as const;

/** Picks a random unused "Adjective Noun" alias, or null if the curated pool is exhausted. */
export function generateAlias(existing: ReadonlySet<string>): string | null {
  const available: string[] = [];
  for (const adjective of ADJECTIVES) {
    for (const noun of NOUNS) {
      const alias = `${adjective} ${noun}`;
      if (!existing.has(alias)) available.push(alias);
    }
  }
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}
