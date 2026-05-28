const mineflayer = require('mineflayer');

const config = {
  host: 'nightcraft7.aternos.me',
  port: 40191,
  username: 'AFK_BOT', // بدون مسافات — بعض السيرفرات ما تقبل مسافات بالاسم
  version: '1.21.1',
  auth: 'offline',
  viewDistance: 'tiny',
  chat: 'enabled'
};

let bot;
let reconnectAttempts = 0;
const maxReconnectAttempts = 999;
const reconnectDelay = 10000; // 10 ثواني ثابتة بدون exponential backoff

let afkInterval = null;
let jumpInterval = null;
let walkInterval = null;

function startAFK() {
  stopAFK();

  afkInterval = setInterval(() => {
    if (!bot || !bot.entity) return;
    bot.look(bot.entity.yaw + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.2, false);
  }, 25000);

  walkInterval = setInterval(() => {
    if (!bot || !bot.entity) return;
    bot.setControlState('forward', true);
    setTimeout(() => {
      if (!bot) return;
      bot.setControlState('forward', false);
      if (bot.entity) bot.look(bot.entity.yaw + Math.PI / 2, 0, false);
    }, 2000);
  }, 120000);

  jumpInterval = setInterval(() => {
    if (!bot || !bot.entity) return;
    bot.setControlState('jump', true);
    setTimeout(() => { if (bot) bot.setControlState('jump', false); }, 400);
  }, 180000);

  console.log('🔄 AFK mode started');
}

function stopAFK() {
  if (afkInterval)  { clearInterval(afkInterval);  afkInterval  = null; }
  if (jumpInterval) { clearInterval(jumpInterval); jumpInterval = null; }
  if (walkInterval) { clearInterval(walkInterval); walkInterval = null; }
  if (bot) {
    try { bot.setControlState('forward', false); bot.setControlState('jump', false); } catch (_) {}
  }
}

function createBot() {
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
      startAFK();
    });

    bot.on('chat', (username, message) => {
      if (username === bot.username) return;
      console.log(`💬 ${username}: ${message}`);
    });

    bot.on('kicked', (reason) => {
      console.log(`❌ Kicked: ${JSON.stringify(reason)}`);
      stopAFK();
      handleReconnect();
    });

    bot.on('error', (err) => {
      console.error('❌ Bot error:', err.message);
      stopAFK();
      handleReconnect();
    });

    bot.on('end', () => {
      console.log('🔌 Connection ended');
      stopAFK();
      handleReconnect();
    });

    bot.on('message', (message) => {
      const msg = message.toString();
      console.log(`📨 ${msg}`);
    });

  } catch (error) {
    console.error('❌ Failed to create bot:', error.message);
    handleReconnect();
  }
}

function handleReconnect() {
  reconnectAttempts++;
  console.log(`⏳ Reconnecting in ${reconnectDelay / 1000}s... (Attempt ${reconnectAttempts})`);

  if (bot) {
    try { bot.end('reconnecting'); } catch (_) {}
    bot = null;
  }

  setTimeout(createBot, reconnectDelay);
}

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  stopAFK();
  if (bot) { try { bot.quit('shutdown'); } catch (_) {} }
  process.exit(0);
});

console.log('🚀 Starting Minecraft AFK bot (offline/cracked)...');
createBot();
