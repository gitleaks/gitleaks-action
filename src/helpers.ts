import { ExitCode, debug, error } from '@actions/core';

export function envExtractor<T>(envPath: string, processor: (value: string) => T, defaultValue?: T): T | null {
    const envValue = process.env[envPath];
    if (envValue === undefined) {
        debug(`Environment variable ${envPath} is not defined`);
        if (defaultValue !== undefined) {
            debug(`Using default value ${defaultValue}`);
            return defaultValue;
        }
        return null;
    }

    return processor(envValue);
}

export function envExtractorThrows<T>(envPath: string, processor: (value: string) => T, defaultValue?: T): T {
    const value = envExtractor(envPath, processor, defaultValue);
    if (value === null) {
        error(`Environment variable ${envPath} is not set`);
        process.exit(ExitCode.Failure);
    }
    return value;
}

export function stringProcessor(val: string): string {
    return val.toString();
}

export function booleanProcessor(val: string): boolean {
    return val.toLowerCase() === 'true' || val === '1';
}
