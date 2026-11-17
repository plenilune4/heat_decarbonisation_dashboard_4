import redis
import json
from pymongo import MongoClient
from bson import ObjectId
from pymongo.server_api import ServerApi
import pandas as pd
import sys
import os
from dotenv import load_dotenv
from time import sleep
from datetime import datetime, UTC

# needs MongoClient dependency
# client = MongoClient("mongodb://localhost:27017")

# uri = "mongodb+srv://plenilune_db_user:m1lrxZRTfz7IHgiB@development-db.ajenkbo.mongodb.net/?appName=development-db"
load_dotenv()
uri = os.getenv("MONGO_URI")
print(f"Python connecting to db at {uri}.")

client = MongoClient(uri, server_api=ServerApi("1"))
db = client["my_database"]
jobs = db["jobs"]

try:
    # Send a ping to confirm a successful connection
    print("Connecting to Redis...", end="")
    test_redis_client = redis.Redis(decode_responses=True)
    print("successful.")

    print("Connecting to MongoDB...", end="")
    client.admin.command("ping")
    print("Pinged your deployment. You successfully connected to MongoDB!")

    # Example: Accessing a database and performing a basic write/read
    db = client["test"]
    collection = db["users"]

    # Insert a document
    # result = collection.insert_one({"name": "Atlas Test", "status": "connected"})
    # result = collection.find_one({"firstName": "Timothy"})
    result = collection.count_documents({})
    print(f"{result} documents found")

except Exception as e:
    print(f"Connection failed: {e}", file=sys.stderr)

finally:
    # Always close the connection when finished
    pass
    #client.close()

redis_client = redis.Redis()

while True:
    _, job_json = redis_client.blpop("optimisation_queue")

    if job_json:
        job = json.loads(job_json)

        # redis has only the jobId and UserId for the job.
        jobId = job["jobId"]
        userId = job["userId"]

        # The details are in mongodb.
        jobdetails = jobs.find_one({"_id": ObjectId(jobId)})

        param1, param2, param3, param4 = jobdetails["params"]

        print(jobdetails)

        jobs.update_one(
            {"_id": ObjectId(job["jobId"])},
            {
                "$set": {
                    "status": "running",
                    "startedAt": datetime.now(UTC)
                }
            }
        )
    else:
        sleep(0.05) # doubt that this is strictly necessary.
        continue

    # results = optimise(
    #     job["param1"],
    #     job["param2"],
    #     job["param3"],
    #     job["param4"]
    # )

    print(f"Starting optimisation job {job['jobId']}...")

    results = pd.DataFrame()
    results["col1"] = [1,2,3]
    results["col2"] = [5,10,15]

    # Convert results dataframe to a usable format:
    records = results.to_dict("records")

    print(f"Completed optimisation job {job['jobId']}.")

    jobs.update_one(
        {"_id": ObjectId(job["jobId"])},
        {
            "$set": {
                "status": "completed",
                "completedAt": datetime.now(UTC),
                "results": records
            }
        }
    )

    # Notify Node that results are ready:
    redis_client.publish(
        "job_complete",
        json.dumps({
            "userId": job["userId"],
            "jobId": job["jobId"]
        })
    )
