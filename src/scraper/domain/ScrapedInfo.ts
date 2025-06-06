export type ScrapedInfo = {
  url: string;
  name: string;
  brands: string[];
  openingHours: {
    monday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    tuesday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    wednesday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    thursday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    friday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    saturday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    sunday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
  };
  location: string;
  about: string;
  retour: string;
  type: string[];
};
