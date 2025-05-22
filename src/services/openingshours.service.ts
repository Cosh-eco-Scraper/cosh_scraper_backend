import { openingHoursRespository } from "../repositories/openinghours.repository";


const updateOpeningHours = async (
    openingHoursId?: number,
    day?: string,
    startTime?: string,
    endTime?: string,
    store_id?: number
): Promise<number> => {
    const result = await openingHoursRespository.updateOpeningHours(openingHoursId, day, startTime, endTime, store_id);
    return result;
}

const OpeningHoursService = {
    updateOpeningHours,
};

export default OpeningHoursService;