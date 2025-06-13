import { expect } from 'chai';
import sinon from 'sinon';
import { StoreRepository } from '../repositories/store.repository';
import { TypeRepository } from '../repositories/type.repository';
import { StoreTypeRepository } from '../repositories/storeType.repository';
import storeTypeService from '../services/storeTypeService';

describe('StoreTypeService', () => {
  let storeRepositoryStub: sinon.SinonStub;
  let typeRepositoryStub: sinon.SinonStub;
  let storeTypeRepositoryStub: sinon.SinonStub;

  beforeEach(() => {
    storeRepositoryStub = sinon.stub(StoreRepository, 'getStore');
    typeRepositoryStub = sinon.stub(TypeRepository, 'getType');
    storeTypeRepositoryStub = sinon.stub(StoreTypeRepository, 'addTypeToStore');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('addTypeToStore', () => {
    it('should successfully add type to store', async () => {
      const typeId = 1;
      const storeId = 1;

      storeRepositoryStub.resolves({});
      typeRepositoryStub.resolves({});
      storeTypeRepositoryStub.resolves();

      await storeTypeService.addTypeToStore(typeId, storeId);

      expect(storeRepositoryStub.calledWith(storeId)).to.be.true;
      expect(typeRepositoryStub.calledWith(typeId)).to.be.true;
      expect(storeTypeRepositoryStub.calledWith(typeId, storeId)).to.be.true;
    });

    it('should throw error if store not found', async () => {
      const typeId = 1;
      const storeId = 1;

      storeRepositoryStub.rejects(new Error('Store not found'));

      try {
        await storeTypeService.addTypeToStore(typeId, storeId);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Store not found');
      }
    });

    it('should throw error if type not found', async () => {
      const typeId = 1;
      const storeId = 1;

      storeRepositoryStub.resolves({});
      typeRepositoryStub.rejects(new Error('Type not found'));

      try {
        await storeTypeService.addTypeToStore(typeId, storeId);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Type not found');
      }
    });
  });

  describe('removeTypeFromStore', () => {
    beforeEach(() => {
      storeTypeRepositoryStub = sinon.stub(StoreTypeRepository, 'removeTypeFromStore');
    });

    it('should successfully remove type from store', async () => {
      const typeId = 1;
      const storeId = 1;

      storeRepositoryStub.resolves({});
      typeRepositoryStub.resolves({});
      storeTypeRepositoryStub.resolves();

      await storeTypeService.removeTypeFromStore(typeId, storeId);

      expect(storeRepositoryStub.calledWith(storeId)).to.be.true;
      expect(typeRepositoryStub.calledWith(typeId)).to.be.true;
      expect(storeTypeRepositoryStub.calledWith(typeId, storeId)).to.be.true;
    });

    it('should throw error if store not found', async () => {
      const typeId = 1;
      const storeId = 1;

      storeRepositoryStub.rejects(new Error('Store not found'));

      try {
        await storeTypeService.removeTypeFromStore(typeId, storeId);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Store not found');
      }
    });

    it('should throw error if type not found', async () => {
      const typeId = 1;
      const storeId = 1;

      storeRepositoryStub.resolves({});
      typeRepositoryStub.rejects(new Error('Type not found'));

      try {
        await storeTypeService.removeTypeFromStore(typeId, storeId);
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Type not found');
      }
    });
  });
});
