import { Store } from './Store';

export type OpeningHours = {
  id: number;
  details: string;
  storeId: number;
  createdAt: Date;
  updatedAt: Date;
  store: Store;
};
