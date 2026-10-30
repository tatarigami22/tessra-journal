// Try the bot's answers without Discord:  npm run ask -- "how do I import from tradovate?"
// Add --bug to answer as if the question was posted in #bug-reports.
'use strict';
require('./env');
const Anthropic = require('@anthropic-ai/sdk');
const { config, loadKnowledge, systemPrompt, parseReply } = require('./core');

(async () => {
  const args = process.argv.slice(2);
  const bug = args.includes('--bug');
  const q = args.filter((a) => a !== '--bug').join(' ');
  if (!q) { console.log('Usage: npm run ask -- "your question" [--bug]'); return; }
  const cfg = config();
  const k = await loadKnowledge();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await anthropic.messages.create({
    model: cfg.model, max_tokens: cfg.maxTokens, system: systemPrompt(k),
    messages: [{ role: 'user', content: `${bug ? '(posted in #bug-reports) ' : ''}tester: ${q}` }],
  });
  const raw = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  const r = parseReply(raw);
  console.log(r.text);
  if (r.bug) console.log(`\n[logged bug: ${r.bug}]`);
  if (r.escalate) console.log(`\n[would ping Mods: ${r.escalate}]`);
  const u = res.usage;
  const cost = (u.input_tokens * 0.10 + u.output_tokens * 0.50) / 1e6;
  console.log(`\n(${u.input_tokens} in, ${u.output_tokens} out, about $${cost.toFixed(5)})`);
})().catch((e) => { console.error(e.message); process.exit(1); });
