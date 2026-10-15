// Shared AI logic for /api/chat and /api/advisor.
// Plain fetch only, so the same code runs in the local Express server (Node) and in Netlify Edge Functions (Deno).
// API keys are read on the server side only and never reach the browser.

export type EnvGetter = (name: string) => string | undefined;
type ChatTurn = { role: 'user' | 'model'; text: string };
export type ApiResult = { status: number; payload: Record<string, unknown> };

const UNAVAILABLE = 'Hazırda cavab verə bilmirəm, bir az sonra yenidən cəhd edin.';
// Netlify Edge Functions must start responding within ~40 s; stay safely below that
const TOTAL_BUDGET_MS = 30_000;
const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;

// ---------- Prompts ----------
const CHAT_SYSTEM = `Sən "Yurd" platformasının köməkçi çatbotusan. Yurd Qarabağ və Şərqi Zəngəzurda torpaq sahiblərini (sahibkarları) investorlarla birləşdirən aqrar investisiya portalıdır.
QAYDALAR:
- Yalnız Azərbaycan dilində, nəzakətli və qısa cavab ver (adətən 2–5 cümlə, lazım olsa qısa siyahı).
- Mövzuların: platformadan necə istifadə etmək (Torpaq tap, müsabiqələr, müraciət forması, Müraciətlərim, investor vitrini), müraciət və investor təklifi prosesi (təkliflərin müqayisəsi və birinin seçilməsi), Qarabağ və Şərqi Zəngəzurda kənd təsərrüfatı imkanları (torpaq, iqlim, uyğun bitkilər: üzüm, nar, fındıq, qoz, buğda, arpa, yem bitkiləri, arıçılıq, heyvandarlıq), investor və torpaq sahibi arasında əməkdaşlıq modelləri (icarə, gəlir bölgüsü, birgə müəssisə) haqqında ümumi məsləhət.
- Hüquqi və maliyyə məsələlərində yalnız ümumi məlumat ver və konkret qərar üçün hüquqşünasa və ya maliyyə mütəxəssisinə müraciət etməyi tövsiyə et.
- Konkret rəqəm, qiymət və ya statistika uydurma; dəqiq bilmirsənsə bunu de.
- Mövzudan kənar suallarda nəzakətlə bildir ki, yalnız platforma və aqrar investisiya mövzularında kömək edə bilərsən, və uyğun bir sual təklif et.`;

const DISCLAIMER_TEXT = 'Bu, məsləhətdir, rəsmi qərar deyil.';
function advisorSystem(mode: 'SAHIBKAR' | 'INVESTOR'): string {
  return `Sən "Yurd" portalının torpaq məsləhətçisisən. Cavabı yalnız Azərbaycan dilində, sadə dildə ver (elə izah et ki, kənd təsərrüfatı bilməyən adam başa düşsün).
QAYDALAR:
1. Yalnız istifadəçinin göndərdiyi SAHƏ MƏLUMATI-na əsaslan. Orada olmayan rəqəm, məhsul həcmi, gəlir, qiymət və ya hadisə uydurma. Məlumat yoxdursa, "Bu barədə məlumatım yoxdur" de.
2. Hər əsas iddianın yanında mənbəni qeyd et: (Həqiqi), (Təxmini), (Nümunə məlumat) və ya (Simulyasiya). Mina statusu həmişə Simulyasiyadır, bunu açıq de.
3. Rejim: ${mode}. SAHIBKAR: nə becərmək olar, nəyi düzəltmək lazımdır, növbəti addım nədir. INVESTOR: risk və imkanlar, işıqfor (Yaşıl/Sarı/Qırmızı), sahənin zəif tərəfləri.
4. Qısa ol (6 cümləyə qədər), sonda lazımsa 2-3 maddəlik növbəti addım ver.
5. Alim dili işlətmə; pH, NDVI kimi terminlərin yanında sadə izah yaz.
6. Qərar vermə, hüquqi və ya maliyyə zəmanəti vermə. Sonda həmişə yaz: "${DISCLAIMER_TEXT}"
7. Sahə ilə əlaqəsi olmayan suala "Mən yalnız bu torpaq haqqında cavab verə bilərəm" de.`;
}

// ---------- Providers (free tiers), tried in order ----------
async function fetchJson(url: string, init: RequestInit, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs));
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${String(data?.error?.message || '').slice(0, 120)}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// Google Gemini (AI Studio free tier). "-latest" aliases follow Google's current free Flash models.
// flash-lite with low thinking answers in a few seconds; the full Flash model is the fallback.
async function askGemini(apiKey: string, model: string, lowThinking: boolean, system: string, turns: ChatTurn[], timeoutMs: number): Promise<string> {
  const generationConfig: Record<string, unknown> = { temperature: 0.4, maxOutputTokens: 4096 };
  if (lowThinking) generationConfig.thinkingConfig = { thinkingLevel: 'low' };
  const data = await fetchJson(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: turns.map(t => ({ role: t.role, parts: [{ text: t.text }] })),
        generationConfig
      })
    },
    timeoutMs
  );
  const parts: Array<{ text?: string; thought?: boolean }> = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.filter(p => !p.thought).map(p => p.text || '').join('').trim();
  if (!text) throw new Error('empty');
  return text;
}

// Groq / OpenRouter (OpenAI-compatible chat completions)
async function askOpenAICompatible(url: string, apiKey: string, model: string, system: string, turns: ChatTurn[], timeoutMs: number): Promise<string> {
  const data = await fetchJson(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 900,
        messages: [
          { role: 'system', content: system },
          ...turns.map(t => ({ role: t.role === 'model' ? 'assistant' : 'user', content: t.text }))
        ]
      })
    },
    timeoutMs
  );
  const text = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new Error('empty');
  return text;
}

// Env values pasted into a dashboard often carry quotes, spaces or invisible characters; HTTP headers only accept ASCII
function readKey(env: EnvGetter, name: string): string | undefined {
  const raw = env(name);
  if (!raw) return undefined;
  const key = raw.trim().replace(/^["'“”‘’«»]+|["'“”‘’«»]+$/g, '').replace(/[\s\u200B-\u200D\u2060\uFEFF]/g, '');
  if (!key) return undefined;
  if (/[^\x21-\x7E]/.test(key)) throw new Error(`invalid-key: ${name} contains non-ASCII characters (placeholder or copy error)`);
  return key;
}

export async function generate(system: string, turns: ChatTurn[], env: EnvGetter): Promise<string> {
  const attempts: Array<{ name: string; run: (timeoutMs: number) => Promise<string> }> = [];
  const gemini = readKey(env, 'GEMINI_API_KEY');
  if (gemini) {
    const primary = env('GEMINI_MODEL') || 'gemini-flash-lite-latest';
    attempts.push({ name: `gemini:${primary}`, run: t => askGemini(gemini, primary, true, system, turns, t) });
    attempts.push({ name: 'gemini:gemini-flash-latest', run: t => askGemini(gemini, 'gemini-flash-latest', false, system, turns, t) });
  }
  const groq = readKey(env, 'GROQ_API_KEY');
  if (groq) {
    const model = env('GROQ_MODEL') || 'llama-3.3-70b-versatile';
    attempts.push({ name: 'groq', run: t => askOpenAICompatible('https://api.groq.com/openai/v1/chat/completions', groq, model, system, turns, t) });
  }
  const openrouter = readKey(env, 'OPENROUTER_API_KEY');
  if (openrouter) {
    const model = env('OPENROUTER_MODEL') || 'meta-llama/llama-3.3-70b-instruct:free';
    attempts.push({ name: 'openrouter', run: t => askOpenAICompatible('https://openrouter.ai/api/v1/chat/completions', openrouter, model, system, turns, t) });
  }
  if (attempts.length === 0) throw new Error('no-provider');

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastErr: unknown = null;
  for (let i = 0; i < attempts.length; i++) {
    const remaining = deadline - Date.now();
    if (remaining < 2000) break;
    // The first attempt may use most of the budget but leaves room for one fallback
    const budget = i === 0 && attempts.length > 1 ? Math.min(remaining - 8000, 20_000) : remaining;
    try {
      return await attempts[i].run(budget);
    } catch (err: any) {
      lastErr = err;
      console.error(`[ai] ${attempts[i].name} failed:`, String(err?.message || err).slice(0, 200));
    }
  }
  throw lastErr || new Error('timeout');
}

// Short, key-free description of why every provider failed
function failureReason(err: any): string {
  const msg = String(err?.message || err || 'unknown');
  if (msg === 'no-provider') return 'no-provider: GEMINI_API_KEY is not set for this deploy';
  if (err?.name === 'AbortError') return 'timeout';
  return msg.replace(/key=[^&\s]+/gi, 'key=***').slice(0, 160);
}

// ---------- Request handling ----------
// Simple per-client limit: 20 requests per minute per endpoint (per server instance)
const hits = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter(t => now - t < 60_000);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > 20;
}

// Expected failures are returned as 200 + { error } so the browser console stays clean; the UI shows the message
export async function handleChat(body: any, clientKey: string, env: EnvGetter): Promise<ApiResult> {
  if (rateLimited('chat:' + clientKey)) {
    return { status: 200, payload: { error: 'Çox sayda sorğu göndərildi. Bir dəqiqə sonra yenidən yoxlayın.' } };
  }
  const raw = Array.isArray(body?.messages) ? body.messages : [];
  const turns: ChatTurn[] = raw
    .slice(-MAX_MESSAGES)
    .filter((m: any) => (m?.role === 'user' || m?.role === 'model') && typeof m?.text === 'string' && m.text.trim())
    .map((m: any) => ({ role: m.role, text: String(m.text).slice(0, MAX_CHARS) }));
  // Conversations must start with the user
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (turns.length === 0 || turns[turns.length - 1].role !== 'user') {
    return { status: 400, payload: { error: 'Sual boşdur.' } };
  }
  try {
    return { status: 200, payload: { reply: await generate(CHAT_SYSTEM, turns, env) } };
  } catch (err: any) {
    // `reason` is not shown in the UI; it lets the deploy be diagnosed from the network tab (never contains keys)
    return { status: 200, payload: { error: UNAVAILABLE, reason: failureReason(err) } };
  }
}

export async function handleAdvisor(body: any, clientKey: string, env: EnvGetter): Promise<ApiResult> {
  if (rateLimited('advisor:' + clientKey)) {
    return { status: 200, payload: { error: UNAVAILABLE } };
  }
  const context = typeof body?.context === 'string' ? body.context.slice(0, 4000) : '';
  const question = typeof body?.question === 'string' ? body.question.trim().slice(0, 1000) : '';
  const mode = body?.mode === 'INVESTOR' ? 'INVESTOR' : 'SAHIBKAR';
  if (!context || !question) {
    return { status: 400, payload: { error: 'Sual boşdur.' } };
  }
  try {
    const answer = await generate(
      advisorSystem(mode),
      [{ role: 'user', text: `SAHƏ MƏLUMATI:\n${context}\n\nİSTİFADƏÇİ SUALI:\n${question}` }],
      env
    );
    return { status: 200, payload: { answer } };
  } catch {
    return { status: 200, payload: { error: UNAVAILABLE } };
  }
}
