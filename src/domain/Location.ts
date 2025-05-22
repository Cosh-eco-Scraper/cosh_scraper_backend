export type Location = {
  id: number;
  street: string;
  number: string;
  postalCode: string;
  city: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LocationDTO = {
  id?: number;
  street: string;
  number: string;
  postalCode: string;
  city: string;
  country: string;
  createdAt?: Date;
  updatedAt?: Date;
};