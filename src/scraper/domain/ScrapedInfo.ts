export type ScrapedInfo = {
  url: string;
  name: string;
  brands: string[];
  openingHours: {
    Monday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    Tuesday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    Wednesday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    Thursday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    Friday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    Saturday: {
      open: string;
      close: string;
      openAfterNoon: string | null;
      closeAfterNoon: string | null;
    } | null;
    Sunday: {
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
