const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 3000;

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

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const result = await usersCollection.findOne({ email });
      res.send(result);
    });

    app.patch("/users/:email", async (req, res) => {
      const email = req.params.email;

      if (req.user.email !== email) {
        return res
          .status(403)
          .send({ message: "Forbidden access: Cannot edit other profiles" });
      }

      const result = await usersCollection.updateOne(
        { email: email },
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

    // GET contests by creator email
    app.get("/contest/creator/:email", async (req, res) => {
      const { email } = req.params;
      const result = await contestCollection
        .find({ creatorEmail: email })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    // Popular contests show in ui
    app.get("/contests/popular", async (req, res) => {
      const result = await contestCollection
        .find()
        .sort({ participants: -1 })
        .limit(6)
        .toArray();

      res.send(result);
    });
    
    app.get("/contests", async (req, res) => {
      try {
        const { type } = req.query; 
        const filter = { approved: true };

        if (type && type !== "all") {
          const typeMap = {
            "Image Design": "image-design",
            "Article Writing": "article-writing",
            "Business Ideas": "business-idea",
            "Gaming Reviews": "gaming-review",
          };
         filter.type = typeMap[type] ;
        }

        const contests = await contestCollection
          .find(filter)
          .sort({ createdAt: -1 }) // latest contests first
          .toArray();

        res.send(contests);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to fetch contests" });
      }
    });

    app.post("/contest", async (req, res) => {
      const contest = {
        ...req.body,
        createdAt: new Date(),
      };
      const result = await contestCollection.insertOne(contest);
      res.send(result);
    });

    // Update contest (approve/reject)
    app.patch("/contest/:id", async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;

      try {
        const result = await contestCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateData }
        );
        if (result.matchedCount === 0)
          return res.status(404).send({ message: "Contest not found" });

        res.send({ message: "Contest updated successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to update contest" });
      }
    });

    app.delete("/contest/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await contestCollection.deleteOne(query);
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
