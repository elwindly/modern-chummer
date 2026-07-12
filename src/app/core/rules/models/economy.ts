export interface CharacterContact {
  name: string;
  connection: number;
  loyalty: number;
  group: number;
  free?: boolean;
  enemy?: boolean;
}

export interface PurchasedItem {
  name: string;
  availability: string;
  cost: number;
  includedInParent?: boolean;
}

export interface QualityCatalogEntry {
  name: string;
  bp: number;
  category: string[];
  contributetolimit?: string;
}

export function buildQualityCatalog(
  qualities: Array<{
    name: string;
    bp?: string;
    category?: string | string[];
    contributetolimit?: string;
  }>,
): Map<string, QualityCatalogEntry> {
  const catalog = new Map<string, QualityCatalogEntry>();

  for (const quality of qualities) {
    const categories = Array.isArray(quality.category)
      ? quality.category
      : quality.category
        ? [quality.category]
        : [];

    catalog.set(quality.name, {
      name: quality.name,
      bp: Number(quality.bp ?? 0),
      category: categories,
      contributetolimit: quality.contributetolimit,
    });
  }

  return catalog;
}

export function isPositiveQuality(entry: QualityCatalogEntry): boolean {
  return entry.category.includes('Positive');
}

export function isNegativeQuality(entry: QualityCatalogEntry): boolean {
  return entry.category.includes('Negative');
}
