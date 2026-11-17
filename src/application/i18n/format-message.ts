import type { MessageParameters } from '../../domain/i18n/message.ts';

/** Substitute named values without interpreting markup or splitting a sentence into language-specific fragments. */
export function formatMessage(template: string, parameters: MessageParameters = {}): string {
    return template.replace(
        /\{([a-zA-Z][a-zA-Z0-9]*)\}/g,
        (_token, name: string) => {
            if (!Object.hasOwn(parameters, name)) {
                throw new Error(`Missing message parameter: ${name}`);
            }
            return String(parameters[name]);
        }
    );
}
