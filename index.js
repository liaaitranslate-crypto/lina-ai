require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const app = express();

// ============================================================
// CONFIG
// ============================================================

const PORT = process.env.PORT || 3000;

const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_MODEL =
  "deepseek/deepseek-v4-flash";

const LINA_REFERER =
  "https://lina-ai.lia-ai-translate.workers.dev/";

// ============================================================
// APP
// ============================================================

app.use(cors());

app.use(
  express.json({
    limit: "25mb"
  })
);
// ============================================================
// LINA ANALYTICS
// ============================================================

const ANALYTICS_DIR = path.join(__dirname, "data");
const ANALYTICS_FILE = path.join(
  ANALYTICS_DIR,
  "analytics.json"
);

if (!fs.existsSync(ANALYTICS_DIR)) {
  fs.mkdirSync(ANALYTICS_DIR, {
    recursive: true
  });
}

if (!fs.existsSync(ANALYTICS_FILE)) {
  fs.writeFileSync(
    ANALYTICS_FILE,
    JSON.stringify({
      visitors: {},
      dailyVisits: {},
      dailyRegistrations: {}
    }, null, 2),
    "utf8"
  );
}

function readAnalytics() {
  try {
    return JSON.parse(
      fs.readFileSync(
        ANALYTICS_FILE,
        "utf8"
      )
    );
  } catch (error) {
    return {
      visitors: {},
      dailyVisits: {},
      dailyRegistrations: {}
    };
  }
}

function saveAnalytics(data) {
  fs.writeFileSync(
    ANALYTICS_FILE,
    JSON.stringify(
      data,
      null,
      2
    ),
    "utf8"
  );
}

function isBot(req) {
  const userAgent =
    req.headers["user-agent"] || "";

  return /bot|crawler|spider|slurp|facebookexternalhit|bingpreview|OAI-SearchBot|Google-InspectionTool/i.test(
    userAgent
  );
}

function getToday() {
  return new Date()
    .toISOString()
    .slice(0, 10);
}

function getVisitorId(req) {
  const cookie =
    req.headers.cookie || "";

  const match =
    cookie.match(
      /(?:^|;\s*)lina_visitor=([^;]+)/
    );

  if (match) {
    return decodeURIComponent(
      match[1]
    );
  }

  return crypto.randomUUID();
}

app.use((req, res, next) => {
  if (
    req.path.startsWith("/api") ||
    req.path.startsWith("/admin") ||
    isBot(req) ||
    req.method !== "GET"
  ) {
    return next();
  }

  const visitorId =
    getVisitorId(req);

  const analytics =
    readAnalytics();

  const today =
    getToday();

  if (!analytics.visitors) {
    analytics.visitors = {};
  }

  if (!analytics.dailyVisits) {
    analytics.dailyVisits = {};
  }

  if (!analytics.visitors[visitorId]) {
    analytics.visitors[visitorId] = {
      firstVisit: new Date().toISOString(),
      lastVisit: new Date().toISOString()
    };

    analytics.dailyVisits[today] =
      (analytics.dailyVisits[today] || 0) + 1;
  } else {
    analytics.visitors[visitorId].lastVisit =
      new Date().toISOString();
  }

  saveAnalytics(analytics);

  res.setHeader(
    "Set-Cookie",
    `lina_visitor=${encodeURIComponent(visitorId)}; Path=/; Max-Age=31536000; SameSite=Lax`
  );

  next();
});
// ============================================================
// LINA FRONTEND
// ============================================================

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

// ============================================================
// HEALTH
// ============================================================

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "Lina backend is healthy",
    ai: process.env.OPENROUTER_API_KEY
      ? "API key detected"
      : "API key missing",
    model: DEFAULT_MODEL,
    streaming: true,
    version: "2.0"
  });
});

// ============================================================
// LINA SYSTEM PROMPT
// ============================================================

const linaSystemPrompt = `
تو Lina هستی؛ دستیار هوش مصنوعی این برنامه.

هویت تو:
- نام تو Lina است.
- همیشه خودت را Lina معرفی کن.
- اگر کاربر پرسید «اسمت چیست؟»، «تو کی هستی؟»، «خودت را معرفی کن» یا سؤال مشابهی پرسید، بگو که Lina هستی.
- تو یک دستیار هوش مصنوعی هستی.
- خودت را ChatGPT معرفی نکن.
- خودت را با نام مدل یا سرویس پشت‌صحنه معرفی نکن.
- اگر کاربر درباره فناوری پشت‌صحنه سؤال کرد، توضیح بده که Lina یک دستیار هوش مصنوعی است و از یک مدل هوش مصنوعی در پشت‌صحنه استفاده می‌کند.
- پاسخ‌ها را طبیعی، دوستانه، واضح و مفید بده.
- زبان پاسخ را با زبان کاربر هماهنگ کن.
- اگر کاربر فارسی صحبت کرد، فارسی روان و طبیعی پاسخ بده.
- اگر کاربر انگلیسی صحبت کرد، انگلیسی پاسخ بده.
- اگر کاربر عربی صحبت کرد، عربی پاسخ بده.
- اگر کاربر اردو صحبت کرد، اردو پاسخ بده.
- در پاسخ‌ها وانمود نکن که انسان هستی.
- اگر سؤال نیاز به توضیح دارد، پاسخ کامل و قابل فهم بده.
- اگر کاربر به پیام قبلی اشاره کرد، از تاریخچه مکالمه استفاده کن.
- موضوع گفت‌وگو را تا زمانی که کاربر چت جدیدی شروع نکرده، دنبال کن.

قواعد کیفیت:
- اطلاعات را بی‌دلیل حذف نکن.
- اگر سؤال پیچیده است، مرحله‌به‌مرحله توضیح بده.
- اگر کد لازم است، کد کامل و قابل استفاده ارائه کن.
- اگر مطمئن نیستی، حدس را به عنوان حقیقت بیان نکن.
- پاسخ‌ها را تا حد امکان دقیق و کاربردی نگه دار.

مهم‌ترین قانون:
هویت تو همیشه Lina است.
`;

// ============================================================
// HELPERS
// ============================================================

function cleanHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(
      (item) =>
        item &&
        (item.role === "user" ||
          item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim()
    )
    .slice(-30)
    .map((item) => ({
      role: item.role,
      content: item.content.trim()
    }));
}

// ============================================================
// CHAT HISTORY COMPATIBILITY
// ============================================================

function getChatHistory(body) {
  let history = [];

  if (Array.isArray(body.history)) {
    history = body.history;
  } else if (Array.isArray(body.messages)) {
    history = body.messages;
  }

  return cleanHistory(history);
}

function removeCurrentUserFromHistory(
  history,
  currentMessage
) {
  if (!history.length) {
    return history;
  }

  const last = history[history.length - 1];

  if (
    last.role === "user" &&
    last.content === currentMessage.trim()
  ) {
    return history.slice(0, -1);
  }

  return history;
}

// ============================================================
// MODEL SELECTION
// ============================================================

function selectModel(task, requestedModel) {
  if (
    typeof requestedModel === "string" &&
    requestedModel.trim()
  ) {
    return requestedModel.trim();
  }

  switch (task) {
    case "code":
      return DEFAULT_MODEL;

    case "translate":
      return DEFAULT_MODEL;

    case "rewrite":
      return DEFAULT_MODEL;

    case "fast":
      return DEFAULT_MODEL;

    case "chat":
    default:
      return DEFAULT_MODEL;
  }
}

// ============================================================
// OPENROUTER REQUEST
// ============================================================

async function openRouterRequest(
  messages,
  options = {}
) {
  const {
    model = DEFAULT_MODEL,
    stream = false,
    temperature,
    max_tokens
  } = options;

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(
      "کلید اتصال هوش مصنوعی در سرور تنظیم نشده است."
    );
  }

  const body = {
    model,
    messages,
    stream
  };

  if (typeof temperature === "number") {
    body.temperature = temperature;
  }

  if (typeof max_tokens === "number") {
    body.max_tokens = max_tokens;
  }

  const response = await fetch(
    OPENROUTER_URL,
    {
      method: "POST",

      headers: {
        "Authorization":
          `Bearer ${process.env.OPENROUTER_API_KEY}`,

        "Content-Type":
          "application/json",

        "HTTP-Referer":
          LINA_REFERER,

        "X-Title":
          "Lina AI"
      },

      body: JSON.stringify(body)
    }
  );

  return response;
}

// ============================================================
// NORMAL AI REQUEST
// ============================================================

async function askLina(
  messages,
  options = {}
) {
  const maxRetries = 2;

  let lastError = null;

  for (
    let attempt = 0;
    attempt <= maxRetries;
    attempt++
  ) {
    try {
      const response =
        await openRouterRequest(
          messages,
          {
            ...options,
            stream: false
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        console.error(
          "OpenRouter error:",
          data
        );

        const error =
          new Error(
            data?.error?.message ||
            "خطا در اتصال به هوش مصنوعی"
          );

        error.status =
          response.status;

        throw error;
      }

      const answer =
        data.choices?.[0]?.message?.content;

      if (!answer) {
        throw new Error(
          "پاسخی از هوش مصنوعی دریافت نشد."
        );
      }

      return answer;

    } catch (error) {
      lastError = error;

      console.error(
        `AI attempt ${attempt + 1} failed:`,
        error.message
      );

      if (
        error.status === 401 ||
        error.status === 403 ||
        error.status === 400
      ) {
        break;
      }

      if (attempt < maxRetries) {
        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              700 * (attempt + 1)
            )
        );
      }
    }
  }

  throw lastError ||
    new Error(
      "خطا در دریافت پاسخ از Lina"
    );
}

// ============================================================
// CHAT
// ============================================================

app.post(
  "/api/chat",
  async (req, res) => {
    try {
      const userMessage =
        req.body.message;

      if (
        !userMessage ||
        typeof userMessage !== "string" ||
        !userMessage.trim()
      ) {
        return res.status(400).json({
          success: false,
          error: "پیام خالی است"
        });
      }

      let history =
        getChatHistory(req.body);

      history =
        removeCurrentUserFromHistory(
          history,
          userMessage
        );

      const model =
        selectModel(
          req.body.task || "chat",
          req.body.model
        );

      const messages = [
        {
          role: "system",
          content:
            linaSystemPrompt
        },

        ...history,

        {
          role: "user",
          content:
            userMessage.trim()
        }
      ];

      const answer =
        await askLina(
          messages,
          {
            model
          }
        );

      res.json({
        success: true,
        reply: answer,
        model
      });

    } catch (error) {
      console.error(
        "Chat server error:",
        error
      );

      res.status(
        error.status >= 400 &&
        error.status < 500
          ? error.status
          : 500
      ).json({
        success: false,
        error:
          error.message ||
          "خطا در سرور لینا"
      });
    }
  }
);

// ============================================================
// STREAMING CHAT
// ============================================================

app.post(
  "/api/chat/stream",
  async (req, res) => {
    let reader = null;

    try {
      const userMessage =
        req.body.message;

      if (
        !userMessage ||
        typeof userMessage !== "string" ||
        !userMessage.trim()
      ) {
        return res.status(400).json({
          success: false,
          error: "پیام خالی است"
        });
      }

      let history =
        getChatHistory(req.body);

      history =
        removeCurrentUserFromHistory(
          history,
          userMessage
        );

      const model =
        selectModel(
          req.body.task || "chat",
          req.body.model
        );

      const messages = [
        {
          role: "system",
          content:
            linaSystemPrompt
        },

        ...history,

        {
          role: "user",
          content:
            userMessage.trim()
        }
      ];

      const response =
        await openRouterRequest(
          messages,
          {
            model,
            stream: true
          }
        );

      if (!response.ok) {
        let data = {};

        try {
          data =
            await response.json();
        } catch (_) {}

        console.error(
          "OpenRouter streaming error:",
          data
        );

        return res.status(
          response.status
        ).json({
          success: false,
          error:
            data?.error?.message ||
            "خطا در اتصال به هوش مصنوعی"
        });
      }

      if (!response.body) {
        throw new Error(
          "پاسخ زنده از هوش مصنوعی دریافت نشد."
        );
      }

      res.status(200);

      res.setHeader(
        "Content-Type",
        "text/event-stream; charset=utf-8"
      );

      res.setHeader(
        "Cache-Control",
        "no-cache, no-transform"
      );

      res.setHeader(
        "Connection",
        "keep-alive"
      );

      res.setHeader(
        "X-Accel-Buffering",
        "no"
      );

      if (res.flushHeaders) {
        res.flushHeaders();
      }

      reader =
        response.body.getReader();

      const decoder =
        new TextDecoder("utf-8");

      let buffer = "";

      while (true) {
        const {
          value,
          done
        } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(
          value,
          {
            stream: true
          }
        );

        const lines =
          buffer.split(/\r?\n/);

        buffer =
          lines.pop() || "";

        for (
          const rawLine of lines
        ) {
          const line =
            rawLine.trim();

          if (!line) {
            continue;
          }

          if (
            !line.startsWith("data:")
          ) {
            continue;
          }

          const data =
            line
              .slice(5)
              .trim();

          if (
            data === "[DONE]"
          ) {
            continue;
          }

          try {
            const parsed =
              JSON.parse(data);

            const content =
              parsed
                ?.choices?.[0]
                ?.delta
                ?.content;

            if (
              typeof content ===
              "string" &&
              content.length
            ) {
              res.write(
                `data: ${JSON.stringify({
                  content
                })}\n\n`
              );
            }

          } catch (parseError) {
            console.error(
              "Stream parse error:",
              parseError.message
            );
          }
        }
      }

      if (
        buffer.trim() &&
        buffer.trim().startsWith("data:")
      ) {
        const data =
          buffer
            .trim()
            .slice(5)
            .trim();

        if (
          data &&
          data !== "[DONE]"
        ) {
          try {
            const parsed =
              JSON.parse(data);

            const content =
              parsed
                ?.choices?.[0]
                ?.delta
                ?.content;

            if (
              typeof content ===
              "string" &&
              content.length
            ) {
              res.write(
                `data: ${JSON.stringify({
                  content
                })}\n\n`
              );
            }

          } catch (_) {}
        }
      }

      if (!res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({
            done: true,
            model
          })}\n\n`
        );

        res.end();
      }

    } catch (error) {
      console.error(
        "Streaming chat error:",
        error
      );

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error:
            error.message ||
            "خطا در پاسخ زنده Lina"
        });
      }

      if (!res.writableEnded) {
        res.write(
          `data: ${JSON.stringify({
            error:
              error.message ||
              "پاسخ نیمه‌کاره قطع شد."
          })}\n\n`
        );

        res.end();
      }

    } finally {
      if (reader) {
        try {
          await reader.cancel();
        } catch (_) {}
      }
    }
  }
);

// ============================================================
// TRANSLATE
// ============================================================

app.post(
  "/api/translate",
  async (req, res) => {
    try {
      const text =
        req.body.text;

      const source =
        req.body.source || "auto";

      const target =
        req.body.target || "fa";

      if (
        !text ||
        typeof text !== "string" ||
        !text.trim()
      ) {
        return res.status(400).json({
          success: false,
          error:
            "متن برای ترجمه خالی است"
        });
      }

      const sourceLanguage =
        source === "auto"
          ? "the detected original language"
          : source;

      const targetLanguage =
        target;

      const prompt = `
You are Lina Translator.

Translate the user's text accurately from ${sourceLanguage} to ${targetLanguage}.

Rules:
- Translate the COMPLETE text.
- Never summarize.
- Never remove information.
- Preserve the original meaning.
- Preserve paragraphs and structure.
- Preserve lists when possible.
- Preserve code and special formatting when possible.
- Do not add explanations.
- Return ONLY the translation.

TEXT:
${text}
`;

      const result =
        await askLina(
          [
            {
              role: "system",
              content: `
You are Lina's professional translation engine.

Translate accurately and naturally.
Never summarize.
Never explain.
Return only the translated text.
`
            },

            {
              role: "user",
              content: prompt
            }
          ],
          {
            model: selectModel(
              "translate",
              req.body.model
            )
          }
        );

      res.json({
        success: true,
        translation: result
      });

    } catch (error) {
      console.error(
        "Translate error:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message ||
          "خطا در ترجمه"
      });
    }
  }
);

// ============================================================
// REWRITE
// ============================================================

app.post(
  "/api/rewrite",
  async (req, res) => {
    try {
      const text =
        req.body.text;

      if (
        !text ||
        typeof text !== "string" ||
        !text.trim()
      ) {
        return res.status(400).json({
          success: false,
          error:
            "متن برای بازنویسی خالی است"
        });
      }

      const style =
        req.body.style ||
        "professional";

      const prompt = `
You are Lina Rewrite.

Rewrite the user's text in the SAME LANGUAGE as the original text.

Requested style:
${style}

Rules:
- Always preserve the original language.
- NEVER translate the text.
- NEVER summarize.
- NEVER remove important information.
- Preserve the original meaning.
- Improve grammar, vocabulary and sentence structure.
- Make the text clear and natural.
- Apply the requested style.
- Return ONLY the rewritten text.

IMPORTANT:
- Persian → Persian
- English → English
- Arabic → Arabic
- Urdu → Urdu

TEXT:
${text}
`;

      const result =
        await askLina(
          [
            {
              role: "system",
              content: `
You are Lina Rewrite.

Your job is rewriting only.

Never translate.
Never summarize.
Always preserve the original language and meaning.
Return only the rewritten text.
`
            },

            {
              role: "user",
              content: prompt
            }
          ],
          {
            model: selectModel(
              "rewrite",
              req.body.model
            )
          }
        );

      res.json({
        success: true,
        result
      });

    } catch (error) {
      console.error(
        "Rewrite error:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message ||
          "خطا در بازنویسی"
      });
    }
  }
);

// ============================================================
// CODE
// ============================================================

app.post(
  "/api/code",
  async (req, res) => {
    try {
      const request =
        req.body.message ||
        req.body.request;

      if (
        !request ||
        typeof request !== "string" ||
        !request.trim()
      ) {
        return res.status(400).json({
          success: false,
          error:
            "درخواست کدنویسی خالی است"
        });
      }

      const prompt = `
You are Lina Code, an expert software developer.

The user wants help with this programming request:

${request}

Rules:
- Understand exactly what the user wants.
- Provide complete useful code.
- Use the appropriate programming language.
- Make the code clean and ready to use.
- Do not intentionally leave important parts unfinished.
- If there are multiple files, clearly separate them.
- Explain important parts briefly when necessary.
- If fixing code, identify the problem and provide the corrected version.
`;

      const result =
        await askLina(
          [
            {
              role: "system",
              content: `
You are Lina Code.

You are an expert programming assistant.
Give accurate, practical and ready-to-use code.
`
            },

            {
              role: "user",
              content: prompt
            }
          ],
          {
            model: selectModel(
              "code",
              req.body.model
            )
          }
        );

      res.json({
        success: true,
        reply: result
      });

    } catch (error) {
      console.error(
        "Code error:",
        error
      );

      res.status(500).json({
        success: false,
        error:
          error.message ||
          "خطا در تولید کد"
      });
    }
  }
);

// ============================================================
// API STATUS
// ============================================================
// ============================================================
// REGISTER — ONLY REGISTRATION
// ============================================================

const USERS_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(USERS_DIR, "users.json");

if (!fs.existsSync(USERS_DIR)) {
  fs.mkdirSync(USERS_DIR, {
    recursive: true
  });
}

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(
    USERS_FILE,
    "[]",
    "utf8"
  );
}

function readUsers() {
  try {
    return JSON.parse(
      fs.readFileSync(
        USERS_FILE,
        "utf8"
      )
    );
  } catch (error) {
    return [];
  }
}

function saveUsers(users) {
  fs.writeFileSync(
    USERS_FILE,
    JSON.stringify(
      users,
      null,
      2
    ),
    "utf8"
  );
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt =
      crypto.randomBytes(16).toString("hex");

    crypto.scrypt(
      password,
      salt,
      64,
      (error, key) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(
          salt +
          ":" +
          key.toString("hex")
        );
      }
    );
  });
}

app.post(
  "/api/register",
  async (req, res) => {
    try {
      const name =
        typeof req.body.name === "string"
          ? req.body.name.trim()
          : "";

      const email =
        typeof req.body.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "";

      const password =
        typeof req.body.password === "string"
          ? req.body.password
          : "";

      if (!name) {
        return res.status(400).json({
          success: false,
          error: "نام را وارد کنید."
        });
      }

      if (!email) {
        return res.status(400).json({
          success: false,
          error: "ایمیل را وارد کنید."
        });
      }

      if (!email.includes("@")) {
        return res.status(400).json({
          success: false,
          error: "ایمیل معتبر نیست."
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          error:
            "رمز عبور باید حداقل ۶ کاراکتر باشد."
        });
      }

      const users = readUsers();

      const exists = users.some(
        (user) =>
          user.email === email
      );

      if (exists) {
        return res.status(409).json({
          success: false,
          error:
            "این ایمیل قبلاً ثبت‌نام کرده است."
        });
      }

      const passwordHash =
        await hashPassword(password);

      const user = {
        id: crypto.randomUUID(),
        name,
        email,
        passwordHash,
        createdAt:
          new Date().toISOString()
      };

      users.push(user);

      saveUsers(users);
const analytics = readAnalytics();
const today = getToday();

if (!analytics.dailyRegistrations) {
  analytics.dailyRegistrations = {};
}

analytics.dailyRegistrations[today] =
  (analytics.dailyRegistrations[today] || 0) + 1;

saveAnalytics(analytics);
      return res.json({
        success: true,
        message:
          "ثبت‌نام با موفقیت انجام شد.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });

    } catch (error) {
      console.error(
        "Register error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "خطا در ثبت‌نام. دوباره تلاش کنید."
      });
    }
  }
);
app.get(
  "/api/status",
  (req, res) => {
    res.json({
      success: true,
      name: "Lina",
      version: "2.0",
      ai: !!process.env.OPENROUTER_API_KEY,
      model: DEFAULT_MODEL,
      endpoints: {
        chat: true,
        streamingChat: true,
        translate: true,
        rewrite: true,
        code: true
      }
    });
  }
);
// ============================================================
// PRIVATE ANALYTICS DASHBOARD
// ============================================================

app.get("/admin/analytics", (req, res) => {
  const secret = process.env.LINA_ANALYTICS_SECRET;

  if (!secret || req.query.key !== secret) {
    return res.status(403).send("دسترسی غیرمجاز");
  }

  const analytics = readAnalytics();
  const users = readUsers();

  const totalVisitors =
    Object.keys(analytics.visitors || {}).length;

  const totalRegistrations =
    users.length;

  const today = getToday();

  const todayVisits =
    analytics.dailyVisits?.[today] || 0;

  const todayRegistrations =
    analytics.dailyRegistrations?.[today] || 0;

  res.send(`<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>Lina Analytics</title>

  <style>
    body {
      font-family: Arial, sans-serif;
      background: #f5f3ff;
      color: #171522;
      padding: 30px;
    }

    .wrap {
      max-width: 900px;
      margin: auto;
    }

    h1 {
      color: #715cf7;
    }

    .grid {
      display: grid;
      grid-template-columns:
        repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .card {
      background: #fff;
      border-radius: 18px;
      padding: 22px;
      box-shadow:
        0 8px 30px rgba(0,0,0,.08);
    }

    .num {
      font-size: 34px;
      font-weight: 700;
      margin-top: 8px;
    }

    .muted {
      color: #777;
    }
  </style>
</head>

<body>

  <div class="wrap">

    <h1>📊 Lina Analytics</h1>

    <p class="muted">
      آمار کلی استفاده از Lina
    </p>

    <div class="grid">

      <div class="card">
        <div class="muted">
          کل بازدیدکنندگان
        </div>

        <div class="num">
          ${totalVisitors}
        </div>
      </div>

      <div class="card">
        <div class="muted">
          کل ثبت‌نام‌ها
        </div>

        <div class="num">
          ${totalRegistrations}
        </div>
      </div>

      <div class="card">
        <div class="muted">
          بازدید امروز
        </div>

        <div class="num">
          ${todayVisits}
        </div>
      </div>

      <div class="card">
        <div class="muted">
          ثبت‌نام امروز
        </div>

        <div class="num">
          ${todayRegistrations}
        </div>
      </div>

    </div>

  </div>

</body>
</html>`);
});
// ============================================================
// 404 API
// ============================================================

app.use(
  "/api",
  (req, res) => {
    res.status(404).json({
      success: false,
      error:
        "مسیر موردنظر پیدا نشد."
    });
  }
);

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use(
  (error, req, res, next) => {
    console.error(
      "Global server error:",
      error
    );

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      success: false,
      error:
        "خطای داخلی سرور Lina"
    });
  }
);

// ============================================================
// START SERVER
// ============================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "===================================="
    );

    console.log(
      "🚀 Lina Backend V2 is running"
    );

    console.log(
      `📡 Port: ${PORT}`
    );

    console.log(
      "🤖 OpenRouter AI connected"
    );

    console.log(
      "⚡ Streaming chat endpoint ready"
    );

    console.log(
      "💬 Chat endpoint ready"
    );

    console.log(
      "🌐 Translation endpoint ready"
    );

    console.log(
      "✍️ Rewrite endpoint ready"
    );

    console.log(
      "💻 Code endpoint ready"
    );

    console.log(
      "🔄 Automatic retry enabled"
    );

    console.log(
      "===================================="
    );
  }
);
