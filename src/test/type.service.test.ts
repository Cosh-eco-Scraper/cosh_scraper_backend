import { expect } from 'chai';
import sinon from 'sinon';
import Sinon from 'sinon';
import { TypeRepository } from '../repositories/type.repository';
import TypeService from '../services/type.service';
import { DatabaseStoreType } from '../domain/StoreType';

describe('TypeService', () => {
  let typeRepositoryStub: Sinon.SinonStubbedInstance<{
    findOrCreateType(typeName: string, description?: string): Promise<any>;
    addTypeToStore(storeId: number, typeId: number): Promise<any>;
    getAllTypes(): Promise<DatabaseStoreType[]>;
    getType(typeId: number): Promise<DatabaseStoreType>;
  }>;

  beforeEach(() => {
    typeRepositoryStub = sinon.stub(TypeRepository);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('findOrCreateType', () => {
    it('should call repository findOrCreateType with correct parameters', async () => {
      const typeName = 'TestType';
      const description = 'Test Description';
      const expectedType = { id: 1, name: typeName, description };

      typeRepositoryStub.findOrCreateType.resolves(expectedType);

      const result = await TypeService.findOrCreateType(typeName, description);

      expect(result).to.deep.equal(expectedType);
      expect(typeRepositoryStub.findOrCreateType.calledOnceWith(typeName, description)).to.be.true;
    });

    it('should call repository findOrCreateType without description', async () => {
      const typeName = 'TestType';
      const expectedType = { id: 1, name: typeName };

      typeRepositoryStub.findOrCreateType.resolves(expectedType);

      const result = await TypeService.findOrCreateType(typeName);

      expect(result).to.deep.equal(expectedType);
      expect(typeRepositoryStub.findOrCreateType.calledOnceWith(typeName, undefined)).to.be.true;
    });
  });

  describe('addTypeToStore', () => {
    it('should call repository addTypeToStore with correct parameters', async () => {
      const storeId = 1;
      const typeId = 2;

      typeRepositoryStub.addTypeToStore.resolves();

      await TypeService.addTypeToStore(storeId, typeId);

      expect(typeRepositoryStub.addTypeToStore.calledOnceWith(storeId, typeId)).to.be.true;
    });
  });

  describe('getAllTypes', () => {
    it('should return all types from repository', async () => {
      const expectedTypes = [
        { id: 1, name: 'Type1' },
        { id: 2, name: 'Type2' },
      ];

      typeRepositoryStub.getAllTypes.resolves(expectedTypes);

      const result = await TypeService.getAllTypes();

      expect(result).to.deep.equal(expectedTypes);
      expect(typeRepositoryStub.getAllTypes.calledOnce).to.be.true;
    });

    it('should return empty array when no types exist', async () => {
      typeRepositoryStub.getAllTypes.resolves([]);

      const result = await TypeService.getAllTypes();

      expect(result).to.deep.equal([]);
      expect(typeRepositoryStub.getAllTypes.calledOnce).to.be.true;
    });
  });
});
