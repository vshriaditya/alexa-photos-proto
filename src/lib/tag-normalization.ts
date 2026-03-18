const synonymMap: Record<string, string[]> = {
  baby: ["baby", "infant", "newborn", "toddler", "child"],
  car: ["car", "vehicle", "automobile", "sedan", "suv", "truck"],
  mountain: ["mountain", "mountains", "peak", "peaks", "range", "cliff"],
  beach: ["beach", "coast", "shore", "ocean", "waves", "seaside"],
  sunset: ["sunset", "sunrise", "golden hour", "dusk"],
  dog: ["dog", "puppy", "canine", "retriever"],
  cat: ["cat", "kitten", "feline"],
  family: ["family", "parents", "siblings", "household"],
  portrait: ["portrait", "close-up", "selfie"],
  lake: ["lake", "river", "water", "stream"],
  forest: ["forest", "trees", "woods", "pine"],
  food: ["food", "meal", "dish", "dessert", "cake"],
};

const normalizeToken = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, " ");

const toStringTokens = (values: unknown[]) =>
  values.flatMap((value) => {
    if (typeof value !== "string") {
      return [];
    }

    return value.split(",");
  });

export const expandNormalizedTags = (values: unknown[]) => {
  const base = toStringTokens(values)
    .map(normalizeToken)
    .filter(Boolean);

  const expanded = new Set<string>();

  for (const token of base) {
    expanded.add(token);

    for (const [canonical, synonyms] of Object.entries(synonymMap)) {
      if (synonyms.some((candidate) => token.includes(candidate))) {
        expanded.add(canonical);
      }
    }
  }

  return [...expanded];
};
