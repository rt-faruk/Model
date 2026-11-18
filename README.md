# বাংলা চ্যাটবট

Cloudflare Workers + Groq দিয়ে বানানো পাবলিক চ্যাটবট।

- `worker.js` — চ্যাট পেজ ও সার্ভারের কোড
- `wrangler.toml` — Cloudflare কনফিগ (নাম: `banglabot`)

API key এই রিপোজিটরিতে রাখা হয়নি। Cloudflare-এ Worker-এর
Settings → Variables and Secrets থেকে `GROQ_API_KEY` নামে Secret সেট করতে হবে।
