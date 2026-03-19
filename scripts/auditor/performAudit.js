import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function performAudit(agent, contextText) {
    const systemPrompt = readFileSync(
        join(__dirname, '..', '..', 'skills', 'smart-contract-security-audit', 'system', 'RUN_AUDIT_PROMPT.md'),
        'utf8'
    );
    const userPromptTemplate = readFileSync(
        join(__dirname, '..', '..', 'skills', 'smart-contract-security-audit', 'user', 'RUN_AUDIT_PROMPT.md'),
        'utf8'
    );

    const userPrompt = userPromptTemplate.replace('{{contextText}}', contextText);

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

    const auditReport = response.content[0].text;
    return auditReport;
}