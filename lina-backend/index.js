require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");

const {
  createUser,
  findUserByEmail,
  findUserById,
  authenticateUser
} = require("./users");

const app = express();

// ------------------------------------------------------------
// MIDDLEWARE
// ------------------------------------------------------------

app.use(cors());

app.use(
  express.json({
    limit: "50mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "50mb"
  })
);

// ------------------------------------------------------------
// CONFIG
// ------------------------------------------------------------

const PORT = process.env.PORT || 3000;

const CHAT_MODEL = "deepseek/deepseek-v4-flash";

const TRANSLATION_MODEL = "google/gemini-2.5-flash";

const AUTH_TOKEN_TTL_SECONDS =
  7 * 24 * 60 * 60;

// ------------------------------------------------------------
// STATIC FILES
// ------------------------------------------------------------

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

// ------------------------------------------------------------
// HEALTH
// ------------------------------------------------------------

app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    service: "Lina Backend",
    translationModel: TRANSLATION_MODEL
  });
});

// ------------------------------------------------------------
// AUTH TOKEN HELPERS
// ------------------------------------------------------------

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  return Buffer.from(
    value,
    "base64url"
  ).toString("utf8");
}

function createAuthToken(userId) {
  const secret =
    process.env.LINA_AUTH_SECRET;

  if (!secret) {
    throw new Error(
      "LINA_AUTH_SECRET is missing"
    );
  }

  const now =
    Math.floor(Date.now() / 1000);

  const header = {
    alg: "HS256",
    typ: "LINA"
  };

  const payload = {
    sub: userId,
    iat: now,
    exp:
      now + AUTH_TOKEN_TTL_SECONDS
  };

  const encodedHeader =
    base64UrlEncode(
      JSON.stringify(header)
    );

  const encodedPayload =
    base64UrlEncode(
      JSON.stringify(payload)
    );

  const data =
    `${encodedHeader}.${encodedPayload}`;

  const signature =
    crypto
      .createHmac("sha256", secret)
      .update(data)
      .digest("base64url");

  return `${data}.${signature}`;
}

function verifyAuthToken(token) {
  try {
    const secret =
      process.env.LINA_AUTH_SECRET;

    if (!secret) {
      return null;
    }

    const parts =
      String(token || "").split(".");

    if (parts.length !== 3) {
      return null;
    }

    const encodedHeader =
      parts[0];

    const encodedPayload =
      parts[1];

    const receivedSignature =
      parts[2];

    const data =
      `${encodedHeader}.${encodedPayload}`;

    const expectedSignature =
      crypto
        .createHmac("sha256", secret)
        .update(data)
        .digest("base64url");

    const receivedBuffer =
      Buffer.from(
        receivedSignature
      );

    const expectedBuffer =
      Buffer.from(
        expectedSignature
      );

    if (
      receivedBuffer.length !==
      expectedBuffer.length
    ) {
      return null;
    }

    if (
      !crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      )
    ) {
      return null;
    }

    const payload =
      JSON.parse(
        base64UrlDecode(
          encodedPayload
        )
      );

    if (!payload.sub) {
      return null;
    }

    if (!payload.exp) {
      return null;
    }

    const now =
      Math.floor(Date.now() / 1000);

    if (payload.exp < now) {
      return null;
    }

    const user =
      findUserById(payload.sub);

    if (!user) {
      return null;
    }

    return user;
  } catch (error) {
    return null;
  }
}

function getBearerToken(req) {
  const authorization =
    req.headers.authorization || "";

  if (
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return "";
  }

  return authorization
    .slice(7)
    .trim();
}

function requireAuth(req, res, next) {
  const token =
    getBearerToken(req);

  const user =
    verifyAuthToken(token);

  if (!user) {
    return res.status(401).json({
      success: false,
      error:
        "ورود شما معتبر نیست یا منقضی شده است"
    });
  }

  req.user = user;

  next();
}

// ------------------------------------------------------------
// OPENROUTER REQUEST
// ------------------------------------------------------------

async function openRouterRequest({
  model,
  messages,
  temperature = 0,
  maxTokens = 8000,
  timeoutMs = 120000
}) {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is missing"
    );
  }

  const controller =
    new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response =
      await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${process.env.OPENROUTER_API_KEY}`,

            "Content-Type":
              "application/json",

            "HTTP-Referer":
              "http://localhost:3000",

            "X-Title":
              "Lina AI"
          },

          body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: maxTokens
          }),

          signal: controller.signal
        }
      );

    const rawText =
      await response.text();

    let data;

    try {
      data =
        JSON.parse(rawText);
    } catch {
      throw new Error(
        `OpenRouter returned invalid JSON (${response.status}): ${rawText.slice(
          0,
          500
        )}`
      );
    }

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.error ||
        `OpenRouter HTTP ${response.status}`;

      throw new Error(message);
    }

    const content =
      data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(
        "OpenRouter returned an empty response"
      );
    }

    return String(content).trim();
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------------------------------------------
// AUTH - REGISTER
// ------------------------------------------------------------

app.post(
  "/api/auth/register",
  async (req, res) => {
    try {
      const name =
        typeof req.body?.name ===
        "string"
          ? req.body.name.trim()
          : "";

      const email =
        typeof req.body?.email ===
        "string"
          ? req.body.email
              .trim()
              .toLowerCase()
          : "";

      const password =
        typeof req.body?.password ===
        "string"
          ? req.body.password
          : "";

      if (!name) {
        return res.status(400).json({
          success: false,
          error:
            "نام الزامی است"
        });
      }

      if (
        !email ||
        !email.includes("@")
      ) {
        return res.status(400).json({
          success: false,
          error:
            "ایمیل معتبر وارد کنید"
        });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          error:
            "رمز عبور باید حداقل ۸ کاراکتر باشد"
        });
      }

      const existingUser =
        findUserByEmail(email);

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error:
            "این ایمیل قبلاً ثبت شده است"
        });
      }

      const user =
        await createUser({
          name,
          email,
          password
        });

      const token =
        createAuthToken(user.id);

      return res.status(201).json({
        success: true,
        message:
          "ثبت‌نام با موفقیت انجام شد",
        token,
        user
      });
    } catch (error) {
      console.error(
        "[REGISTER ERROR]",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "ثبت‌نام انجام نشد"
      });
    }
  }
);

// ------------------------------------------------------------
// AUTH - LOGIN
// ------------------------------------------------------------

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      const email =
        typeof req.body?.email ===
        "string"
          ? req.body.email
              .trim()
              .toLowerCase()
          : "";

      const password =
        typeof req.body?.password ===
        "string"
          ? req.body.password
          : "";

      if (!email) {
        return res.status(400).json({
          success: false,
          error:
            "ایمیل الزامی است"
        });
      }

      if (!password) {
        return res.status(400).json({
          success: false,
          error:
            "رمز عبور الزامی است"
        });
      }

      const user =
        await authenticateUser({
          email,
          password
        });

      if (!user) {
        return res.status(401).json({
          success: false,
          error:
            "ایمیل یا رمز عبور اشتباه است"
        });
      }

      const token =
        createAuthToken(user.id);

      return res.json({
        success: true,
        message:
          "ورود با موفقیت انجام شد",
        token,
        user
      });
    } catch (error) {
      console.error(
        "[LOGIN ERROR]",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "ورود انجام نشد"
      });
    }
  }
);

// ------------------------------------------------------------
// AUTH - CURRENT USER
// ------------------------------------------------------------

app.get(
  "/api/auth/me",
  requireAuth,
  (req, res) => {
    return res.json({
      success: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        createdAt:
          req.user.createdAt
      }
    });
  }
);

// ------------------------------------------------------------
// TEXT HELPERS
// ------------------------------------------------------------

function normalizeText(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function removeMarkdown(text) {
  return String(text || "")
    .replace(
      /^```[a-zA-Z0-9_-]*\s*/g,
      ""
    )
    .replace(/```$/g, "")
    .trim();
}

function countUrduChars(text) {
  const matches =
    String(text || "").match(
      /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/g
    );

  return matches
    ? matches.length
    : 0;
}

function countPersianChars(text) {
  const matches =
    String(text || "").match(
      /[آ-ی]/g
    );

  return matches
    ? matches.length
    : 0;
}

function countLatinChars(text) {
  const matches =
    String(text || "").match(
      /[A-Za-z]/g
    );

  return matches
    ? matches.length
    : 0;
}

// ------------------------------------------------------------
// LANGUAGE DETECTION
// ------------------------------------------------------------

function detectLanguage(text) {
  const value =
    String(text || "");

  const urduSpecificChars = [
    "ٹ",
    "ڈ",
    "ڑ",
    "ں",
    "ھ",
    "ے",
    "ؤ",
    "ئ"
  ];

  let urduScore = 0;

  for (
    const char of
    urduSpecificChars
  ) {
    urduScore +=
      value.split(char).length -
      1;
  }

  const arabicSpecificChars = [
    "ة",
    "ي",
    "ى",
    "ؤ",
    "ئ"
  ];

  let arabicScore = 0;

  for (
    const char of
    arabicSpecificChars
  ) {
    arabicScore +=
      value.split(char).length -
      1;
  }

  const persianScore =
    countPersianChars(value);

  if (urduScore >= 3) {
    return "ur";
  }

  if (
    arabicScore >= 5 &&
    persianScore < arabicScore
  ) {
    return "ar";
  }

  if (persianScore >= 5) {
    return "fa";
  }

  if (
    countLatinChars(value) >
    countPersianChars(value)
  ) {
    return "en";
  }

  if (
    countUrduChars(value) > 20
  ) {
    return "ur";
  }

  return "auto";
}

// ------------------------------------------------------------
// LANGUAGE NAMES
// ------------------------------------------------------------

const languageNames = {
  auto: "Automatic",
  fa: "Persian",
  ur: "Urdu",
  ar: "Arabic",
  en: "English",
  de: "German",
  fr: "French",
  es: "Spanish",
  tr: "Turkish",
  ru: "Russian",
  zh: "Chinese",
  ja: "Japanese",
  ko: "Korean",
  hi: "Hindi",
  it: "Italian",
  pt: "Portuguese"
};

// ------------------------------------------------------------
// LONG TEXT SPLITTER
// ------------------------------------------------------------

function splitLongText(
  text,
  maxChars = 2800
) {
  const value =
    String(text || "").trim();

  if (!value) {
    return [];
  }

  if (
    value.length <= maxChars
  ) {
    return [value];
  }

  const paragraphs =
    value.split(/\n\s*\n/);

  const chunks = [];

  let current = "";

  for (
    const paragraph of
    paragraphs
  ) {
    const part =
      paragraph.trim();

    if (!part) {
      continue;
    }

    if (
      (
        current +
        "\n\n" +
        part
      ).length <= maxChars
    ) {
      current = current
        ? current +
          "\n\n" +
          part
        : part;

      continue;
    }

    if (current) {
      chunks.push(current);
      current = "";
    }

    if (
      part.length <= maxChars
    ) {
      current = part;
      continue;
    }

    const sentences =
      part.split(
        /(?<=[.!؟?۔])\s+/
      );

    for (
      const sentence of
      sentences
    ) {
      if (!sentence.trim()) {
        continue;
      }

      if (
        (
          current +
          " " +
          sentence
        ).trim().length <=
        maxChars
      ) {
        current = (
          current +
          " " +
          sentence
        ).trim();
      } else {
        if (current) {
          chunks.push(current);
        }

        if (
          sentence.length <=
          maxChars
        ) {
          current =
            sentence.trim();
        } else {
          for (
            let i = 0;
            i < sentence.length;
            i += maxChars
          ) {
            chunks.push(
              sentence
                .slice(
                  i,
                  i + maxChars
                )
                .trim()
            );
          }

          current = "";
        }
      }
    }
  }

  if (current.trim()) {
    chunks.push(
      current.trim()
    );
  }

  return chunks.filter(Boolean);
}

// ------------------------------------------------------------
// TRANSLATION PROMPT
// ------------------------------------------------------------

function buildTranslationMessages({
  text,
  sourceLanguage,
  targetLanguage
}) {
  const sourceName =
    languageNames[
      sourceLanguage
    ] || sourceLanguage;

  const targetName =
    languageNames[
      targetLanguage
    ] || targetLanguage;

  let specialInstruction = "";

  if (
    sourceLanguage === "ur" &&
    targetLanguage === "fa"
  ) {
    specialInstruction = `
این متن اردو است و مقصد فارسی است.

قوانین بسیار مهم:
1. متن اردو را عیناً تکرار نکن.
2. متن را خلاصه نکن.
3. هیچ بخشی را حذف نکن.
4. معنی کامل جمله‌ها را به فارسی روان و دقیق منتقل کن.
5. نام اشخاص، آیات، احادیث و عبارات عربی را با دقت حفظ کن.
6. اگر داخل متن عبارت فارسی یا عربی وجود دارد، آن قسمت را بی‌دلیل به زبان دیگری تبدیل نکن.
7. شماره صفحات، شماره آیات، نشانه‌ها و ساختار پاراگراف‌ها را تا حد امکان حفظ کن.
8. فقط ترجمه فارسی را خروجی بده.
9. هیچ توضیحی درباره ترجمه نده.
10. قبل از پاسخ مطمئن شو خروجی واقعاً فارسی است و کپی متن اردو نیست.
`;
  } else {
    specialInstruction = `
متن را کامل و دقیق از ${sourceName} به ${targetName} ترجمه کن.
هیچ بخشی را حذف، خلاصه یا اضافه نکن.
فقط ترجمه نهایی را ارائه بده.
`;
  }

  return [
    {
      role: "system",
      content: `
You are Lina, a professional multilingual translator.

${specialInstruction}

IMPORTANT:
The user's source text may be very long and may contain multiple languages.
Translate the requested source language into the requested target language.
Preserve paragraphs and meaningful formatting.
Never answer with an explanation.
Never repeat the source text instead of translating it.
`
    },
    {
      role: "user",
      content: text
    }
  ];
}

// ------------------------------------------------------------
// TRANSLATE ONE CHUNK
// ------------------------------------------------------------

async function translateChunk({
  text,
  sourceLanguage,
  targetLanguage
}) {
  const messages =
    buildTranslationMessages({
      text,
      sourceLanguage,
      targetLanguage
    });

  console.log(
    `[TRANSLATE] ${sourceLanguage} -> ${targetLanguage} | ${text.length} chars`
  );

  let result =
    await openRouterRequest({
      model: TRANSLATION_MODEL,
      messages,
      temperature: 0,
      maxTokens: Math.min(
        12000,
        Math.max(
          3000,
          text.length * 3
        )
      ),
      timeoutMs: 180000
    });

  result =
    removeMarkdown(result);

  const sourceNormalized =
    normalizeText(text);

  const resultNormalized =
    normalizeText(result);

  const sourceUrduChars =
    countUrduChars(text);

  const resultUrduChars =
    countUrduChars(result);

  const resultPersianChars =
    countPersianChars(result);

  const looksSame =
    resultNormalized ===
    sourceNormalized;

  const looksLikeUrduEcho =
    sourceUrduChars > 30 &&
    resultUrduChars >
      resultPersianChars &&
    result.length >=
      text.length * 0.65;

  if (
    looksSame ||
    (
      sourceLanguage === "ur" &&
      targetLanguage === "fa" &&
      looksLikeUrduEcho
    )
  ) {
    console.log(
      "[TRANSLATE] First result looked like source. Retrying..."
    );

    const retryMessages = [
      {
        role: "system",
        content: `
You are NOT allowed to return the original text.

You are translating Urdu into Persian.

MANDATORY:
- Read the Urdu source carefully.
- Translate every sentence into Persian.
- Do NOT copy the Urdu sentences.
- Do NOT summarize.
- Do NOT explain.
- Output ONLY the Persian translation.
- If the source contains Arabic quotations, preserve them when appropriate.
- Keep paragraph structure and page markers.

The previous attempt failed because it returned the source.
This attempt MUST produce an actual Persian translation.
`
      },
      {
        role: "user",
        content: text
      }
    ];

    result =
      await openRouterRequest({
        model: TRANSLATION_MODEL,
        messages:
          retryMessages,
        temperature: 0,
        maxTokens: Math.min(
          14000,
          Math.max(
            4000,
            text.length * 4
          )
        ),
        timeoutMs: 180000
      });

    result =
      removeMarkdown(result);
  }

  const finalSame =
    normalizeText(result) ===
    normalizeText(text);

  const finalUrdu =
    countUrduChars(result);

  const finalPersian =
    countPersianChars(result);

  const finalUrduEcho =
    sourceLanguage === "ur" &&
    targetLanguage === "fa" &&
    finalUrdu > finalPersian &&
    result.length >=
      text.length * 0.65;

  if (
    finalSame ||
    finalUrduEcho
  ) {
    console.log(
      "[TRANSLATE] Second result still looked like source. Using fallback model..."
    );

    const fallbackMessages = [
      {
        role: "system",
        content: `
Translate the following Urdu text into Persian.

This is a translation task, NOT a conversation.

Rules:
- Output ONLY Persian translation.
- Translate every sentence.
- Do not copy the Urdu source.
- Do not summarize.
- Do not omit any content.
- Preserve names, religious quotations, Arabic expressions, page numbers and paragraph breaks.
- Produce natural, accurate Persian.
`
      },
      {
        role: "user",
        content: text
      }
    ];

    result =
      await openRouterRequest({
        model: "qwen/qwen3-32b",
        messages:
          fallbackMessages,
        temperature: 0,
        maxTokens: Math.min(
          14000,
          Math.max(
            4000,
            text.length * 4
          )
        ),
        timeoutMs: 180000
      });

    result =
      removeMarkdown(result);
  }

  return result;
}

// ------------------------------------------------------------
// TRANSLATE API
// ------------------------------------------------------------

app.post(
  "/api/translate",
  async (req, res) => {
    try {
      const text =
        typeof req.body?.text ===
        "string"
          ? req.body.text.trim()
          : typeof req.body?.message ===
            "string"
          ? req.body.message.trim()
          : "";

      if (!text) {
        return res.status(400).json({
          success: false,
          error:
            "متن ترجمه خالی است"
        });
      }

      let sourceLanguage =
        typeof req.body?.sourceLanguage ===
        "string"
          ? req.body.sourceLanguage
              .trim()
              .toLowerCase()
          : "auto";

      let targetLanguage =
        typeof req.body?.targetLanguage ===
        "string"
          ? req.body.targetLanguage
              .trim()
              .toLowerCase()
          : "fa";

      if (
        !languageNames[
          sourceLanguage
        ]
      ) {
        sourceLanguage = "auto";
      }

      if (
        !languageNames[
          targetLanguage
        ]
      ) {
        targetLanguage = "fa";
      }

      if (
        sourceLanguage === "auto"
      ) {
        const detected =
          detectLanguage(text);

        if (
          detected !== "auto"
        ) {
          sourceLanguage =
            detected;
        }
      }

      const chunks =
        splitLongText(
          text,
          2800
        );

      console.log(
        `[TRANSLATE] ${sourceLanguage} -> ${targetLanguage}`
      );

      console.log(
        `[TRANSLATE] ${chunks.length} chunk(s)`
      );

      const translatedChunks =
        [];

      for (
        let i = 0;
        i < chunks.length;
        i++
      ) {
        console.log(
          `[TRANSLATE] Processing chunk ${i + 1}/${chunks.length}`
        );

        const translated =
          await translateChunk({
            text: chunks[i],
            sourceLanguage,
            targetLanguage
          });

        translatedChunks.push(
          translated
        );

        if (
          i <
          chunks.length - 1
        ) {
          await new Promise(
            resolve =>
              setTimeout(
                resolve,
                250
              )
          );
        }
      }

      const translation =
        translatedChunks.join(
          "\n\n"
        );

      console.log(
        "[TRANSLATE] Completed successfully"
      );

      return res.json({
        success: true,
        translation,
        sourceLanguage,
        targetLanguage,
        chunks:
          chunks.length
      });
    } catch (error) {
      console.error(
        "[TRANSLATE ERROR]",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error?.message ||
          "Translation failed"
      });
    }
  }
);

// ------------------------------------------------------------
// CHAT
// ------------------------------------------------------------

app.post(
  "/api/chat",
  async (req, res) => {
    try {
      const message =
        typeof req.body?.message ===
        "string"
          ? req.body.message.trim()
          : "";

      const incomingMessages =
        Array.isArray(
          req.body?.messages
        )
          ? req.body.messages
          : [];

      if (
        !message &&
        incomingMessages.length === 0
      ) {
        return res.status(400).json({
          success: false,
          error:
            "پیام خالی است"
        });
      }

      let messages = [];

      if (
        incomingMessages.length > 0
      ) {
        messages =
          incomingMessages
            .filter(
              item =>
                item &&
                (
                  item.role ===
                    "user" ||
                  item.role ===
                    "assistant"
                ) &&
                typeof item.content ===
                  "string"
            )
            .map(item => ({
              role: item.role,
              content:
                item.content
            }));
      }

      if (
        messages.length === 0 &&
        message
      ) {
        messages = [
          {
            role: "user",
            content: message
          }
        ];
      }

      const systemMessage = {
        role: "system",
        content: `
تو Lina هستی؛ یک دستیار هوش مصنوعی فارسی‌زبان.
پاسخ‌ها را طبیعی، دقیق، مفید و دوستانه بده.
اگر کاربر فارسی صحبت کرد، فارسی پاسخ بده.
اگر کاربر زبان دیگری استفاده کرد، می‌توانی همان زبان را هم درک و پاسخ‌دهی کنی.
`
      };

      const answer =
        await openRouterRequest({
          model: CHAT_MODEL,
          messages: [
            systemMessage,
            ...messages
          ],
          temperature: 0.4,
          maxTokens: 5000,
          timeoutMs: 120000
        });

      return res.json({
        success: true,
        reply: answer,
        message: answer
      });
    } catch (error) {
      console.error(
        "[CHAT ERROR]",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error?.message ||
          "Chat failed"
      });
    }
  }
);

// ------------------------------------------------------------
// REWRITE
// ------------------------------------------------------------

app.post(
  "/api/rewrite",
  async (req, res) => {
    try {
      const text =
        typeof req.body?.text ===
        "string"
          ? req.body.text.trim()
          : "";

      if (!text) {
        return res.status(400).json({
          success: false,
          error:
            "متن خالی است"
        });
      }

      const result =
        await openRouterRequest({
          model: CHAT_MODEL,
          messages: [
            {
              role: "system",
              content: `
You are Lina's professional rewriting assistant.

Rewrite the user's text clearly and naturally.

Rules:
- Preserve the original meaning.
- Do not summarize.
- Do not add unrelated information.
- Improve grammar, clarity and readability.
- Return only the rewritten text.
`
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.3,
          maxTokens: Math.min(
            10000,
            Math.max(
              3000,
              text.length * 3
            )
          ),
          timeoutMs: 180000
        });

      return res.json({
        success: true,
        result
      });
    } catch (error) {
      console.error(
        "[REWRITE ERROR]",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error?.message ||
          "Rewrite failed"
      });
    }
  }
);

// ------------------------------------------------------------
// CODE
// ------------------------------------------------------------

app.post(
  "/api/code",
  async (req, res) => {
    try {
      const text =
        typeof req.body?.message ===
        "string"
          ? req.body.message.trim()
          : typeof req.body?.request ===
            "string"
          ? req.body.request.trim()
          : typeof req.body?.text ===
            "string"
          ? req.body.text.trim()
          : "";

      if (!text) {
        return res.status(400).json({
          success: false,
          error:
            "درخواست خالی است"
        });
      }

      const result =
        await openRouterRequest({
          model: CHAT_MODEL,
          messages: [
            {
              role: "system",
              content: `
You are Lina's coding assistant.

Help the user with programming tasks.
When code is requested, provide complete working code.
Explain briefly when useful.
Prefer practical solutions.
`
            },
            {
              role: "user",
              content: text
            }
          ],
          temperature: 0.2,
          maxTokens: 8000,
          timeoutMs: 120000
        });

      return res.json({
        success: true,
        result,
        code: result
      });
    } catch (error) {
      console.error(
        "[CODE ERROR]",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          error?.message ||
          "Code request failed"
      });
    }
  }
);

// ------------------------------------------------------------
// ROOT
// ------------------------------------------------------------

app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

// ------------------------------------------------------------
// 404
// ------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error:
      "Route not found"
  });
});

// ------------------------------------------------------------
// START SERVER
// ------------------------------------------------------------

app.listen(
  PORT,
  () => {
    console.log(
      "===================================="
    );

    console.log(
      "          LINA BACKEND"
    );

    console.log(
      "===================================="
    );

    console.log(
      `Server: http://localhost:${PORT}`
    );

    console.log(
      `Health: http://localhost:${PORT}/health`
    );

    console.log(
      `Chat Model: ${CHAT_MODEL}`
    );

    console.log(
      `Translation Model: ${TRANSLATION_MODEL}`
    );

    console.log(
      "API Key:",
      process.env.OPENROUTER_API_KEY
        ? "Detected"
        : "MISSING"
    );

    console.log(
      "Chat:       /api/chat"
    );

    console.log(
      "Translate:  /api/translate"
    );

    console.log(
      "Rewrite:    /api/rewrite"
    );

    console.log(
      "Code:       /api/code"
    );

    console.log(
      "Register:   /api/auth/register"
    );

    console.log(
      "Login:      /api/auth/login"
    );

    console.log(
      "Current User: /api/auth/me"
    );

    console.log(
      "Long translation: ENABLED"
    );

    console.log(
      "Long rewrite:     ENABLED"
    );

    console.log(
      "===================================="
    );

    console.log(
      `Lina is running on http://localhost:${PORT}`
    );
  }
);