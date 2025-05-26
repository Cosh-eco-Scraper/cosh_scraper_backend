export const openingHoursQueries = {
  updateOpeningHours: () => `
    UPDATE opening_hours
    SET day = $1,
        openingat = $2,
        closingat = $3,
        store_id = $4
    WHERE id = $5;
  `,

  createOpeningHours: () => `
    INSERT INTO opening_hours (day, openingat, closingat, store_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `,
};
