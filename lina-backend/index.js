require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// ============================================================
// LINA FRONTEND
// ============================================================

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
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
    model: "deepseek/deepseek-v4-flash"
  });
});

// ============================================================
// AI REQUEST HELPER
// ============================================================

async function askLina(messages) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",

      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        model: "deepseek/deepseek-v4-flash",
        messages: messages
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenRouter error:", data);

    throw new Error(
      data.error?.message ||
      "خطا در اتصال به هوش مصنوعی"
    );
  }

  return (
    data.choices?.[0]?.message?.content ||
    "متأسفم، پاسخی دریافت نشد."
  );
}

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

مهم‌ترین قانون:
هویت تو همیشه Lina است.
`;

// ============================================================
// CHAT
// ============================================================

app.post("/api/chat", async (req, res) => {
  try {
    const userMessage = req.body.message;

    if (!userMessage || !userMessage.trim()) {
      return res.status(400).json({
        success: false,
        error: "پیام خالی است"
      });
    }

    // --------------------------------------------------------
    // تاریخچه مکالمه
    // --------------------------------------------------------

    let history = [];

    if (Array.isArray(req.body.history)) {
      history = req.body.history
        .filter(
          (item) =>
            item &&
            (item.role === "user" ||
              item.role === "assistant") &&
            typeof item.content === "string" &&
            item.content.trim()
        )
        .slice(-20);
    }

    // --------------------------------------------------------
    // ساخت پیام‌های AI
    // --------------------------------------------------------

    const messages = [
      {
        role: "system",
        content: linaSystemPrompt
      },

      ...history,

      {
        role: "user",
        content: userMessage.trim()
      }
    ];

    const answer = await askLina(messages);

    res.json({
      success: true,
      reply: answer
    });

  } catch (error) {
    console.error("Chat server error:", error);

    res.status(500).json({
      success: false,
      error:
        error.message ||
        "خطا در سرور لینا"
    });
  }
});

// ============================================================
// TRANSLATE
// ============================================================

app.post("/api/translate", async (req, res) => {
  try {
    const text = req.body.text;
    const source = req.body.source || "auto";
    const target = req.body.target || "fa";

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "متن برای ترجمه خالی است"
      });
    }

    const sourceLanguage =
      source === "auto"
        ? "the detected original language"
        : source;

    const targetLanguage = target;

    const prompt = `
You are Lina Translator.

Translate the user's text accurately from ${sourceLanguage} to ${targetLanguage}.

Rules:
- Translate the COMPLETE text.
- Never summarize.
- Never remove information.
- Preserve the original meaning.
- Preserve paragraphs and structure when possible.
- Do not add explanations.
- Return ONLY the translation.

TEXT:
${text}
`;

    const result = await askLina([
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
    ]);

    res.json({
      success: true,
      translation: result
    });

  } catch (error) {
    console.error("Translate error:", error);

    res.status(500).json({
      success: false,
      error:
        error.message ||
        "خطا در ترجمه"
    });
  }
});

// ============================================================
// REWRITE
// ============================================================

app.post("/api/rewrite", async (req, res) => {
  try {
    const text = req.body.text;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "متن برای بازنویسی خالی است"
      });
    }

    const prompt = `
You are Lina Rewrite.

Your job is to rewrite the user's text in the SAME LANGUAGE as the original text.

Rules:
- Always preserve the original language.
- NEVER translate the text.
- NEVER summarize.
- NEVER remove important information.
- Preserve the original meaning.
- Make the text clearer, more natural and professional.
- Improve grammar, vocabulary and sentence structure.
- Keep the same general tone unless improving clarity requires a small adjustment.
- Return ONLY the rewritten text.

IMPORTANT:
- Persian → Persian
- English → English
- Arabic → Arabic
- Urdu → Urdu

TEXT:
${text}
`;

    const result = await askLina([
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
    ]);

    res.json({
      success: true,
      result: result
    });

  } catch (error) {
    console.error("Rewrite error:", error);

    res.status(500).json({
      success: false,
      error:
        error.message ||
        "خطا در بازنویسی"
    });
  }
});

// ============================================================
// CODE
// ============================================================

app.post("/api/code", async (req, res) => {
  try {
    const request = req.body.message || req.body.request;

    if (!request || !request.trim()) {
      return res.status(400).json({
        success: false,
        error: "درخواست کدنویسی خالی است"
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
- Briefly explain how to use the code when necessary.
`;

    const result = await askLina([
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
    ]);

    res.json({
      success: true,
      reply: result
    });

  } catch (error) {
    console.error("Code error:", error);

    res.status(500).json({
      success: false,
      error:
        error.message ||
        "خطا در تولید کد"
    });
  }
});

// ============================================================
// START SERVER
// ============================================================

const PORT = 3000;

app.listen(PORT, () => {
  console.log("====================================");
  console.log("🚀 Lina Backend is running");
  console.log(`📡 http://localhost:${PORT}`);
  console.log(`❤️ http://localhost:${PORT}/health`);
  console.log("🤖 OpenRouter AI connected");
  console.log("🧠 Model: deepseek/deepseek-v4-flash");
  console.log("💬 Chat memory endpoint ready");
  console.log("🌐 Translation endpoint ready");
  console.log("✍️ Rewrite endpoint ready");
  console.log("💻 Code endpoint ready");
  console.log("====================================");
});