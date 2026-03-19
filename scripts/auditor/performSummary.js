import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function performSummary(agent, auditReport) {
    const systemPrompt = readFileSync(
        join(__dirname, '..', '..', 'skills', 'smart-contract-security-audit', 'system', 'RUN_SUMMARY_PROMPT.md'),
        'utf8'
    );
    const userPromptTemplate = readFileSync(
        join(__dirname, '..', '..', 'skills', 'smart-contract-security-audit', 'user', 'RUN_SUMMARY_PROMPT.md'),
        'utf8'
    );

    const userPrompt = userPromptTemplate.replace('{{auditReport}}', auditReport);

    // Run the agent with system prompt and user message
    const response = await agent.messages.create({
        model: 'claude-sonnet-4-6',
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

    const summaryReport = response.content[0].text;
    return summaryReport;
}