import { BadRequestException, type PipeTransform } from "@nestjs/common";
import * as z from "zod/mini";

// zod/mini ships without error messages to stay small in the browser; the
// API loads the English ones so that a 400 says what is wrong.
z.config(z.locales.en());

/**
 * Validates a value against one of the shared schemas from @leaf/shared and
 * passes on what the schema outputs. A mismatch is a 400 with one message per
 * problem, in the same response shape Nest's own validation used.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
    constructor(private readonly schema: z.ZodMiniType<T>) {}

    transform(value: unknown): T {
        const result = this.schema.safeParse(value);
        if (!result.success) {
            throw new BadRequestException(
                result.error.issues.map((issue) =>
                    issue.path.length > 0
                        ? `${issue.path.map(String).join(".")}: ${issue.message}`
                        : issue.message,
                ),
            );
        }
        return result.data;
    }
}
