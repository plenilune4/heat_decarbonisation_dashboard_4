import './loadEnv'

import mongoose from 'mongoose'

import Logger from './logger'
import app from './server'


mongoose.set('strictQuery', true)

const port = process.env.PORT || 8000
let s

const start = async () => {
    try {
        await mongoose.connect(process.env.DB_CONNECTION_STRING);
        console.log(`########## trying to listen on ${port} ############`)
        s = app.listen(port, () => {
            Logger.info(`Express server started on port: ${port}`)
        })
    } catch (error) {
        Logger.error(`Failed to start server: ${error}`)
        process.exit(1)
    }
    return s
}

//dummy change

let server

start().then((s) => {
    server = s;
    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${port} is already in use. Express cannot start.`);
            process.exit(1);
        }
        throw error;
    });
})

function gracefulShutdown(signal) {
    console.log(`Received ${signal}. Express closing...`);

    // Stops the server from accepting new connections
    server.close(() => {
        console.log('Express server completely closed. Exiting.');
        process.exit(0);
    });

    // Force exit if connections take too long to close
    setTimeout(() => {
        console.error('Forced shutdown: Connections took too long to close.');
        process.exit(1);
    }, 10000);
}

// 3. Listen for system signals and crashes
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});




