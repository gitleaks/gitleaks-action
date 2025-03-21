import { ExitCode, debug, error, info, summary, warning } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { Gitleaks, ScanResultCodes } from './gitleaks';
import { booleanProcessor, envExtractor, envExtractorThrows, stringProcessor } from './helpers';
import { SummaryGenerator } from './summary-generator';
import { isLicenseValid } from './validation';

export const DEFAULT_GITLEAKS_VERSION = '8.16.1';

const LICENSE_VALIDATION_ENABLED = false; //keygen payment method is getting declined... disable this check for now.
const SUPPORTED_EVENT_TYPES = ['push', 'pull_request', 'workflow_dispatch', 'schedule'] as const;

const GITLEAKS_ENABLE_SUMMARY = envExtractorThrows('GITLEAKS_ENABLE_SUMMARY', booleanProcessor, true);
const GITLEAKS_ENABLE_UPLOAD_ARTIFACT = envExtractorThrows('GITLEAKS_ENABLE_UPLOAD_ARTIFACT', booleanProcessor, true);
const GITLEAKS_LICENSE = envExtractor('GITLEAKS_LICENSE', stringProcessor);
const GITLEAKS_VERSION = envExtractorThrows('GITLEAKS_VERSION', stringProcessor, DEFAULT_GITLEAKS_VERSION);

const GITHUB_TOKEN = envExtractorThrows('GITHUB_TOKEN', stringProcessor);

info(`Event type: ${context.eventName}`);

if (!SUPPORTED_EVENT_TYPES.includes(context.eventName as (typeof SUPPORTED_EVENT_TYPES)[number])) {
    error(
        `ERROR: The [${context.eventName}] event is not supported. Supported events are: ${SUPPORTED_EVENT_TYPES.join(', ')}`,
    );
    process.exit(ExitCode.Failure);
}

if (!GITLEAKS_ENABLE_SUMMARY) {
    debug('GIT_LEAKS_ENABLE_SUMMARY is disabled, skipping summary generation');
}

if (!GITLEAKS_ENABLE_UPLOAD_ARTIFACT) {
    debug('GITLEAKS_ENABLE_UPLOAD_ARTIFACT is disabled, skipping artifact upload');
}

const octokit = getOctokit(GITHUB_TOKEN);

// Docs: https://docs.github.com/en/rest/users/users#get-a-user
const user = await octokit.request('GET /users/{username}', {
    username: context.repo.owner,
});

const repository_fingerprint =
    context.payload.repository && context.payload.repository.full_name
        ? context.payload.repository.full_name
        : envExtractorThrows('GITHUB_REPOSITORY', stringProcessor);

const validationResult = await isLicenseValid(GITLEAKS_LICENSE, user, repository_fingerprint, context.repo.owner);

if (validationResult === 'LICENSE_MISSING') {
    error(
        '🛑 missing gitleaks license. Go grab one at gitleaks.io and store it as a GitHub Secret named GITLEAKS_LICENSE. For more info about the recent breaking update, see [here](https://github.com/gitleaks/gitleaks-action#-announcement).',
    );
    process.exit(ExitCode.Failure);
}

if (validationResult === 'INVALID') {
    error('🛑 Invalid gitleaks license. Please check your license key.');
    process.exit(ExitCode.Failure);
}

if (LICENSE_VALIDATION_ENABLED && validationResult !== 'VALID') {
    error('🛑 License validation failed.');
    process.exit(ExitCode.Failure);
}

const gitleaks = new Gitleaks(octokit);

let versionToInstall = GITLEAKS_VERSION;
if (GITLEAKS_VERSION === 'latest') {
    info('GITLEAKS_VERSION is set to latest. This is not recommended for production use.');
    versionToInstall = await gitleaks.getLatestReleaseVersion();
}

info(`Gitleaks version: ${versionToInstall}`);

await gitleaks.install(versionToInstall);

let scanResult: ScanResultCodes = ScanResultCodes.NO_LEAKS_DETECTED;

switch (context.eventName) {
    case 'push':
        {
            const commits = context.payload['commits'];
            if (commits.length === 0) {
                info('No commits to scan');
                process.exit(ExitCode.Success);
            }

            const eventSpecificArguments = gitleaks.getEventSpecificArgs(
                {
                    base_ref: commits[0].id,
                    head_ref: commits[commits.length - 1].id,
                },
                context.eventName,
            );

            scanResult = await gitleaks.scan(GITLEAKS_ENABLE_UPLOAD_ARTIFACT, eventSpecificArguments);
        }
        break;
    case 'workflow_dispatch':
    case 'schedule':
        {
            const eventSpecificArguments = gitleaks.getEventSpecificArgs({}, context.eventName);
            scanResult = await gitleaks.scan(GITLEAKS_ENABLE_SUMMARY, eventSpecificArguments);
        }
        break;
    case 'pull_request':
        {
            if (envExtractor('GITHUB_TOKEN', stringProcessor) === null) {
                error(
                    '🛑 GITHUB_TOKEN is now required to scan pull requests. You can use the automatically created token as shown in the [README](https://github.com/gitleaks/gitleaks-action#usage-example). For more info about the recent breaking update, see [here](https://github.com/gitleaks/gitleaks-action#-announcement).',
                );
                process.exit(ExitCode.Failure);
            }

            const owner = context.repo.owner;
            const repo = context.repo.repo;
            const pull_number = context.payload['number'];
            scanResult = await gitleaks.scanPullRequest(GITLEAKS_ENABLE_SUMMARY, owner, repo, pull_number);
        }
        break;
}

if (GITLEAKS_ENABLE_SUMMARY) {
    const summaryGenerator = new SummaryGenerator();
    const summaryData = await summaryGenerator.generate(scanResult, context.payload.repository?.html_url);

    const generatedSummary = summary.addHeading(summaryData.heading);

    if (summaryData.table.length > 0) {
        generatedSummary.addTable(summaryData.table);
    }

    await generatedSummary.write();
}

if (scanResult === ScanResultCodes.NO_LEAKS_DETECTED) {
    info('✅ No leaks detected');
    process.exit(ExitCode.Success);
}

if (scanResult === ScanResultCodes.LEAKS_DETECTED) {
    warning('🛑 Leaks detected, see job summary for details');
    process.exit(ExitCode.Failure);
}

error(`ERROR: Unexpected exit code [${scanResult}]`);
process.exit(ExitCode.Failure);
