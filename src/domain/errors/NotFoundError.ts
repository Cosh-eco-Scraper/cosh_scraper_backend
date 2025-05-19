export default class NotFoundError extends Error {
  constructor(message: string) {
    super(message); // Call the constructor of the base class `Error`
    this.name = 'NotFoundError'; // Set the error name to your custom error class name
    // Set the prototype explicitly to maintain the correct prototype chain
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}
