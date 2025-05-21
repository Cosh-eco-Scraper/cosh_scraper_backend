export const locationQuerries = {
    updateLocation: (locationId?: number, street?: string, number?: string, postal_code?: string, city?: string, country?: string) =>
        `UPDATE locations
         SET street = '${street}',
             number = '${number}',
             postal_code = '${postal_code}',
             city = '${city}',
             country = '${country}'
         WHERE id = ${locationId};`,
};