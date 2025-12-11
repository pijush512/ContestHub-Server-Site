const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 3000;

const admin = require("firebase-admin");

const serviceAccount = require("./contesthub-d76ca-firebase-adminsdk-fbsvc-e40eb562ae.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Middleware
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5fdvbil.mongodb.net/?appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const db = client.db("contest_hub_db");
    const contestCollection = db.collection("contest");
    const usersCollection = db.collection("users");
    const participateCollection = db.collection("participations");

    // GET all users
    app.get("/users", async (req, res) => {
      try {
        const users = await usersCollection.find().toArray();
        res.send(users);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to fetch users" });
      }
    });

    app.post("/users", async (req, res) => {
      const user = req.body;

      const exists = await usersCollection.findOne({ email: user.email });
      if (exists) {
        return res.send({ message: "User already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

    app.patch("/users/:email", async (req, res) => {
      const result = await usersCollection.updateOne(
        { email: req.params.email },
        { $set: req.body }
      );
      if (result.matchedCount === 0)
        return res.status(404).send("User not found");
      res.send("Profile updated!");
    });

    // Contest Api
    app.get("/contest", async (req, res) => {
      const result = await contestCollection.find().toArray();
      res.send(result);
    });

    app.get("/contest/popular", async (req, res) => {
      try {
        const result = await contestCollection
          .aggregate([
            {
              $addFields: {
                participants: { $ifNull: ["$participants", 0] },
              },
            },
            { $sort: { participants: -1 } },
            { $limit: 5 },
          ])
          .toArray();

        res.send(result);
      } catch (err) {
        console.error("Error in /contest/popular:", err);
        res.status(500).send({ error: "Failed to fetch popular contests" });
      }
    });

    app.get("/contest/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await contestCollection.findOne(query);
      res.send(result);
    });

    app.get("/contest/search/:type", async (req, res) => {
      const type = req.params.type;
      const result = await contestCollection
        .find({ type: { $regex: type, $options: "i" } })
        .toArray();

      res.send(result);
    });

    app.post("/contest", async (req, res) => {
      const contest = {
        ...req.body,
        status: "pending",
        participants: 0,
        createdAt: new Date(),
      };
      const result = await contestCollection.insertOne(contest);
      res.send(result);
    });

    app.patch("/contest/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;

      const result = await contestCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );

      if (result.matchedCount === 0) {
        return res.status(404).send({ message: "Contest not found" });
      }

      res.send(result);
    });

    app.delete("/contest/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await contestCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/contest/creator/:email", async (req, res) => {
      const email = req.params.email;
      const result = await contestCollection
        .find({ creatorEmail: email })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("ContestHub is running");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
