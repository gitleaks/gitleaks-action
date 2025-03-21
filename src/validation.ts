import { debug, error, info, warning } from '@actions/core';
import type { GitHub } from '@actions/github/lib/utils';
import { KeygenValidator } from './keygen';

export type LICENSE_VALIDATION_RESULTS = 'VALID' | 'LICENSE_MISSING' | 'INVALID' | 'TOO_MANY_MACHINES';

function shouldValidateLicense(
    user: Awaited<ReturnType<InstanceType<typeof GitHub>['request']>>,
    repo_owner: string,
): boolean {
    let shouldValidateLicence = true;

    if (user.status !== 200) {
        error(
            `Get user [${repo_owner}] failed with status [${user.status}]. License key validation will be enforced 🤷.`,
        );
    }

    switch (user.data.type) {
        case 'Organization':
            info(`[${repo_owner}] is an organization. License key is required.`);
            break;
        case 'User':
            info(`[${repo_owner}] is an individual user. No license key is required.`);
            shouldValidateLicence = false;
            break;
        default:
            warning(
                `[${repo_owner}] is an unexpected type [${user.data.type}]. License key validation will be enforced 🤷.`,
            );
            debug(`GitHub GET user API returned [${JSON.stringify(user)}]`);
    }

    return shouldValidateLicence;
}

export async function isLicenseValid(
    gitleaks_license: string | null,
    user: Awaited<ReturnType<InstanceType<typeof GitHub>['request']>>,
    repository_fingerprint: string,
    repository_owner: string,
): Promise<LICENSE_VALIDATION_RESULTS> {
    const shouldValidate = shouldValidateLicense(user, repository_owner);

    if (!shouldValidate) {
        return 'VALID';
    }

    if (!gitleaks_license) {
        return 'LICENSE_MISSING';
    }

    info('License validation is enabled. License key will be validated.');
    const keygenValidator = new KeygenValidator();

    return await keygenValidator.validate(gitleaks_license, repository_fingerprint);
}
