const mineflayer = require('mineflayer');

// Configuration
const config = {
  host: 'nightcraft7.aternos.me',
  port: 40191,
  username: 'AFK BOT',
  version: '1.21.1',
  auth: 'offline',
  viewDistance: 'tiny',
  chat: 'enabled'
};

let bot;
let reconnectAttempts = 0;
const maxReconnectAttempts = 99; // يضل يحاول بدون ما يوقف
const reconnectDelay = 5000;

// متغيرات AFK
let afkInterval = null;
let jumpInterval = null;
let walkInterval = null;

function startAFK() {
  // وقف أي AFK قديم قبل ما نبدأ
  stopAFK();

  // 1) دوران كل 25 ثانية (عشان يبين إنه حي)
  afkInterval = setInterval(() => {
    if (!bot || !bot.entity) return;
    const yaw = bot.entity.yaw + (Math.random() - 0.5) * 0.4;
    const pitch = (Math.random() - 0.5) * 0.2;
    bot.look(yaw, pitch, false);
  }, 25000);

  // 2) مشي دائري صغير كل دقيقتين
  walkInterval = setInterval(() => {
    if (!bot || !bot.entity) return;

    // امشي للأمام 2 ثانية
    bot.setControlState('forward', true);
    setTimeout(() => {
      if (!bot) return;
      bot.setControlState('forward', false);

      // استدر شوية
      if (bot.entity) {
        bot.look(bot.entity.yaw + Math.PI / 2, 0, false);
      }
    }, 2000);
  }, 120000);

  // 3) قفزة خفيفة كل 3 دقايق
  jumpInterval = setInterval(() => {
    if (!bot || !bot.entity) return;
    bot.setControlState('jump', true);
    setTimeout(() => {
      if (!bot) return;
      bot.setControlState('jump', false);
    }, 400);
  }, 180000);

  console.log('🔄 AFK mode started');
}

function stopAFK() {
  if (afkInterval)  { clearInterval(afkInterval);  afkInterval  = null; }
  if (jumpInterval) { clearInterval(jumpInterval); jumpInterval = null; }
  if (walkInterval) { clearInterval(walkInterval); walkInterval = null; }

  // تأكد إن كل الحركات وقفت
  if (bot) {
    try {
      bot.setControlState('forward', false);
      bot.setControlState('jump', false);
    } catch (_) {}
  }
}

async function createBot() {
  try {
    bot = mineflayer.createBot({
      host: config.host,
      port: config.port,
      username: config.username,
      version: config.version,
      auth: config.auth,
      viewDistance: config.viewDistance,
      chat: config.chat
    });

    bot.once('login', () => {
      console.log(`✅ Logged in as ${bot.username}`);
      reconnectAttempts = 0;
    });

    bot.on('spawn', () => {
      console.log('✅ Spawned in world');
      // ما في رسالة شات — البوت صامت تماماً
      startAFK();
    });

    // البوت ما يرد على أي رسالة بالشات
    bot.on('chat', (username, message) => {
      if (username === bot.username) return;
      console.log(`💬 ${username}: ${message}`);
      // صامت — بدون رد
    });

    bot.on('kicked', (reason) => {
      console.log(`❌ Kicked: ${JSON.stringify(reason)}`);
      stopAFK();
      handleReconnect();
    });

    bot.on('error', (err) => {
      console.error('❌ Bot error:', err.message);
      if (err.message.includes('auth') || err.message.includes('login')) {
        console.error('Authentication error. Check your credentials.');
        process.exit(1);
      }
      stopAFK();
      handleReconnect();
    });

    bot.on('end', () => {
      console.log('🔌 Connection ended');
      stopAFK();
      handleReconnect();
    });

    // رسائل السيرفر المهمة فقط
    bot.on('message', (message) => {
      const msg = message.toString();
      if (msg.includes('whitelist') || msg.includes('banned') || msg.includes('kick')) {
        console.log(`⚠️ Server message: ${msg}`);
      }
    });

  } catch (error) {
    console.error('❌ Failed to create bot:', error.message);
    handleReconnect();
  }
}

function handleReconnect() {
  if (reconnectAttempts >= maxReconnectAttempts) {
    console.error(`❌ Max reconnection attempts reached. Exiting...`);
    process.exit(1);
  }

  const delay = Math.min(reconnectDelay * Math.pow(1.5, reconnectAttempts), 300000);
  reconnectAttempts++;

  console.log(`⏳ Reconnecting in ${delay / 1000}s... (Attempt ${reconnectAttempts}/${maxReconnectAttempts})`);

  if (bot) {
    try { bot.end('reconnecting'); } catch (_) {}
    bot = null;
  }

  setTimeout(createBot, delay);
}

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down bot...');
  stopAFK();
  if (bot) {
    try { bot.quit('shutdown'); } catch (_) {}
  }
  process.exit(0);
});

console.log('🚀 Starting Minecraft AFK bot...');
createBot();
