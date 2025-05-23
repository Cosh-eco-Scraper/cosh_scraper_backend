import { Store } from './Store';

export type Brand = {
  id: number;
  name: string;
  label: string;
  createdAt?: Date;
  updatedAt?: Date;
  stores?: Store[];
};

export type DatabaseBrand = {
  id: number;
  name: string;
  label: string;
  storeId: number;
};


export type DatabaseBrandForList = {
    id: number;
    name: string;
    label: string;
};

export type BrandDto = {
  id: number;
  name: string;
  label: string;
  storeId: number;
};

export type BrandForListDto = {
  id: number;
  name: string;
  label: string;
}
