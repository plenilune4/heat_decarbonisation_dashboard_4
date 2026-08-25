import './loadEnv'

import mongoose from 'mongoose'

import Logger from './logger'
import server from './server'



mongoose.set('strictQuery', true)

const port = process.env.PORT || 8000

const start = async () => {
    try {
        await mongoose.connect(process.env.DB_CONNECTION_STRING);
        console.log(`########## trying to listen on ${port} ############`)
        server.listen(port, () => {
            Logger.info(`Express server started on port: ${port}`)
        })
    } catch (error) {
        Logger.error(`Failed to start server: ${error}`)
        process.exit(1)
    }
}

start()

function gracefulShutdown(signal) {
  console.log(`Received ${signal}. Closing HTTP server...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });

  // Force exit after 10 seconds if closing hangs
  setTimeout(() => {
    console.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000);
}


// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Handles Ctrl+C
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});




