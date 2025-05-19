import { describe, it, afterEach } from 'mocha';
import assert from 'assert';
import { StoreService } from '../services/store.service';
import { StoreRepository } from '../repositories/store.repository';
import { Store } from '../domain/Store';
import { DatabaseOpeningHours } from '../domain/OpeningHours';
import NotFoundError from '../domain/errors/NotFoundError';

describe('StoreService', () => {
  const originalGetAllStores = StoreRepository.getAllStores;
  const originalGetStore = StoreRepository.getStore;
  const originalGetStoreWithOpeningsHours = StoreRepository.getStoreWithOpeningsHours;

  afterEach(() => {
    StoreRepository.getAllStores = originalGetAllStores;
    StoreRepository.getStore = originalGetStore;
    StoreRepository.getStoreWithOpeningsHours = originalGetStoreWithOpeningsHours;
  });

  describe('getAllStores()', () => {
    it('should return all stores when stores exist', async () => {
      const expectedStores = [
        { id: 1, name: 'Store 1' },
        { id: 2, name: 'Store 2' }
      ] as Store[];
      StoreRepository.getAllStores = async () => expectedStores;

      const stores = await StoreService.getAllStores();

      assert.deepStrictEqual(stores, expectedStores);
    });

    it('should return empty array when no stores exist', async () => {
      StoreRepository.getAllStores = async () => [];

      const stores = await StoreService.getAllStores();

      assert.deepStrictEqual(stores, []);
    });

    it('should throw error when database operation fails', async () => {
      const error = new Error('Database error');
      StoreRepository.getAllStores = async () => {
        throw error;
      };

      try {
        await StoreService.getAllStores();
        assert.fail('Should have thrown error');
      } catch (e) {
        assert.strictEqual(e, error);
      }
    });
  });

  describe('getStore()', () => {
    it('should return store when store exists', async () => {
      const expectedStore: Store = {
        id: 1,
        name: 'Store 1',
        updatedAt: new Date(),
        createdAt: new Date()
      };
      StoreRepository.getStore = async () => expectedStore;

      const store = await StoreService.getStore(1);

      assert.deepStrictEqual(store, expectedStore);
    });

    it('should throw NotFoundError when store does not exist', async () => {
      StoreRepository.getStore = async () => {
        throw new NotFoundError('Store not found');
      };

      try {
        await StoreService.getStore(999);
        assert.fail('Should have thrown NotFoundError');
      } catch (e) {
        assert.ok(e instanceof NotFoundError);
      }
    });

    it('should throw error when database operation fails', async () => {
      const error = new Error('Database error');
      StoreRepository.getStore = async () => {
        throw error;
      };

      try {
        await StoreService.getStore(1);
        assert.fail('Should have thrown error');
      } catch (e) {
        assert.strictEqual(e, error);
      }
    });
  });

  describe('getOpeningsHoursByStoreId()', () => {
    it('should return sorted opening hours when store exists', async () => {
      const mockHours: DatabaseOpeningHours[] = [
        {
          day: { name: 'wednesday', orderValue: 2 },
          openingAt: '09:00',
          closingAt: '18:00',
          id: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
          storeId: 1
        },
        {
          day: { name: 'monday', orderValue: 0 },
          openingAt: '08:00',
          closingAt: '17:00',
          id: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
          storeId: 1
        },
        {
          day: { name: 'tuesday', orderValue: 1 },
          openingAt: '08:30',
          closingAt: '17:30',
          id: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          storeId: 1
        }
      ];
      StoreRepository.getStoreWithOpeningsHours = async () => mockHours;

      const hours = await StoreService.getOpeningsHoursByStoreId(1);

      assert.strictEqual(hours[0].day.orderValue, 0);
      assert.strictEqual(hours[1].day.orderValue, 1);
      assert.strictEqual(hours[2].day.orderValue, 2);
    });

    it('should return empty array when store has no opening hours', async () => {
      StoreRepository.getStoreWithOpeningsHours = async () => [];

      const hours = await StoreService.getOpeningsHoursByStoreId(1);

      assert.deepStrictEqual(hours, []);
    });

    it('should throw error when database operation fails', async () => {
      const error = new Error('Database error');
      StoreRepository.getStoreWithOpeningsHours = async () => {
        throw error;
      };

      try {
        await StoreService.getOpeningsHoursByStoreId(1);
        assert.fail('Should have thrown error');
      } catch (e) {
        assert.strictEqual(e, error);
      }
    });
  });
});
