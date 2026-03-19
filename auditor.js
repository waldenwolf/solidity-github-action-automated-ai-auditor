// audit.js  (place this file in the root of your repository)
const core = require('@actions/core');
const { getOctokit, context } = require('@actions/github');
const Anthropic = require('@anthropic-ai/sdk');

async function run() {
  try {
    const payload = context.payload;
    if (!payload.pull_request) {
      core.info('Not a pull request event – skipping.');
      return;
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
      core.info('No .sol files changed – skipping audit.');
      return;
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

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Prompt engineered for CodeRabbit-style output + full security audit
    const systemPrompt = `You are an expert Solidity smart contract security auditor with deep knowledge of common vulnerabilities (reentrancy, integer overflow/underflow, access control, oracle manipulation, gas griefing, etc.), best practices, and gas optimization.

Always respond in clean GitHub-flavored Markdown.
Structure your reply exactly like this:
1. **Quick Summary** (1-2 sentences – exactly like CodeRabbit: what changed and why it matters)
2. **Security Audit** (detailed analysis with severity levels: Critical / High / Medium / Low / Info)
   - For every finding include: location, explanation, impact, and recommended fix.
3. **Recommendations** (optional fixes or improvements)

Be concise yet thorough. Reference specific lines/files when possible.`;

    const userPrompt = `Here are the Solidity contract changes (prior version + diff) from this PR:\n\n${contextText}\n\nAnalyze the changes now.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',           // Latest balanced model as of 2026 (fast + excellent at code review)
      max_tokens: 4096,
      temperature: 0.3,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const auditReport = response.content[0].text;

    // Post comment on the PR
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: auditReport,
    });

    core.info(`✅ Audit comment posted on PR #${prNumber}`);
  } catch (error) {
    core.setFailed(`Audit failed: ${error.message}`);
  }
}

run();