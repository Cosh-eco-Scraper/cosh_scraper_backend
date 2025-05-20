import { Store } from './Store';

export type Brand = {
  id: number;
  name: string;
  label: string;
  createdAt: Date;
  updatedAt: Date;
  stores: Store[];
};
