import { setFailed, info } from '@actions/core';

export async function postCommentOnPR(octokit, owner, repo, prNumber, report) {
  try {
    // Post comment on the PR
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: report,
    });

    info(`Audit comment posted on PR #${prNumber}`);
  } catch (error) {
    setFailed(`Audit failed: ${error.message}`);
  }
}
