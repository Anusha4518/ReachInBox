import { createApp } from './app.js';
import { config } from './config/env.js';
import { createEmailWorker } from './workers/email.worker.js';
import { syncPendingEmailsFromDatabase } from './queues/email.queue.js';

const app = createApp();

const server = app.listen(config.port, async () => {
  console.log(`🚀 ReachInbox Server running on port ${config.port}`);
  console.log(`📡 Healthcheck: http://localhost:${config.port}/api/health`);
  console.log(`📊 BullMQ Queue Dashboard: http://localhost:${config.port}/admin/queues`);

  // Initialize embedded email worker for seamless single-command development
  const worker = createEmailWorker();

  // Recover any pending delayed jobs from MySQL across restarts
  await syncPendingEmailsFromDatabase();

  const shutdown = async () => {
    console.log('Shutting down server & workers gracefully...');
    await worker.close();
    server.close(() => {
      console.log('ReachInbox Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});
