import {createClient} from "redis";

export async function startRedisSubscriber(io) {

    const subscriber = createClient();

    await subscriber.connect();

    console.log("Redis subscriber connected.");

    await subscriber.subscribe("job_complete", message => {

        const job = JSON.parse(message);

        io.emit("jobComplete", job);

    });

}