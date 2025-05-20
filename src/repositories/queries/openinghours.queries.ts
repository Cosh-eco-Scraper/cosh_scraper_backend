export const openingHoursQueries = {
    updateOpeningHours: (openingHoursId: number, day: string, startTime: string, endTime: string) => `UPDATE opening_hours
                                                    SET day = '${day}',
                                                        openingat = '${startTime}',
                                                        closingat = '${endTime}'
                                                    WHERE id = '${openingHoursId}';`,
}