export type StoreType = {
  id: number;
  name: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type DatabaseStoreType = Omit<StoreType, 'description' | 'createdAt' | 'updatedAt'>;
export type StoreTypeDto = DatabaseStoreType;
