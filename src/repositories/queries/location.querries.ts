export const locationQuerries = {
  updateLocation: (
    locationId?: number,
    street?: string,
    number?: string,
    postal_code?: string,
    city?: string,
    country?: string,
  ) =>
    `UPDATE locations
         SET street = '${street}',
             number = '${number}',
             postal_code = '${postal_code}',
             city = '${city}',
             country = '${country}'
         WHERE id = ${locationId};`,
    createLocation: (
           street: string,
           number: string,
           postal_code: string,
           city: string,
           country: string,
         ) =>
           `INSERT INTO locations (street, number, postal_code, city, country)
                VALUES ('${street}', '${number}', '${postal_code}', '${city}', '${country}');`,
}

