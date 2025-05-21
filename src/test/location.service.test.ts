let expect: typeof import("chai", { with: { "resolution-mode": "import" } }).expect;
before(async () => {
    ({ expect } = await import("chai"));
}); import sinon from "sinon";
import LocationService from "../services/location.service";
import { LocationRepository } from "../repositories/location.repository";



describe("LocationService", () => {
    afterEach(() => {
        sinon.restore(); // Restore all mocked methods after each test
    });

    describe("updateLocation", () => {
        it("should update a location successfully (happy case)", async () => {
            // Arrange
            const locationId = 1;
            const street = "Main Street";
            const number = "123";
            const postal_code = "12345";
            const city = "Sample City";
            const country = "Sample Country";

            // Mock the repository method to resolve successfully
            const updateLocationStub = sinon.stub(LocationRepository, "updateLocation").resolves();

            // Act
            await LocationService.updateLocation(locationId, street, number, postal_code, city, country);

            // Assert
            expect(updateLocationStub.calledOnceWith(locationId, street, number, postal_code, city, country)).to.be.true;
        });

        it("should throw an error if the repository fails (unhappy case)", async () => {
            // Arrange
            const locationId = 1;
            const street = "Main Street";
            const number = "123";
            const postal_code = "12345";
            const city = "Sample City";
            const country = "Sample Country";

            // Mock the repository method to reject with an error
            const errorMessage = "Failed to update location";
            const updateLocationStub = sinon.stub(LocationRepository, "updateLocation").rejects(new Error(errorMessage));

            // Act & Assert
            try {
                await LocationService.updateLocation(locationId, street, number, postal_code, city, country);
                expect.fail("Expected an error to be thrown");
            } catch (error: any) {
                expect(error.message).to.equal(errorMessage);
            }

            expect(updateLocationStub.calledOnceWith(locationId, street, number, postal_code, city, country)).to.be.true;
        });
    });
});