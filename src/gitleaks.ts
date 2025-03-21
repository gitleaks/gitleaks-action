import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DefaultArtifactClient } from '@actions/artifact';
import { restoreCache, saveCache } from '@actions/cache';
import { addPath, error, info, setOutput, warning } from '@actions/core';
import { exec } from '@actions/exec';
import type { GitHub } from '@actions/github/lib/utils';
import { downloadTool, extractTar } from '@actions/tool-cache';
import { booleanProcessor, envExtractor, envExtractorThrows, stringProcessor } from './helpers';
import { DEFAULT_GITLEAKS_VERSION } from './index';

type ScanInfo = {
    base_ref?: string;
    head_ref?: string;
};

export enum ScanResultCodes {
    NO_LEAKS_DETECTED = 0,
    ERROR_OCCURRED_WHILE_SCANNING = 1,
    LEAKS_DETECTED = 2,
}

export class Gitleaks {
    private defaultScanArgs = [
        'detect',
        '--redact',
        '-v',
        '--exit-code=2',
        '--report-format=sarif',
        '--report-path=results.sarif',
        '--log-level=debug',
    ];

    private readonly is_comments_enabled: boolean;

    constructor(private readonly octokitClient: InstanceType<typeof GitHub>) {
        this.is_comments_enabled = envExtractorThrows('GITLEAKS_ENABLE_COMMENTS', booleanProcessor, true);
        info(`Gitleaks comments enabled: ${this.is_comments_enabled}`);
    }

    /**
     * Install gitleaks
     * download the gitleaks binary and install it in the system
     * and cache downloaded gitleaks binary in the tool cache
     * @param version
     */
    public async install(version: string): Promise<void> {
        const pathToInstall = join(tmpdir(), `gitleaks-${version}`);
        info(`Version to install: ${version} (target directory: ${pathToInstall})`);
        const cacheKey = `gitleaks-cache-${version}-${process.platform}-${process.arch}`;

        let restoredFromCache = null;
        try {
            restoredFromCache = await restoreCache([pathToInstall], cacheKey);
        } catch (error) {
            warning(error as Error);
        }

        if (restoredFromCache !== null) {
            info('Gitleaks restored from cache');
            addPath(pathToInstall);
            return;
        }

        const gitleaksDownloadUrl = this.generateDownloadUrl(process.platform, process.arch, version);

        info(`Downloading gitleaks from ${gitleaksDownloadUrl}`);

        let tempBinaryPath: string | null = null;

        try {
            tempBinaryPath = await downloadTool(gitleaksDownloadUrl, join(tmpdir(), 'gitleaks.tmp'));
        } catch (err) {
            error(`Could not install gitleaks from ${gitleaksDownloadUrl}. Error: ${err}`);
        }

        // TODO: Check why given '' is OK. Maybe handle it correctly
        await extractTar(tempBinaryPath || '', pathToInstall);

        try {
            await saveCache([pathToInstall], cacheKey);
        } catch (err) {
            warning(err as Error);
        }

        addPath(pathToInstall);
    }

    private generateDownloadUrl(platform: NodeJS.Platform, arch: NodeJS.Architecture, version: string): string {
        const baseUrl = 'https://github.com/zricethezav/gitleaks/releases/download';
        return `${baseUrl}/v${version}/gitleaks_${version}_${platform === 'win32' ? 'windows' : platform}_${arch}.tar.gz`;
    }

    public async getLatestReleaseVersion(): Promise<string> {
        const response = await this.octokitClient.rest.repos.getLatestRelease({
            owner: 'zricethezav',
            repo: 'gitleaks',
        });

        if (response.status !== 200) {
            error(
                `Could not get latest release version. Status: ${response.status}. Using default version: ${DEFAULT_GITLEAKS_VERSION}`,
            );
            return DEFAULT_GITLEAKS_VERSION;
        }

        return response.data.tag_name.replace(/^v/, '');
    }

    public async scan(should_upload_artifact: boolean, eventSpecificArg: string[]): Promise<ScanResultCodes> {
        const args = [...this.defaultScanArgs, ...eventSpecificArg];

        info(`gitleaks cmd: gitleaks ${args.join(' ')}`);

        const exitCode = await exec('gitleaks', args, {
            ignoreReturnCode: true,
            delay: 60_000, // 1 minute
        });

        setOutput('exit-code', exitCode);

        if (!should_upload_artifact) {
            return exitCode;
        }

        const artifactClient = new DefaultArtifactClient();
        const artifactName = 'gitleaks-results.sarif';

        try {
            await artifactClient.uploadArtifact(
                artifactName,
                ['results.sarif'],
                envExtractorThrows('HOME', stringProcessor),
            );
        } catch (err) {
            warning(err as Error);
        }

        return exitCode;
    }

    public async scanPullRequest(
        should_upload_artifact: boolean,
        repository_owner: string,
        repository: string,
        pull_request_number: number,
    ): Promise<ScanResultCodes> {
        const pullRequestCommits = await this.octokitClient.rest.pulls.listCommits({
            owner: repository_owner,
            repo: repository,
            pull_number: pull_request_number,
        });

        if (pullRequestCommits.status !== 200) {
            error(`Could not get pull request commits. Status: ${pullRequestCommits.status}`);
            return ScanResultCodes.ERROR_OCCURRED_WHILE_SCANNING;
        }

        if (pullRequestCommits.data.length === 0) {
            error('No commits found in the pull request. Strange behavior.');
            return ScanResultCodes.ERROR_OCCURRED_WHILE_SCANNING;
        }

        const scanInfo: ScanInfo = {
            base_ref: pullRequestCommits.data[0]!.sha,
            head_ref: pullRequestCommits.data[pullRequestCommits.data.length - 1]!.sha,
        };

        const eventSpecificArg = this.getEventSpecificArgs(scanInfo, 'pull_request');

        const exitCode = await this.scan(should_upload_artifact, eventSpecificArg);

        if (!this.is_comments_enabled) {
            // Skip any comments if `GITLEAKS_ENABLE_COMMENTS` is set to false
            return exitCode;
        }

        if (exitCode !== ScanResultCodes.LEAKS_DETECTED) {
            return exitCode;
        }

        const sarifFileContent = await readFile('results.sarif', 'utf-8');

        const sarif = JSON.parse(sarifFileContent);

        if (sarif.runs.length === 0) {
            warning('No runs found in the SARIF file');
            return exitCode;
        }

        for (let i = 0; i < sarif.runs[0].results.length; i++) {
            const results = sarif.runs[0].results[i];
            const commit_sha = results.partialFingerprints.commitSha;
            const fingerprint = `${commit_sha}:${results.locations[0].physicalLocation.artifactLocation.uri}:${results.ruleId}:${results.locations[0].physicalLocation.region.startLine}`;

            const proposedComment = {
                owner: repository_owner,
                repo: repository,
                pull_number: pull_request_number,
                body: `🛑 **Gitleaks** has detected a secret with rule-id \`${results.ruleId}\` in commit ${commit_sha}.
If this secret is a _true_ positive, please rotate the secret ASAP.

If this secret is a _false_ positive, you can add the fingerprint below to your \`.gitleaksignore\` file and commit the change to this branch.

\`\`\`
echo ${fingerprint} >> .gitleaksignore
\`\`\`
`,
                commit_id: commit_sha,
                path: results.locations[0].physicalLocation.artifactLocation.uri,
                side: 'RIGHT' as const,
                line: results.locations[0].physicalLocation.region.startLine,
            };

            // check if there are any GITLEAKS_NOTIFY_USER_LIST env variable
            const notifyUserList = envExtractor('GITLEAKS_NOTIFY_USER_LIST', stringProcessor);
            if (notifyUserList) {
                proposedComment.body += `\n\ncc ${notifyUserList}`;
            }

            // check if there are any review comments on the pull request currently
            const comments = await this.octokitClient.request(
                'GET /repos/{owner}/{repo}/pulls/{pull_number}/comments',
                {
                    owner: repository_owner,
                    repo: repository,
                    pull_number: pull_request_number,
                },
            );

            if (comments.status !== 200) {
                // TODO: Handle this error better
                warning(`Could not get pull request comments. Status: ${comments.status}`);
            }

            let skip = false;
            // iterate through comments, checking if the proposed comment is already present
            // TODO: If performance becomes too slow, pull this for loop out of the
            // outer for loop and create a dictionary of all the existing comments, but it may introduce new behavior
            comments.data.forEach((comment) => {
                if (
                    comment.body === proposedComment.body &&
                    comment.path === proposedComment.path &&
                    comment.original_line === proposedComment.line
                ) {
                    // comment already present, skip
                    skip = true;
                    return;
                }
            });

            if (skip) {
                continue;
            }

            try {
                await this.octokitClient.rest.pulls.createReviewComment(proposedComment);
            } catch (error) {
                warning(`Error encountered when attempting to write a comment on PR #${pull_request_number}: ${error}
Likely an issue with too large of a diff for the comment to be written.
All secrets that have been leaked will be reported in the summary and job artifact.`);
            }
        }

        return exitCode;
    }

    public getEventSpecificArgs(scan_info: ScanInfo, event_type: string): string[] {
        switch (event_type) {
            case 'push': {
                if (scan_info.base_ref === scan_info.head_ref) {
                    return [`--log-opts=-1`];
                }
                return [`--log-opts=--no-merges --first-parent ${scan_info.base_ref}^..${scan_info.head_ref}`];
            }
            case 'pull_request':
                return [`--log-opts=--no-merges --first-parent ${scan_info.base_ref}^..${scan_info.head_ref}`];
            default:
                return [];
        }
    }
}
