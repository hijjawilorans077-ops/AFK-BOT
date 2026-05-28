const mineflayer = require('mineflayer');

const config = {
  host: 'nightcraft7.aternos.me',
  port: 40191,
  username: 'Stave_123',
  version: '1.21.1',
  auth: 'offline',
  viewDistance: 'tiny',
  chat: 'enabled'
};

let bot;
let reconnectAttempts = 0;
const maxReconnectAttempts = 999;
const reconnectDelay = 10000; // 10 ثواني عند الانقطاع

const CYCLE_ONLINE  = 5 * 60 * 60 * 1000; // 5 ساعات متصل
const CYCLE_OFFLINE = 30 * 1000;           // 30 ثانية مقطوع ثم يرجع

let cycleTimer = null;
let afkInterval = null;
let jumpInterval = null;
let walkInterval = null;

// ======================================================
// AFK
// ======================================================
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
  }, 1000); // يقفز كل ثانية

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

// ======================================================
// Cycle — يقطع كل 5 ساعات ثم يرجع بعد 30 ثانية
// ======================================================
function scheduleCycleDisconnect() {
  if (cycleTimer) { clearTimeout(cycleTimer); cycleTimer = null; }

  console.log(`🔁 Cycle: will disconnect in 5 hours`);

  cycleTimer = setTimeout(() => {
    console.log('🔁 5-hour cycle — disconnecting for 30 seconds...');
    stopAFK();
    if (bot) {
      try { bot.end('cycle-disconnect'); } catch (_) {}
      bot = null;
    }
    // بعد 30 ثانية يرجع
    setTimeout(() => {
      console.log('🔁 Reconnecting after cycle break...');
      reconnectAttempts = 0;
      createBot();
    }, CYCLE_OFFLINE);

  }, CYCLE_ONLINE);
}

// ======================================================
// Create Bot
// ======================================================
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
      scheduleCycleDisconnect(); // ابدأ عداد الـ 5 ساعات
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
      if (cycleTimer) { clearTimeout(cycleTimer); cycleTimer = null; }
      handleReconnect();
    });

    bot.on('error', (err) => {
      console.error('❌ Bot error:', err.message);
      stopAFK();
      if (cycleTimer) { clearTimeout(cycleTimer); cycleTimer = null; }
      handleReconnect();
    });

    bot.on('end', () => {
      // لو الـ end جاء من الـ cycle، handleReconnect ما تشتغل هون
      if (!cycleTimer) return;
      console.log('🔌 Connection ended');
      stopAFK();
      clearTimeout(cycleTimer); cycleTimer = null;
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

// ======================================================
// Reconnect (عند الانقطاع غير المتوقع)
// ======================================================
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
  if (cycleTimer) clearTimeout(cycleTimer);
  if (bot) { try { bot.quit('shutdown'); } catch (_) {} }
  process.exit(0);
});

console.log('🚀 Starting Minecraft AFK bot...');
createBot();
