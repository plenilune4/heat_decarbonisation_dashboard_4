// queues/optimisationQueue.js

const { Queue } = require("bullmq");

const optimisationQueue = new Queue(
  "optimisations",
  {
    connection: {
      host: "localhost",
      port: 6379
    }
  }
);

module.exports = optimisationQueue;