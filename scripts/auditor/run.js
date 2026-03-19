import { setFailed, info } from '@actions/core';
import { context } from '@actions/github';

import { prepare } from './prepare.js';
import { performAudit } from './performAudit.js';
import { performSummary } from './performSummary.js';
import { postCommentOnPR } from './postCommentOnPR.js';

export async function run() {
    try {
        const payload = context.payload;
        if (!payload.pull_request) {
          info('Not a pull request event - skipping.');
          return;
        }
        const { contextText, octokit, owner, repo, prNumber, agent } = await prepare();
        const auditReport = await performAudit(agent, contextText);
        const summaryReport = await performSummary(agent, auditReport);
        await postCommentOnPR(octokit, owner, repo, prNumber, summaryReport);


    } catch (error) {
        setFailed(`Audit failed: ${error.message}`);
    }
}

await run();
