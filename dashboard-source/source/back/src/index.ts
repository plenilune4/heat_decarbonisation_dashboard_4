import './loadEnv'

import mongoose from 'mongoose'

import Logger from './logger'
import server from './server'
import { Server } from "socket.io";


mongoose.set('strictQuery', true)

const port = process.env.PORT || 8000

const start = async () => {
    try {
        await mongoose.connect(process.env.DB_CONNECTION_STRING);



        server.listen(port, () => {
            Logger.info(`Express server started on port: ${port}`)
        })
    } catch (error) {
        Logger.error(`Failed to start server: ${error}`)
        process.exit(1)
    }
}

start()

// Handle termination signals
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed gracefully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    console.log('Server closed gracefully');
    process.exit(0);
  });
});
