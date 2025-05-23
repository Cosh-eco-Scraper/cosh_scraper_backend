import sinon from 'sinon';
import OpeningHoursService from '../services/openingshours.service';
import { openingHoursRespository } from '../repositories/openinghours.repository';
let expect: typeof import('chai').expect;
before(async () => {
  ({ expect } = await import('chai'));
});

describe('OpeningHoursService', () => {
  afterEach(() => {
    sinon.restore(); // Restore all mocked methods after each test
  });

  describe('updateOpeningHours', () => {
    it('should update opening hours successfully (happy case)', async () => {
      // Arrange
      const openingHoursId = 1;
      const day = 'Monday';
      const startTime = '09:00';
      const endTime = '17:00';
      const store_id = 1;

      // Mock the repository method to resolve successfully
      const updateOpeningHoursStub = sinon
        .stub(openingHoursRespository, 'updateOpeningHours')
        .resolves();

      // Act
      await OpeningHoursService.updateOpeningHours(
        openingHoursId,
        day,
        startTime,
        endTime,
        store_id,
      );

      // Assert
      expect(
        updateOpeningHoursStub.calledOnceWith(openingHoursId, day, startTime, endTime, store_id),
      ).to.be.true;
    });

    it('should throw an error if the repository fails (unhappy case)', async () => {
      // Arrange
      const openingHoursId = 1;
      const day = 'Monday';
      const startTime = '09:00';
      const endTime = '17:00';
      const store_id = 1;

      // Mock the repository method to reject with an error
      const errorMessage = 'Failed to update opening hours';
      const updateOpeningHoursStub = sinon
        .stub(openingHoursRespository, 'updateOpeningHours')
        .rejects(new Error('Failed to update opening hours'));

      // Act & Assert
      try {
        await OpeningHoursService.updateOpeningHours(
          openingHoursId,
          day,
          startTime,
          endTime,
          store_id,
        );
        expect.fail('Expected an error to be thrown');
      } catch (error: any) {
        expect(error.message).to.equal(errorMessage);
      }

      expect(
        updateOpeningHoursStub.calledOnceWith(openingHoursId, day, startTime, endTime, store_id),
      ).to.be.true;
    });
  });
});
