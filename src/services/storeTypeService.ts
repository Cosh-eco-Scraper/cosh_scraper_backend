import { StoreTypeRepository } from '../repositories/storeType.repository';
import { StoreRepository } from '../repositories/store.repository';
import { TypeRepository } from '../repositories/type.repository';

const storeTypeService = {
  async addTypeToStore(typeId: number, storeId: number) {
    await StoreRepository.getStore(storeId);
    await TypeRepository.getType(typeId);

    await StoreTypeRepository.addTypeToStore(typeId, storeId);
  },
  async removeTypeFromStore(typeId: number, storeId: number) {
    await StoreRepository.getStore(storeId);
    await TypeRepository.getType(typeId);

    await StoreTypeRepository.removeTypeFromStore(typeId, storeId);
  },
};

export default storeTypeService;
