import sinon from 'sinon';
import { Brand } from '../domain/Brand';
import BrandRepository from '../repositories/brand.repository';
import BrandService from '../services/brand.service';
import assert from 'assert';

describe('BrandService', () => {
  let expect: typeof import('chai').expect;

  beforeEach(() => {
    sinon.restore(); // Restore all mocked methods before each test
  });

  before(async () => {
    ({ expect } = await import('chai'));
  });

  describe('updateBrand', () => {
    it('should update a brand and return the updated brand', async () => {
      // Arrange
      const brandId = 1;
      const brandData = { name: 'Updated Brand Name', label: 'Updated Label' };
      const existingBrand: Brand = {
        id: brandId,
        name: 'Old Brand Name',
        label: 'Old Label',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
        stores: [],
      };
      const updatedBrand: Brand = {
        ...existingBrand,
        ...brandData,
        updatedAt: new Date(),
      };

      // Mock the repository methods
      const updateBrandStub = sinon.stub(BrandRepository, 'updateBrand').resolves(brandId);

      // Act
      const result = await BrandService.updateBrand(brandId, brandData.name, brandData.label);

      // Assert
      expect(updateBrandStub.calledOnceWith(brandId, brandData.name, brandData.label)).to.be.true;
      expect(result).to.equal(brandId);
    });

    it('should throw an error if the brand does not exist', async () => {
      // Arrange
      const brandId = 999;
      const brandData = { name: 'Nonexistent Brand', label: 'Nonexistent Label' };

      // Mock the repository method to throw an error
      sinon.stub(BrandRepository, 'updateBrand').rejects(new Error('Failed to update brand'));

      try {
        await BrandService.updateBrand(brandId, brandData.name, brandData.label);
        expect.fail('Expected an error to be thrown');
      } catch (error: any) {
        expect(error.message).to.equal('Failed to update brand');
      }
    });
  });

  describe('getAllBrands', () => {
    it('should return an array of brands', async () => {
      // Arrange
      const expectedBrands: Brand[] = [
        {
          id: 1,
          name: 'Brand 1',
          label: 'Label 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          stores: [],
        },
        {
          id: 2,
          name: 'Brand 2',
          label: 'Label 2',
          createdAt: new Date(),
          updatedAt: new Date(),
          stores: [],
        },
      ];

      sinon.stub(BrandRepository, 'getAllBrands').resolves(expectedBrands);

      const brands = await BrandService.getAllBrands();

      expect(brands).to.deep.equal(expectedBrands);
    });

    it('should throw an error if the repository fails', async () => {
      it('should throw error when database operation fails', async () => {
        const error = new Error('Database error');
        BrandRepository.getAllBrands = async () => {
          throw error;
        };

        try {
          await BrandService.getAllBrands();
          assert.fail('Should have thrown error');
        } catch (e) {
          assert.strictEqual(e, error);
        }
      });
    });
  });
});
