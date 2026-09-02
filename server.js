const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENROUTER_API_KEY;

if (!API_KEY) {
  console.error("❌ OPENROUTER_API_KEY پیدا نشد!");
}

// صفحه اصلی
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Lina backend is running"
  });
});

// بررسی سلامت سرور
app.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "Lina backend is healthy",
    ai: API_KEY ? "API key detected" : "API key missing"
  });
});

// ارتباط با OpenRouter
async function askLina(messages) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Lina AI"
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: messages,
        max_tokens: 800
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("❌ OpenRouter error:", data);

    throw new Error(
      data.error?.message ||
      "خطا در ارتباط با هوش مصنوعی"
    );
  }

  const reply = data.choices?.[0]?.message?.content;

  if (!reply) {
    throw new Error("پاسخی از هوش مصنوعی دریافت نشد.");
  }

  return reply;
}

// چت Lina
app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: "پیام خالی است."
      });
    }

    const reply = await askLina([
      {
        role: "system",
        content:
          "تو Lina هستی، یک دستیار هوش مصنوعی فارسی‌زبان. پاسخ‌ها را دقیق، مفید و دوستانه بده. اگر کاربر فارسی صحبت کرد، فارسی پاسخ بده."
      },
      {
        role: "user",
        content: message
      }
    ]);

    res.json({
      success: true,
      reply: reply
    });

  } catch (error) {
    console.error("❌ Chat error:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ترجمه
app.post("/translate", async (req, res) => {
  try {
    const text = req.body.text;
    const targetLanguage = req.body.targetLanguage || "فارسی";

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "متن خالی است."
      });
    }

    const reply = await askLina([
      {
        role: "system",
        content:
          "تو مترجم حرفه‌ای Lina هستی. متن را دقیق و کامل ترجمه کن. چیزی را حذف یا خلاصه نکن."
      },
      {
        role: "user",
        content:
          `این متن را به ${targetLanguage} ترجمه کن:\n\n${text}`
      }
    ]);

    res.json({
      success: true,
      translation: reply
    });

  } catch (error) {
    console.error("❌ Translation error:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// خلاصه‌سازی
app.post("/summarize", async (req, res) => {
  try {
    const text = req.body.text;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        error: "متن خالی است."
      });
    }

    const reply = await askLina([
      {
        role: "system",
        content:
          "تو خلاصه‌ساز Lina هستی. مهم‌ترین نکات متن را حفظ کن و مفهوم اصلی را تغییر نده."
      },
      {
        role: "user",
        content: text
      }
    ]);

    res.json({
      success: true,
      summary: reply
    });

  } catch (error) {
    console.error("❌ Summarize error:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// کدنویسی
app.post("/code", async (req, res) => {
  try {
    const request = req.body.request;

    if (!request || !request.trim()) {
      return res.status(400).json({
        success: false,
        error: "درخواست کدنویسی خالی است."
      });
    }

    const reply = await askLina([
      {
        role: "system",
        content:
          "تو برنامه‌نویس حرفه‌ای Lina هستی. کد تمیز و قابل اجرا تولید کن و در صورت نیاز توضیح کوتاه بده."
      },
      {
        role: "user",
        content: request
      }
    ]);

    res.json({
      success: true,
      code: reply
    });

  } catch (error) {
    console.error("❌ Code error:", error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// مسیر اشتباه
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "این مسیر در Lina وجود ندارد."
  });
});

// اجرای سرور
app.listen(PORT, () => {
  console.log("");
  console.log("=================================");
  console.log("🚀 Lina backend is running");
  console.log(`📡 http://localhost:${PORT}`);
  console.log(`❤️ http://localhost:${PORT}/health`);
  console.log("=================================");
  console.log("");
});