// পাবলিক বাংলা চ্যাটবট (Cloudflare Workers + Groq)
// API key কোডে নেই: Worker-এর Settings > Variables and Secrets-এ GROQ_API_KEY নামে সেট করুন।

const MODEL = "llama-3.3-70b-versatile";
const SYSTEM_PROMPT =
  "তুমি একটি সহায়ক বাংলা চ্যাটবট। ব্যবহারকারী যে ভাষায় লেখে (বাংলা, ইংরেজি বা বাংলিশ), সেই ভাষাতেই সহজ ও পরিষ্কারভাবে উত্তর দাও। উত্তর ছোট ও কাজের রাখো। না জানলে সোজা বলো যে জানো না।";

const HTML = `<!doctype html>
<html lang="bn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>বাংলা চ্যাটবট</title>
<style>
  :root { --bg:#fff; --fg:#1a1a1a; --card:#f1f3f5; --me:#2563eb; --mefg:#fff; --line:#d0d5db; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#111418; --fg:#eceff3; --card:#1f242b; --me:#3b6fe0; --mefg:#fff; --line:#333a44; }
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { background: var(--bg); color: var(--fg); font-family: system-ui, sans-serif; display: flex; flex-direction: column; }
  header { padding: 14px 16px; font-weight: 600; border-bottom: 1px solid var(--line); }
  #chat { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
  .msg { max-width: 85%; padding: 10px 14px; border-radius: 16px; white-space: pre-wrap; line-height: 1.5; word-wrap: break-word; }
  .bot { background: var(--card); align-self: flex-start; }
  .me { background: var(--me); color: var(--mefg); align-self: flex-end; }
  form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--line); }
  input { flex: 1; padding: 12px 14px; font-size: 16px; border-radius: 12px; border: 1px solid var(--line); background: var(--bg); color: var(--fg); }
  button { padding: 12px 18px; font-size: 16px; border: 0; border-radius: 12px; background: var(--me); color: var(--mefg); }
  button:disabled { opacity: .5; }
</style>
</head>
<body>
<header>বাংলা চ্যাটবট</header>
<div id="chat"><div class="msg bot">নমস্কার! আমাকে যেকোনো প্রশ্ন করুন, বাংলা বা ইংরেজিতে।</div></div>
<form id="f">
  <input id="q" placeholder="এখানে লিখুন..." autocomplete="off">
  <button id="b">পাঠান</button>
</form>
<script>
  var chat = document.getElementById("chat");
  var f = document.getElementById("f");
  var q = document.getElementById("q");
  var b = document.getElementById("b");
  var chatLog = [];

  function add(text, cls) {
    var d = document.createElement("div");
    d.className = "msg " + cls;
    d.textContent = text;
    chat.appendChild(d);
    chat.scrollTop = chat.scrollHeight;
    return d;
  }

  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = q.value.trim();
    if (!text) return;
    q.value = "";
    add(text, "me");
    chatLog.push({ role: "user", content: text });
    var bot = add("...", "bot");
    b.disabled = true;

    fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatLog })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var reply = data.reply || "দুঃখিত, এখন উত্তর দিতে পারছি না। একটু পরে আবার চেষ্টা করুন।";
        bot.textContent = reply;
        chatLog.push({ role: "assistant", content: reply });
      })
      .catch(function () {
        bot.textContent = "নেটওয়ার্কে সমস্যা হয়েছে। আবার চেষ্টা করুন।";
        chatLog.pop();
      })
      .finally(function () { b.disabled = false; q.focus(); });
  });
</script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/") {
      return new Response(HTML, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    if (request.method === "POST" && url.pathname === "/chat") {
      try {
        const body = await request.json();
        const messages = (body.messages || [])
          .slice(-12)
          .filter((m) => m && (m.role === "user" || m.role === "assistant"))
          .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));

        if (messages.length === 0) return json({ error: "empty" }, 400);

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + env.GROQ_API_KEY,
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 800,
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
          }),
        });

        if (!res.ok) return json({ error: "upstream" }, 502);
        const data = await res.json();
        return json({ reply: data.choices[0].message.content });
      } catch (e) {
        return json({ error: "server" }, 500);
      }
    }

    return new Response("Not found", { status: 404 });
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
