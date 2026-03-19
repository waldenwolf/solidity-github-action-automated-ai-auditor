import { setFailed, info } from '@actions/core';
import { getOctokit, context } from '@actions/github';
import { Anthropic } from '@anthropic-ai/sdk';

export async function prepare() {
    const result = {
        contextText: null,
        octokit: null,
        owner: null,
        repo: null,
        prNumber: null,
        agent: null
    };
    try {
    const payload = context.payload;
    if (!payload.pull_request) {
      info('Not a pull request event - skipping.');
      return result;
    }

    const prNumber = payload.pull_request.number;
    const owner = context.repo.owner;
    const repo = context.repo.repo;
    const baseSha = payload.pull_request.base.sha;

    const octokit = getOctokit(process.env.GITHUB_TOKEN);

    // Get changed files (includes patch/diff)
    const { data: files } = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 100,
    });

    // Filter only Solidity files
    const solidityFiles = files.filter(file => file.filename.endsWith('.sol'));
    if (solidityFiles.length === 0) {
      info('No .sol files changed - skipping audit.');
      return result;
    }

    // Build rich context: full prior contract + diff for each file
    let contextText = '';
    for (const file of solidityFiles) {
      let priorCode = 'New file (no prior version)';
      if (file.status !== 'added') {
        try {
          const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: file.filename,
            ref: baseSha,
          });
          priorCode = Buffer.from(data.content, 'base64').toString('utf-8');
        } catch (err) {
          priorCode = 'Unable to fetch prior version';
        }
      }

      const diff = file.patch || 'No diff available';
      contextText += `### File: ${file.filename}\n**Status:** ${file.status}\n\n**Prior version:**\n\`\`\`solidity\n${priorCode}\n\`\`\`\n\n**Diff:**\n\`\`\`diff\n${diff}\n\`\`\`\n\n---\n\n`;
    }
    result.contextText = contextText;
    result.octokit = octokit;
    result.owner = owner;
    result.repo = repo;
    result.prNumber = prNumber;

    result.agent = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    return result;
  } catch (error) {
    setFailed(`Audit failed: ${error.message}`);
    return result;
  }
}