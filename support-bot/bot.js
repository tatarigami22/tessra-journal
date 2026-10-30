// Tessra support bot: answers in #help and #bug-reports with Claude, pings Mods when it can't help.
'use strict';
require('./env');
const { Client, GatewayIntentBits, Events } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');
const { config, loadKnowledge, createSupport } = require('./core');

const cfg = config();
for (const key of ['DISCORD_TOKEN', 'ANTHROPIC_API_KEY']) {
  if (!process.env[key]) { console.error(`Missing ${key}. Put it in support-bot/.env`); process.exit(1); }
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
async function llm({ system, messages, model, maxTokens }) {
  const res = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages,
  });
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
let support;

function ctxFor(guild) {
  return {
    botId: client.user.id,
    findRole: (name) => guild.roles.cache.find((r) => r.name.toLowerCase() === name),
    logToMods: async (text) => {
      const ch = guild.channels.cache.find((c) => c.name.toLowerCase() === cfg.logChannel && c.isTextBased());
      if (!ch) return;
      await ch.send({ content: text.slice(0, 1990), allowedMentions: { parse: [] } }).catch((e) => console.warn('mod log failed', e.message));
    },
  };
}

client.once(Events.ClientReady, async () => {
  const knowledge = await loadKnowledge();
  support = createSupport({ llm, cfg, knowledge });
  console.log(`Logged in as ${client.user.tag}. Latest Tessra: ${knowledge.version || 'unknown'}. Model: ${cfg.model}`);
  console.log(`Invite link: https://discord.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=309237713984`);
  for (const g of client.guilds.cache.values()) {
    const names = new Set(g.channels.cache.map((c) => c.name.toLowerCase()));
    const missing = cfg.channels.filter((c) => !names.has(c));
    console.log(`Server "${g.name}": watching ${cfg.channels.join(', ')}${missing.length ? ` (not found: ${missing.join(', ')})` : ''}. Mod log: ${names.has(cfg.logChannel) ? '#' + cfg.logChannel : 'none'}`);
  }
  setInterval(async () => { support.setKnowledge(await loadKnowledge()); }, 6 * 60 * 60 * 1000); // pick up README changes after releases
  setInterval(() => { for (const g of client.guilds.cache.values()) support.tick(ctxFor(g)).catch(() => {}); }, 60 * 1000);
});

client.on(Events.MessageCreate, (m) => {
  if (!support || !m.guild) return;
  support.onMessage(m, ctxFor(m.guild)).catch((e) => console.error('message failed', e));
});

process.on('unhandledRejection', (e) => console.error('unhandled', e));
client.login(process.env.DISCORD_TOKEN);
