import { app } from './app';
import { config } from './config';
import { prisma } from './db/prisma';

const port = config.port || 4000;

async function startServer() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully!');

    const server = app.listen(port, () => {
      console.log(`Backend listening on http://localhost:${port}`);
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. The backend may already be running at http://localhost:${port}.`);
        console.error('Stop the existing server with Ctrl + C, or set a different PORT in .env.');
        process.exit(1);
      }

      console.error('Server failed to start:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

startServer();
