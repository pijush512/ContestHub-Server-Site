const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const stripe = require("stripe")(process.env.STRIP_SECRET);

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
    const submissionsCollection = db.collection("submissions");

    participateCollection.createIndex({ transactionId: 1 }, { unique: true });

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
        .find({ status: "approved" })
        .sort({ participantsCount: -1 })
        .limit(6)
        .toArray();

      res.send(result);
    });

    app.get("/contests", async (req, res) => {
      try {
        const { type } = req.query;
        const filter = { status: "approved" };

        if (type && type !== "all") {
          const typeMap = {
            "Image Design": "image-design",
            "Article Writing": "article-writing",
            "Business Ideas": "business-idea",
            "Gaming Reviews": "gaming-review",
          };
          filter.type = typeMap[type];
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

    // GET single contest by id
    app.get("/contest/:id", async (req, res) => {
      const id = req.params.id;
      try {
        const contest = await contestCollection.findOne({
          _id: new ObjectId(id),
        });
        if (!contest)
          return res.status(404).send({ message: "Contest not found" });
        res.send(contest);
      } catch (err) {
        console.error(err);
        res.status(500).send({ error: "Failed to fetch contest" });
      }
    });

    app.post("/contest", async (req, res) => {
      const contest = {
        ...req.body,
        status: "pending",
        participantsCount: 0,
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

    // participationCollection = db.collection("participations");

    app.get("/participations", async (req, res) => {
      const { contestId, userEmail } = req.query;

      const existing = await participateCollection.findOne({
        contestId,
        userEmail,
      });

      res.send({ alreadyRegistered: !!existing });
    });

    // GET participated contests by user email
    app.get("/contest/participated/:email", async (req, res) => {
      const { email } = req.params;

      try {
        // 1️⃣ User er sob participation fetch
        const participations = await participateCollection
          .find({ userEmail: email })
          .toArray();

        // 2️⃣ Contest er info add koro
        const contests = await Promise.all(
          participations.map(async (p) => {
            const contest = await contestCollection.findOne({
              _id: new ObjectId(p.contestId),
            });
            return {
              ...contest,
              registeredAt: p.registeredAt,
            };
          })
        );

        res.send(contests);
      } catch (err) {
        console.error(err);
        res
          .status(500)
          .send({ message: "Failed to fetch participated contests" });
      }
    });

    app.post("/participations", async (req, res) => {
      const { contestId, userEmail, registeredAt } = req.body;

      // Check duplicate registration
      const existing = await participateCollection.findOne({
        contestId,
        userEmail,
      });
      if (existing) {
        return res.status(400).send({ message: "Already registered" });
      }

      // Insert participation
      const result = await participateCollection.insertOne({
        contestId,
        userEmail,
        registeredAt: registeredAt || new Date(),
      });

      res.send({ message: "Successfully registered", result });
    });

    // Payment related api
    app.post("/create-checkout-session", async (req, res) => {
      const paymentInfo = req.body;
      const amount = parseInt(paymentInfo.price) * 100;
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            // Provide the exact Price ID (for example, price_1234) of the product you want to sell
            price_data: {
              currency: "USD",
              unit_amount: amount,
              product_data: {
                name: paymentInfo.contestName,
              },
            },
            quantity: 1,
          },
        ],
        customer_email: paymentInfo.userEmail,
        mode: "payment",
        metadata: {
          contestId: paymentInfo.contestId,
          contestName: paymentInfo.contestName,
        },
        success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
      });

      // res.redirect(303, session.url);
      console.log(session);
      res.send({ url: session.url });
    });

    // app.patch("/payment-success", async (req, res) => {
    //   try {
    //     const sessionId = req.query.session_id;
    //     const session = await stripe.checkout.sessions.retrieve(sessionId);

    //     const contestId = session.metadata.contestId;
    //     const userEmail = session.customer_email;
    //     const transactionId = session.payment_intent;
    //     const query = { transactionId: transactionId };

    //     const paymentExist = await participateCollection.findOne(query);
    //     if (paymentExist) {
    //       return res.send({ message: "already exists", transactionId });
    //     }

    //     // Check duplicate registration
    //     // const existing = await participateCollection.findOne({
    //     //   contestId,
    //     //   userEmail,
    //     // });
    //     // if (existing) {
    //     //   return res.send({
    //     //     success: false,
    //     //     message: "You have already registered",
    //     //     paymentInfo: null,
    //     //   });
    //     // }

    //     if (session.payment_status !== "paid") {
    //       return res.send({
    //         success: false,
    //         message: "Payment not completed yet",
    //         paymentInfo: null,
    //       });
    //     }

    //     const trackingId =
    //       "TRK-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    //     // Insert participation
    //     await participateCollection.insertOne({
    //       contestId,
    //       userEmail,
    //       trackingId,
    //       transactionId,
    //       registeredAt: new Date(),
    //     });

    //     // Increment participants count
    //     await contestCollection.updateOne(
    //       { _id: new ObjectId(contestId) },
    //       { $inc: { participantsCount: 1 } }
    //     );

    //     // Payment info
    //     const paymentInfo = {
    //       contestId,
    //       contestName: session.metadata.contestName,
    //       amount: session.amount_total / 100,
    //       currency: session.currency,
    //       trackingId,
    //       paymentStatus: session.payment_status,
    //       transactionId: session.payment_intent,
    //       paidAt: new Date(),
    //     };

    //     res.send({
    //       success: true,
    //       message: "Payment successful & registered",
    //       paymentInfo,
    //     });
    //   } catch (error) {
    //     console.error(error);
    //     res
    //       .status(500)
    //       .send({ success: false, message: "Server error", paymentInfo: null });
    //   }
    // });

    // submissionsCollection related api
    app.patch("/payment-success", async (req, res) => {
      try {
        const sessionId = req.query.session_id;
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== "paid") {
          return res.send({
            success: false,
            message: "Payment not completed yet",
          });
        }

        const contestId = session.metadata.contestId;
        const userEmail = session.customer_email;
        const transactionId = session.payment_intent;

        const trackingId =
          "TRK-" + Math.random().toString(36).substring(2, 10).toUpperCase();

        await participateCollection.insertOne({
          contestId,
          userEmail,
          trackingId,
          transactionId,
          registeredAt: new Date(),
        });

        await contestCollection.updateOne(
          { _id: new ObjectId(contestId) },
          { $inc: { participantsCount: 1 } }
        );

        res.send({
          success: true,
          message: "Payment successful & registered",
          paymentInfo: {
            contestId,
            contestName: session.metadata.contestName,
            amount: session.amount_total / 100,
            currency: session.currency,
            trackingId,
            transactionId,
          },
        });
      } catch (error) {
        if (error.code === 11000) {
          return res.send({
            success: true,
            message: "Payment already processed",
            duplicate: true,
          });
        }

        console.error(error);
        res.status(500).send({
          success: false,
          message: "Server error",
        });
      }
    });

    app.post("/submissions", async (req, res) => {
      try {
        const { contestId, userEmail, taskLink, submittedAt } = req.body;

        // 1️⃣ Check duplicate submission
        const existing = await submissionsCollection.findOne({
          contestId,
          userEmail,
        });
        if (existing) {
          return res.send({
            success: false,
            message: "You already submitted this contest",
          });
        }

        // 2️⃣ Insert submission
        const result = await submissionsCollection.insertOne({
          contestId,
          userEmail,
          taskLink,
          submittedAt: submittedAt || new Date(),
        });

        res.send({
          success: true,
          message: "Task submitted successfully",
          result,
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({ success: false, message: "Server error" });
      }
    });

    // Show creator dashbord api
    app.get("/creator/submissions/:contestId", async (req, res) => {
      const { contestId } = req.params;
      const submissions = await submissionsCollection
        .find({ contestId })
        .toArray();
      res.send(submissions);
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
