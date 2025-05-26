export const locationQueries = {
  updateLocation: () => `
    UPDATE locations
    SET street = $1,
        number = $2,
        postal_code = $3,
        city = $4,
        country = $5
    WHERE id = $6;
  `,

  createLocation: () => `
    INSERT INTO locations (street, number, postal_code, city, country)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `,
};