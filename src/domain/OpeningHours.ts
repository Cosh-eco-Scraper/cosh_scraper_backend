import { Store } from './Store';
import { Day } from './Day';

export type OpeningHours = {
  id: number;
  day: {
    name: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    orderValue: Day;
  };
  openingAt: string;
  closingAt: string;
  createdAt: Date;
  updatedAt: Date;
  store: Store;
};

export type OpeningHoursDto = {
  id: number;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  openingAt: string;
  closingAt: string;
  storeId: number;
};

export type DatabaseOpeningHours = {
  id: number;
  day: {
    name: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    orderValue: Day;
  };
  createdAt: Date;
  updatedAt: Date;
  openingAt: string;
  closingAt: string;
  storeId: number;
};
