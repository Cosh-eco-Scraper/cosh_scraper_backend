

export class GeneratedDescription {
    readonly descriptionId: number;
    readonly description: string;
    readonly createdAt: Date;

    constructor(LLMdescription: GeneratedDescription) {
        this.descriptionId = LLMdescription.descriptionId;
        this.description = LLMdescription.description;
        this.createdAt = LLMdescription.createdAt;
    }
}