export const openingHoursQueries = {
  updateOpeningHours: (
    openingHoursId?: number,
    day?: string,
    startTime?: string,
    endTime?: string,
    storeId?: number,
  ) => `UPDATE opening_hours
                                                    SET day = '${day}',
                                                        openingat = '${startTime}',
                                                        closingat = '${endTime}',
                                                        store_id = '${storeId}'
                                                    WHERE id = '${openingHoursId}';`,
  createOpeningHours: (
    day: string,
    startTime: string,
    endTime: string,
    storeId: number,
  ) => `INSERT INTO opening_hours (day, openingat, closingat, store_id)
                                                    VALUES ('${day}', '${startTime}', '${endTime}', '${storeId}');`,
};
