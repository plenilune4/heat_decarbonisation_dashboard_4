import redis
import json
from pymongo import MongoClient
from pymongo.server_api import ServerApi
import pandas as pd

# needs MongoClient dependency
# client = MongoClient("mongodb://localhost:27017")

uri = "mongodb+srv://plenilune_db_user:m1lrxZRTfz7IHgiB@development-db.ajenkbo.mongodb.net/?appName=development-db"
client = MongoClient(uri, server_api=ServerApi("1"))
db = client["my_database"]
jobs = db["jobs"]

try:
    # Send a ping to confirm a successful connection
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
    client.close()


redis_client = redis.Redis()

while True:
    _, job_json = redis_client.blpop("optimisation_queue")
    job = json.loads(job_json)
    print(job)

    jobs.update_one(
        {"_id": ObjectId(job["jobId"])},
        {
            "$set": {
                "status": "running",
                "startedAt": datetime.utcnow()
            }
        }
    )

    # results = optimise(
    #     job["param1"],
    #     job["param2"],
    #     job["param3"],
    #     job["param4"]
    # )

    results = pd.DataFrame()
    results["col1"] = [1,2,3]
    results["col2"] = [5,10,15]

    # Convert results dataframe to a usable format:
    records = results.to_dict("records")

    jobs.update_one(
        {"_id": ObjectId(job["jobId"])},
        {
            "$set": {
                "status": "completed",
                "completedAt": datetime.utcnow(),
                "results": records
            }
        }
    )

    redis_client.publish(
        "job_complete",
        json.dumps({
            "jobId": job["jobId"]
        })
    )
