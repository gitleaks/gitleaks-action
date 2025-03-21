import { readFile } from 'node:fs/promises';
import { ScanResultCodes } from './gitleaks';

export class SummaryGenerator {
    public async generate(
        code: ScanResultCodes,
        repo_url: string | undefined,
    ): Promise<{
        heading: string;
        table: Array<Array<string> | Array<{ data: string; header: boolean }>>;
    }> {
        if (code === ScanResultCodes.NO_LEAKS_DETECTED) {
            return {
                heading: 'No leaks detected ✅',
                table: [],
            };
        }

        if (code === ScanResultCodes.ERROR_OCCURRED_WHILE_SCANNING) {
            return {
                heading: `❌ Gitleaks exited with error. Exit code [${code}]`,
                table: [],
            };
        }

        if (code !== ScanResultCodes.LEAKS_DETECTED) {
            return {
                heading: `❌ Gitleaks exited with unexpected exit code [${code}]`,
                table: [],
            };
        }

        const rows: string[][] = [[]];
        const headers = [
            { data: 'Rule ID', header: true },
            { data: 'Commit', header: true },
            { data: 'Secret URL', header: true },
            { data: 'Start Line', header: true },
            { data: 'Author', header: true },
            { data: 'Date', header: true },
            { data: 'Email', header: true },
            { data: 'File', header: true },
        ];

        const sarifContent = await readFile('results.sarif', 'utf8');

        const sarif = JSON.parse(sarifContent);

        const run = sarif.runs[0];

        if (!run) {
            return {
                heading: '❌ No runs found in SARIF file. Weird behavior.',
                table: [],
            };
        }

        for (const result of run.results) {
            const commitSha = result.partialFingerprints.commitSha;
            const commitURL = `${repo_url}/commit/${commitSha}`;
            const secretURL = `${repo_url}/blob/${commitSha}/${result.locations[0].physicalLocation.artifactLocation.uri}#L${result.locations[0].physicalLocation.region.startLine}`;
            const fileURL = `${repo_url}/blob/${commitSha}/${result.locations[0].physicalLocation.artifactLocation.uri}`;
            rows.push([
                result.ruleId,
                `<a href="${commitURL}">${commitSha.substring(0, 7)}</a>`,
                `<a href="${secretURL}">View Secret</a>`,
                result.locations[0].physicalLocation.region.startLine.toString(),
                result.partialFingerprints.author,
                result.partialFingerprints.date,
                result.partialFingerprints.email,
                `<a href="${fileURL}">${result.locations[0].physicalLocation.artifactLocation.uri}</a>`,
            ]);
        }

        return {
            heading: '🛑 Gitleaks detected secrets 🛑',
            table: [headers, ...rows],
        };
    }
}
