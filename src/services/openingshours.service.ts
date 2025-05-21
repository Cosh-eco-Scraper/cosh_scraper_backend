import { openingHoursRespository } from "../repositories/openinghours.repository";


const updateOpeningHours = async (
    openingHoursId: number,
    day: string,
    startTime: string,
    endTime: string,
    store_id: number
): Promise<void> => {
    await openingHoursRespository.updateOpeningHours(openingHoursId, day, startTime, endTime, store_id);
}

const OpeningHoursService = {
    updateOpeningHours,
};

export default OpeningHoursService;