const englishKeywords = [
  'about',
  'about us',
  'intro',
  'brand',
  'brands',
  'location',
  'address',
  'open',
  'opening',
  'hour',
  'hours',
  'time',
  'times',
  'opening hours',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
  'closed',
  'return',
  'returns',
  'contact',
  'contacts',
];

const frenchKeywords = [
  'à propos',
  'à propos de nous',
  'introduction',
  'marque',
  'marques',
  'emplacement',
  'adresse',
  'ouvert',
  'ouverture',
  'heure',
  'heures',
  'horaire',
  'horaires',
  "heures d'ouverture",
  'lundi',
  'mardi',
  'mercredi',
  'jeudi',
  'vendredi',
  'samedi',
  'dimanche',
  'fermé',
  'retour',
  'retours',
  'contact',
  'contacts',
];

const germanKeywords = [
  'über',
  'über uns',
  'einführung',
  'marke',
  'marken',
  'standort',
  'adresse',
  'offen',
  'öffnung',
  'stunde',
  'stunden',
  'zeit',
  'zeiten',
  'öffnungszeiten',
  'montag',
  'dienstag',
  'mittwoch',
  'donnerstag',
  'freitag',
  'samstag',
  'sonntag',
  'geschlossen',
  'rückgabe',
  'retoure',
  'kontakt',
  'kontakte',
];

const dutchKeywords = [
  'over',
  'over ons',
  'intro',
  'merk',
  'merken',
  'locatie',
  'adres',
  'open',
  'opening',
  'uur',
  'uren',
  'tijd',
  'tijden',
  'openingstijden',
  'maandag',
  'dinsdag',
  'woensdag',
  'donderdag',
  'vrijdag',
  'zaterdag',
  'zondag',
  'gesloten',
  'retour',
  'retouren',
  'contact',
  'contacten',
];

const keywords = {
  getEnglishKeywords: () => englishKeywords,
  getDutchKeywords: () => dutchKeywords,
  getGermanKeywords: () => germanKeywords,
  getFrenchKeywords: () => frenchKeywords,
};

export default function getKeywords(language: string) {
  switch (language) {
    case 'en':
      return keywords.getEnglishKeywords();
    case 'nl':
      return keywords.getDutchKeywords();
    case 'de':
      return keywords.getGermanKeywords();
    case 'fr':
      return keywords.getFrenchKeywords();
    default:
      return keywords.getEnglishKeywords();
  }
}
