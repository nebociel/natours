import dotenv from 'dotenv';
import mongoose from 'mongoose';
import app from './app.js';

dotenv.config({ path: './config.env' });

// UNCAUGHT EXCEPTION
process.on('uncaughtException', (error) => {
  console.error(
    'An uncaught exception was detected! 🔥 Initiating shutdown...',
  );
  console.error(error);
  process.exit(1);
});

// CONNECT TO DATABASE
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose.connect(DB).then(() => console.log('DB connection successful!'));

// START SERVER
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// UNHANDLED REJECTION
process.on('unhandledRejection', (error) => {
  console.error(
    'An unhandled promise rejection was detected! 🔥 Initiating shutdown...',
  );
  console.error(error);
  // Gracefully shut down the server before exiting
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    console.log('💥 Process terminated!');
  });
});
