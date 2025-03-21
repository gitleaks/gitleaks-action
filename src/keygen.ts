import https, { RequestOptions } from 'https';
import { debug, error, info } from '@actions/core';
import { LICENSE_VALIDATION_RESULTS } from './validation';

export type ValidateKeyResponse = {
    meta: {
        constant: 'VALID' | 'TOO_MANY_MACHINES' | 'FINGERPRINT_SCOPE_MISMATCH' | 'NO_MACHINES' | 'NO_MACHINE';
    };
    data: {
        id: string;
        attributes: {
            maxMachines: number;
        };
    };
};

export type ActivateMachineResponse = {
    errors?: Array<{
        code?: string;
        title?: string;
        detail?: string;
        source: {
            pointer?: string;
            parameter?: string;
        };
    }>;
    status: number;
    data: {
        attributes: {
            name: string;
        };
    };
};

export class KeygenValidator {
    private readonly keygen_account: string =
        '64626262306364622d353538332d343662392d613563302d346337653865326634623032';

    private readonly keygen_host: string = 'api.keygen.sh';

    public async validate(
        gitleaks_license: string,
        repository_fingerprint: string,
    ): Promise<LICENSE_VALIDATION_RESULTS> {
        const validateKeyResponse = await this.sendValidateKeyRequest(gitleaks_license, repository_fingerprint);

        switch (validateKeyResponse.meta.constant) {
            case 'VALID':
                info(`👍 license valid for repo [${repository_fingerprint}]`);
                return 'VALID';
            case 'TOO_MANY_MACHINES':
                error(
                    `🛑 Cannot use gitleaks-action on this repo. Your license key has already reached its limit of [${validateKeyResponse.data.attributes.maxMachines}] repos. Go to gitleaks.io to upgrade your license to enable additional repos.`,
                );
                return 'TOO_MANY_MACHINES';
            case 'FINGERPRINT_SCOPE_MISMATCH':
            case 'NO_MACHINES': // Intentional fall-through
            case 'NO_MACHINE':
                return this.handleNoMachineCase(gitleaks_license, repository_fingerprint, validateKeyResponse.data.id);
            default:
                error(`🛑 Error: Validating key returned [${JSON.stringify(validateKeyResponse)}]`);
                return 'INVALID';
        }
    }

    private async handleNoMachineCase(
        gitleaks_license: string,
        repository_fingerprint: string,
        validate_key_response_id: string,
    ): Promise<'VALID' | 'INVALID'> {
        // If no machines are associated with the license, but the license exists and is not expired
        // then we can try to activate a "machine", or repo, for the license.
        info(
            `❗ Repo [${repository_fingerprint}] has not been associated with the license. Attempting to activate this repo for the license...`,
        );

        const activateMachineResponse = await this.sendActivateMachineRequest(
            gitleaks_license,
            repository_fingerprint,
            validate_key_response_id,
        );

        if (activateMachineResponse.errors) {
            error(`🛑 Activation request returned [${activateMachineResponse.errors.length}] errors:`);

            for (const errorInfo of activateMachineResponse.errors) {
                const errorCode = errorInfo.code || '';
                const errorTitle = errorInfo.title || '';
                const errorDetail = errorInfo.detail || '';
                const errorSourcePointer = errorInfo.source.pointer || '';
                const errorSourceParameter = errorInfo.source.parameter || '';
                error(
                    `🛑 Error activating repo: ${errorCode} | ${errorTitle} | ${errorDetail} | ${errorSourcePointer} | ${errorSourceParameter}`,
                );
            }

            return 'INVALID';
        }

        debug(`Response: ${JSON.stringify(activateMachineResponse)}`); // TODO: Consider removing or moving this log.

        if (activateMachineResponse.status !== 201) {
            info(`Activation response returned status [${activateMachineResponse.status}].`);
            return 'INVALID';
        }

        info(`Successfully added repo [${activateMachineResponse.data.attributes.name}] to license.`);
        return 'VALID';
    }

    private async sendValidateKeyRequest(
        gitleaks_license: string,
        repository_fingerprint: string,
    ): Promise<ValidateKeyResponse> {
        const options: RequestOptions = {
            method: 'POST',
            hostname: this.keygen_host,
            path: `/v1/accounts/${Buffer.from(this.keygen_host, 'hex')}/licenses/actions/validate-key`,
            headers: {
                'Content-Type': 'application/vnd.api+json',
                Accept: 'application/vnd.api+json',
            },
        };

        const data = {
            meta: {
                key: gitleaks_license,
                scope: {
                    fingerprint: repository_fingerprint,
                },
            },
        };

        return this.sendRequest<ValidateKeyResponse>(options, JSON.stringify(data));
    }

    private async sendActivateMachineRequest(
        gitleaks_license: string,
        repository_fingerprint: string,
        validate_key_response_id: string,
    ): Promise<ActivateMachineResponse> {
        const options: RequestOptions = {
            method: 'POST',
            hostname: this.keygen_host,
            path: `/v1/accounts/${Buffer.from(this.keygen_account, 'hex')}/machines`,
            headers: {
                'Content-Type': 'application/vnd.api+json',
                Accept: 'application/vnd.api+json',
                Authorization: `License ${gitleaks_license}`,
            },
        };

        const data = {
            data: {
                type: 'machines',
                attributes: {
                    fingerprint: repository_fingerprint,
                    platform: 'github-actions',
                    name: repository_fingerprint,
                },
                relationships: {
                    license: {
                        data: {
                            type: 'licenses',
                            id: validate_key_response_id,
                        },
                    },
                },
            },
        };

        return this.sendRequest<ActivateMachineResponse>(options, JSON.stringify(data));
    }

    private async sendRequest<ResultType = unknown>(options: RequestOptions, data: string): Promise<ResultType> {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                res.setEncoding('utf8');
                let responseBody = '';

                res.on('data', (chunk) => {
                    responseBody += chunk;
                });

                res.on('end', () => {
                    resolve(JSON.parse(responseBody));
                });
            });

            req.on('error', reject);

            req.write(data);
            req.end();
        });
    }
}
