import sinon from 'sinon';
import { Brand } from '../domain/Brand';

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
      // const findBrandByIdStub = sinon.stub(BrandRepository, "findBrandById").resolves(existingBrand);
      const updateBrandStub = sinon.stub(BrandRepository, 'updateBrand').resolves();

      // Act
      await brandService.updateBrand(brandId, brandData.name, brandData.label);

      // Assert
      // expect(findBrandByIdStub.calledOnceWith(brandId)).to.be.true;
      expect(updateBrandStub.calledOnceWith(brandId, brandData.name, brandData.label)).to.be.true;
    });
    it('should throw an error if the brand does not exist', async () => {
      // Arrange
      const brandId = 999;
      const brandData = { name: 'Nonexistent Brand', label: 'Nonexistent Label' };

      // Mock the repository method to throw an error
      sinon.stub(BrandRepository, 'updateBrand').rejects(new Error('Failed to update brand'));

      try {
        await brandService.updateBrand(brandId, brandData.name, brandData.label);
        expect.fail('Expected an error to be thrown');
      } catch (error: any) {
        expect('Failed to update brand').equal(error.message);
      }
    });
  });
});
