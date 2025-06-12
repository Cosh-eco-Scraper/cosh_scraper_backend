// utils/consolidateScrapedInfo.ts (You might want to place this in a 'utils' folder)

import { ScrapedInfo } from '../domain/ScrapedInfo';

/**
 * Helper to check if a day's hours are considered 'empty' or 'null'
 */
function isDayHoursEmpty(dayHours: ScrapedInfo['openingHours']['Monday']): boolean {
  return (
    !dayHours ||
    (!dayHours.open && !dayHours.close && !dayHours.openAfterNoon && !dayHours.closeAfterNoon)
  );
}

/**
 * Consolidates multiple ScrapedInfo objects into a single, comprehensive ScrapedInfo object.
 * This function is useful when different parts of a website's information are found on different pages.
 * @param {ScrapedInfo[]} results - An array of ScrapedInfo objects to consolidate.
 * @returns {ScrapedInfo} A single, consolidated ScrapedInfo object.
 */
export function consolidateScrapedInfoResults(results: ScrapedInfo[]): ScrapedInfo {
  const consolidated: ScrapedInfo = {
    url: '', // Will be updated
    name: '',
    brands: [],
    openingHours: {
      Monday: null,
      Tuesday: null,
      Wednesday: null,
      Thursday: null,
      Friday: null,
      Saturday: null,
      Sunday: null,
    },
    location: '',
    about: '',
    retour: '',
    type: [],
  };

  if (!results || results.length === 0) {
    return consolidated; // Return an empty consolidated object if no results
  }

  // Use the URL from the first valid result, or fallback to an empty string
  consolidated.url = results.find((r) => r.url)?.url || '';

  // --- Consolidate Name ---
  const nameCounts = new Map<string, number>();
  results.forEach((r) => {
    if (r.name && r.name.trim() !== '') {
      const name = r.name.trim();
      nameCounts.set(name, (nameCounts.get(name) || 0) + 1);
    }
  });
  // Pick the most frequent name
  let topName = '';
  let maxCount = 0;
  for (const [name, count] of nameCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      topName = name;
    }
  }
  consolidated.name = topName;

  // --- Consolidate Brands ---
  const uniqueBrands = new Set<string>();
  results.forEach((r) => {
    if (r.brands && Array.isArray(r.brands)) {
      r.brands.forEach((brand) => {
        if (brand && brand.trim() !== '') {
          uniqueBrands.add(brand.trim());
        }
      });
    }
  });
  consolidated.brands = Array.from(uniqueBrands);

  // --- Consolidate Opening Hours ---
  const days: Array<keyof ScrapedInfo['openingHours']> = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  days.forEach((day) => {
    let bestDayHours: ScrapedInfo['openingHours']['Monday'] | null = null;
    let hasExplicitlyClosed = false;

    // Prioritize non-null entries
    const dayHoursCandidates = results
      .map((r) => r.openingHours?.[day])
      .filter((h) => h !== undefined);

    for (const candidate of dayHoursCandidates) {
      if (candidate === null) {
        // Explicitly closed
        hasExplicitlyClosed = true;
      } else if (!isDayHoursEmpty(candidate)) {
        // Has valid times
        // Simple heuristic: Take the first non-empty valid entry.
        // For more advanced merging, you'd compare and combine overlaps or choose the most detailed.
        bestDayHours = candidate;
        break;
      }
    }

    if (bestDayHours) {
      consolidated.openingHours[day] = bestDayHours;
    } else if (hasExplicitlyClosed) {
      consolidated.openingHours[day] = null; // If any result says explicitly closed, default to that.
    } else {
      consolidated.openingHours[day] = null; // No info found for this day
    }
  });

  // --- Consolidate Location ---
  const locationCounts = new Map<string, number>();
  results.forEach((r) => {
    if (r.location && r.location.trim() !== '') {
      const loc = r.location.trim();
      locationCounts.set(loc, (locationCounts.get(loc) || 0) + 1);
    }
  });
  // Pick the most frequent location
  let topLocation = '';
  maxCount = 0; // Reset maxCount
  for (const [loc, count] of locationCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      topLocation = loc;
    }
  }
  consolidated.location = topLocation;

  // --- Consolidate About ---
  const uniqueAboutSnippets = new Set<string>();
  results.forEach((r) => {
    if (r.about && r.about.trim() !== '') {
      // Basic paragraph/sentence-level deduplication
      r.about
        .split('\n')
        .filter((p) => p.trim().length > 10)
        .forEach((p) => uniqueAboutSnippets.add(p.trim()));
    }
  });
  consolidated.about = Array.from(uniqueAboutSnippets).join('\n\n'); // Join with double newline for readability

  // --- Consolidate Retour ---
  const uniqueRetourSnippets = new Set<string>();
  results.forEach((r) => {
    if (r.retour && r.retour.trim() !== '') {
      r.retour
        .split('\n')
        .filter((p) => p.trim().length > 10)
        .forEach((p) => uniqueRetourSnippets.add(p.trim()));
    }
  });
  consolidated.retour = Array.from(uniqueRetourSnippets).join('\n\n');

  // --- Consolidate Type ---
  const uniqueTypes = new Set<string>();
  results.forEach((r) => {
    if (r.type && Array.isArray(r.type)) {
      r.type.forEach((t) => {
        if (t && t.trim() !== '') {
          uniqueTypes.add(t.trim());
        }
      });
    }
  });
  consolidated.type = Array.from(uniqueTypes);

  return consolidated;
}
