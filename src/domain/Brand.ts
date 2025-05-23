import { Store } from './Store';

export type Brand = {
  id: number;
  name: string;
  label: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  stores?: Store[];
};

export type DatabaseBrand = {
  id: number;
  name: string;
  label: string | null;
  storeId: number;
};

export type DatabaseBrandForList = {
  id: number;
  name: string;
  label: string | null;
};

export type BrandDto = {
  id: number;
  name: string;
  label: string | null;
  storeId: number;
};

export type BrandForListDto = {
  id: number;
  name: string;
  label: string | null;
};
