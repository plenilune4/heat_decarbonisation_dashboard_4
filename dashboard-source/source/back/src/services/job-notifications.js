import { subscriber } from "../redis.js";

export async function startJobNotifications(io) {
  await subscriber.subscribe("job_complete", (message) => {
    try {
      const { jobId, userId } = JSON.parse(message);
      // Notify only the user who owns this job.
      console.log(`Optimisation job ${jobId} for user ${userId} is complete.`)
      io.to(`user:${userId}`).emit("jobComplete", { jobId });
    } catch (err) {
      console.error("Invalid job completion message:", err);
    }
  });
}