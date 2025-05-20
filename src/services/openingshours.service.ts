import { openingHoursRespository } from "../repositories/openinghours.repository";


const updateOpeningHours = async (
    openingHoursId: number,
    day: string,
    startTime: string,
    endTime: string
): Promise<void> => {
    openingHoursRespository.updateOpeningHours(openingHoursId, day, startTime, endTime);
}

const OpeningHoursService = {
    updateOpeningHours,
};

export default OpeningHoursService;