// const express = require("express");
// const cors = require("cors");
// const jwt = require("jsonwebtoken");
// const bcrypt = require("bcryptjs");
// const app = express();
// require("dotenv").config();

// const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// const port = process.env.PORT || 3000;

// // Middleware
// app.use(express.json());
// app.use(cors());

// // --- JWT Verifacition Middleware ---
// const verifyToken = (req, res, next) => {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) {
//     return res
//       .status(401)
//       .send({ message: "Unauthorized access: No token provided" });
//   }
//   const token = authHeader.split(" ")[1];

//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
//     if (err) {
//       return res
//         .status(401)
//         .send({ message: "Unauthorized access: Invalid token" });
//     }
//     req.user = decoded;
//     next();
//   });
// };

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5fdvbil.mongodb.net/?appName=Cluster0`;
// // Create a MongoClient with a MongoClientOptions object to set the Stable API version
// const client = new MongoClient(uri, {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   },
// });

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();
//     const db = client.db("contest_hub_db");
//     const contestCollection = db.collection("contest");
//     const usersCollection = db.collection("users");
//     const participateCollection = db.collection("participations");

//     // Role Verifaction middelware
//     const verifyAdmin = async (req, res, next) => {
//       const userEmail = req.user.email;
//       const user = await usersCollection.findOne({ email: userEmail });
//       if (user?.role !== "admin") {
//         return res
//           .status(403)
//           .send({ message: "Forbidden access: Admin required" });
//       }
//       next();
//     };

//     const verifyCreator = async (req, res, next) => {
//       const userEmail = req.user.email;
//       const user = await usersCollection.findOne({ email: userEmail });
//       if (user?.role !== "contestCreator" && user?.role !== "admin") {
//         return res
//           .status(403)
//           .send({ message: "Forbidden access: Creator required" });
//       }
//       next();
//     };

//     // ১. JWT তৈরির API (লগইন-এর জন্য) - **আপডেট করা হলো**
//     app.post("/auth/jwt", async (req, res) => {
//       const { email } = req.body;
      
//       // ইউজারকে খুঁজে বের করে তার রোলটি টোকেনে যোগ করা
//       const user = await usersCollection.findOne({ email });
//       if (!user) {
//          return res.status(404).send({ message: "User not found" });
//       }

//       const token = jwt.sign(
//         { email: user.email, role: user.role }, // ডাটাবেস থেকে পাওয়া 'role' যোগ করা হলো
//         process.env.ACCESS_TOKEN_SECRET,
//         { expiresIn: "1h" }
//       );
//       
//       res.send({ success: true, token });
//     });

//     // ২. রেজিস্ট্রেশন API (পাসওয়ার্ড হ্যাশিং এবং রোল সেট করা)
//     app.post("/users", async (req, res) => {
//         const { name, email, password, photoURL } = req.body;

//         const exists = await usersCollection.findOne({ email });
//         if (exists) {
//             return res.status(400).send({ message: "User already exists" }); 
//         }

//         // পাসওয়ার্ড হ্যাশ করা
//         const salt = await bcrypt.genSalt(10);
//         const hashedPassword = await bcrypt.hash(password, salt);

//         const newUser = {
//             name,
//             email,
//             password: hashedPassword, 
//             photoURL,
//             role: "normalUser", // ডিফল্ট রোল
//             createdAt: new Date(),
//         };

//         const result = await usersCollection.insertOne(newUser);
        
//         // রেজিস্ট্রেশনের পর JWT তৈরি
//         const token = jwt.sign(
//             { email: newUser.email, role: newUser.role },
//             process.env.ACCESS_TOKEN_SECRET,
//             { expiresIn: "1h" }
//         );

//         res.send({ 
//             insertedId: result.insertedId,
//             message: "User registered successfully",
//             token // টোকেনটি ক্লায়েন্টকে পাঠানো হলো
//         });
//     });

//     // ৩. সিঙ্গেল ইউজার ডিটেইলস (লগইন করা ইউজারের নিজের জন্য)
//     // এই রুটটি ইউজার লগইন করার পরে তার প্রোফাইল ডেটা লোড করতে সাহায্য করবে
//     app.get("/users/:email", verifyToken, async (req, res) => {
//         const email = req.params.email;
//         // রিকোয়েস্ট করা ইমেইল এবং টোকেন থেকে আসা ইমেইল চেক করা
//         if (req.user.email !== email) {
//              return res.status(403).send({ message: "Forbidden access: Not your profile" });
//         }
//         const result = await usersCollection.findOne({ email });
//         res.send(result);
//     });

//     // GET all users
//     app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
//       try {
//         const users = await usersCollection.find().toArray();
//         res.send(users);
//       } catch (err) {
//         console.error(err);
//         res.status(500).send({ error: "Failed to fetch users" });
//       }
//     });

//     app.get("/users/:email", verifyToken, async (req, res) => {
//       const email = req.params.email;
//       // সিকিউরিটি চেক: টোকেনের ইমেইল এবং রিকোয়েস্টের ইমেইল এক কিনা
//       if (req.user.email !== email) {
//         return res.status(403).send({ message: "Forbidden access: Not your profile" });
//       }
//       const result = await usersCollection.findOne({ email });
//       res.send(result);
//     });

// // ৫. ইউজার প্রোফাইল আপডেট (TOKEN PROTECTED - নিজের প্রোফাইল)
//     app.patch("/users/:email", verifyToken, async (req, res) => {
//       const email = req.params.email;
//       // সিকিউরিটি চেক: টোকেনের ইমেইল এবং রিকোয়েস্টের ইমেইল এক কিনা
//       if (req.user.email !== email) {
//         return res.status(403).send({ message: "Forbidden access: Cannot edit other profiles" });
//       }
      
//       const result = await usersCollection.updateOne(
//         { email: email },
//         { $set: req.body } // যদি req.body-তে পাসওয়ার্ড থাকে, তবে সেটা হ্যাশ করা উচিত (এই লজিকটি আপনি পরে যোগ করতে পারেন)
//       );
//       if (result.matchedCount === 0)
//         return res.status(404).send("User not found");
//       res.send("Profile updated!");
//     });

//     // Contest Api
//     app.get("/contest", async (req, res) => {
//       const result = await contestCollection.find().toArray();
//       res.send(result);
//     });

//     app.get("/contest/popular", async (req, res) => {
//       try {
//         const result = await contestCollection
//           .aggregate([
//             {
//               $addFields: {
//                 participants: { $ifNull: ["$participants", 0] },
//               },
//             },
//             { $sort: { participants: -1 } },
//             { $limit: 5 },
//           ])
//           .toArray();

//         res.send(result);
//       } catch (err) {
//         console.error("Error in /contest/popular:", err);
//         res.status(500).send({ error: "Failed to fetch popular contests" });
//       }
//     });

//     app.get("/contest/:id", async (req, res) => {
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) };
//       const result = await contestCollection.findOne(query);
//       res.send(result);
//     });

//     app.get("/contest/search/:type", async (req, res) => {
//       const type = req.params.type;
//       const result = await contestCollection
//         .find({ type: { $regex: type, $options: "i" } })
//         .toArray();

//       res.send(result);
//     });

//     // F. কন্টেস্ট আপডেট (CREATOR PROTECTED)
//     app.patch("/contest/:id", verifyToken, verifyCreator, async (req, res) => {
//       const id = req.params.id;
//       const updatedData = req.body;

//       const existingContest = await contestCollection.findOne({ _id: new ObjectId(id) });
      
//       // শুধুমাত্র Creator এবং Pending অবস্থায় এডিট করা যাবে (Requirement)
//       if (existingContest.creatorEmail !== req.user.email && req.user.role !== 'admin') {
//          return res.status(403).send({ message: "Forbidden: Not authorized to edit this contest" });
//       }
//       if (existingContest.status !== 'pending' && req.user.role !== 'admin') {
//           return res.status(403).send({ message: "Forbidden: Cannot edit a confirmed or rejected contest." });
//       }
      
//       const result = await contestCollection.updateOne(
//         { _id: new ObjectId(id) },
//         { $set: updatedData }
//       );

//       if (result.matchedCount === 0) {
//         return res.status(404).send({ message: "Contest not found" });
//       }

//       res.send(result);
//     });

  

//     // G. কন্টেস্ট ডিলিট (CREATOR PROTECTED)
//     app.delete("/contest/:id", verifyToken, verifyCreator, async (req, res) => {
//       const id = req.params.id;
//       const query = { _id: new ObjectId(id) };
      
//       const existingContest = await contestCollection.findOne(query);

//       // ডিলিট করার আগে Creator এবং Status চেক করা
//       if (existingContest.creatorEmail !== req.user.email && req.user.role !== 'admin') {
//          return res.status(403).send({ message: "Forbidden: Not authorized to delete this contest" });
//       }
//       if (existingContest.status !== 'pending' && req.user.role !== 'admin') {
//           return res.status(403).send({ message: "Forbidden: Only pending contests can be deleted." });
//       }
      
//       const result = await contestCollection.deleteOne(query);
//       res.send(result);
//     });

//     // H. Creator-এর সকল কন্টেস্ট দেখা (CREATOR PROTECTED)
//     app.get("/contest/creator/:email", verifyToken, verifyCreator, async (req, res) => {
//       const email = req.params.email;
//       // সিকিউরিটি চেক
//       if (req.user.email !== email) {
//         return res.status(403).send({ message: "Forbidden access: Not your created contests" });
//       }
//       const result = await contestCollection
//         .find({ creatorEmail: email })
//         .sort({ createdAt: -1 })
//         .toArray();
//       res.send(result);
//     });


//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log(
//       "Pinged your deployment. You successfully connected to MongoDB!"
//     );
//   } finally {
//     // Ensures that the client will close when you finish/error
//     // await client.close();
//   }
// }
// run().catch(console.dir);

// app.get("/", (req, res) => {
//   res.send("ContestHub is running");
// });

// app.listen(port, () => {
//   console.log(`Example app listening on port ${port}`);
// });



const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000; // সাধারণত 5000 ব্যবহার করা হয়

// --- Middlewares ---
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173', 'আপনার_লাইভ_ক্লায়েন্ট_URL_এখানে'], // আপনার ক্লায়েন্ট URL যোগ করুন
    credentials: true
}));

// --- JWT Verification Middleware (run() এর বাইরে) ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res
            .status(401)
            .send({ message: "Unauthorized access: No token provided" });
    }
    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.error("JWT Verification Error:", err.message);
            return res
                .status(401)
                .send({ message: "Unauthorized access: Invalid token" });
        }
        req.user = decoded; // {email: '...', role: '...'}
        next();
    });
};

// --- MongoDB Setup ---
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5fdvbil.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        await client.connect();
        const db = client.db("contest_hub_db");
        const contestCollection = db.collection("contest");
        const usersCollection = db.collection("users");
        const participateCollection = db.collection("participations");

        // --- Role Verification Middleware (run() এর ভেতরে) ---
        const verifyAdmin = async (req, res, next) => {
            const userEmail = req.user.email;
            const user = await usersCollection.findOne({ email: userEmail });
            if (user?.role !== "admin") {
                return res
                    .status(403)
                    .send({ message: "Forbidden access: Admin required" });
            }
            next();
        };

        const verifyCreator = async (req, res, next) => {
            const userEmail = req.user.email;
            const user = await usersCollection.findOne({ email: userEmail });
            // Creator অথবা Admin-এর জন্য অ্যাক্সেস
            if (user?.role !== "contestCreator" && user?.role !== "admin") {
                return res
                    .status(403)
                    .send({ message: "Forbidden access: Creator required" });
            }
            next();
        };
        // ----------------------------------------------------

        // =========================================================
        // 🧩 AUTHENTICATION AND USER ROUTES
        // =========================================================

        // ১. JWT তৈরির API (লগইন বা সোশ্যাল সাইন-ইন-এর পর)
        app.post("/auth/jwt", async (req, res) => {
            const { email } = req.body;
            
            // ডাটাবেস থেকে ইউজার খুঁজে তার রোল নেওয়া হলো
            const user = await usersCollection.findOne({ email });
            if (!user) {
                return res.status(404).send({ message: "User not found" });
            }

            const token = jwt.sign(
                { email: user.email, role: user.role },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: "1h" }
            );

            res.send({ success: true, token });
        });

        // ২. রেজিস্ট্রেশন API (পাসওয়ার্ড হ্যাশিং এবং রোল সেট করা)
        app.post("/users", async (req, res) => {
            const { name, email, password, photoURL } = req.body;

            const exists = await usersCollection.findOne({ email });
            if (exists) {
                return res.status(400).send({ message: "User already exists" });
            }

            // পাসওয়ার্ড হ্যাশ করা
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const newUser = {
                name,
                email,
                password: hashedPassword,
                photoURL,
                role: "normalUser", // ডিফল্ট রোল
                createdAt: new Date(),
            };

            const result = await usersCollection.insertOne(newUser);

            // রেজিস্ট্রেশনের পর JWT তৈরি
            const token = jwt.sign(
                { email: newUser.email, role: newUser.role },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: "1h" }
            );

            res.send({
                insertedId: result.insertedId,
                message: "User registered successfully",
                token
            });
        });

        // ৩. অ্যাডমিন: সকল ইউজার দেখা (ADMIN PROTECTED)
        app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
            try {
                // এখানে pagination (Challenge Task) যোগ করা যেতে পারে
                const users = await usersCollection.find().toArray();
                res.send(users);
            } catch (err) {
                res.status(500).send({ error: "Failed to fetch users" });
            }
        });
        
        // ৪. ইউজার রোল পরিবর্তন করা (ADMIN PROTECTED)
        app.patch("/users/role/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const { role } = req.body; // নতুন রোল ('admin'/'contestCreator'/'normalUser')
            
            if (!['admin', 'contestCreator', 'normalUser'].includes(role)) {
                return res.status(400).send({ message: "Invalid role provided" });
            }
            
            const result = await usersCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { role: role } }
            );

            if (result.matchedCount === 0) {
                return res.status(404).send({ message: "User not found" });
            }
            res.send({ message: "User role updated successfully", modifiedCount: result.modifiedCount });
        });

        // ৫. সিঙ্গেল ইউজার ডিটেইলস (TOKEN PROTECTED - নিজের প্রোফাইল)
        app.get("/users/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            if (req.user.email !== email) {
                return res.status(403).send({ message: "Forbidden access: Not your profile" });
            }
            // পাসওয়ার্ড ছাড়া ইউজার ডিটেইলস পেতে প্রজেকশন ব্যবহার করা যেতে পারে
            const result = await usersCollection.findOne({ email }, { projection: { password: 0 } }); 
            if (!result) {
                 return res.status(404).send({ message: "User not found" });
            }
            res.send(result);
        });

        // ৬. ইউজার প্রোফাইল আপডেট (TOKEN PROTECTED - নিজের প্রোফাইল)
        app.patch("/users/:email", verifyToken, async (req, res) => {
            const email = req.params.email;
            if (req.user.email !== email) {
                return res.status(403).send({ message: "Forbidden access: Cannot edit other profiles" });
            }

            let updatedData = req.body;
            
            // পাসওয়ার্ড আপডেট করার অনুরোধ থাকলে, তাকে হ্যাশ করতে হবে
            if (updatedData.password) {
                const salt = await bcrypt.genSalt(10);
                updatedData.password = await bcrypt.hash(updatedData.password, salt);
            }

            const result = await usersCollection.updateOne(
                { email: email },
                { $set: updatedData }
            );
            if (result.matchedCount === 0)
                return res.status(404).send("User not found");
            res.send("Profile updated!");
        });

        // =========================================================
        // 📢 CONTEST ROUTES
        // =========================================================

        // A. সকল কন্টেস্ট দেখা (Public - শুধু Approved কন্টেস্ট দেখান)
        app.get("/contest", async (req, res) => {
            // এখানে pagination logic যোগ করা যেতে পারে (Challenge Task)
            const result = await contestCollection.find({ status: 'confirmed' }).toArray();
            res.send(result);
        });

        // B. Popular Contests (Public) - শুধু Approved কন্টেস্ট দেখান
        app.get("/contest/popular", async (req, res) => {
            try {
                const result = await contestCollection
                    .aggregate([
                        { $match: { status: 'confirmed' } },
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
        
        // C. সিঙ্গেল কন্টেস্ট ডিটেইলস (Public)
        app.get("/contest/:id", async (req, res) => {
            const id = req.params.id;
            // এখানে ObjectId ভ্যালিডেশন যোগ করা উচিত
            try {
                const query = { _id: new ObjectId(id) };
                const result = await contestCollection.findOne(query);
                if (!result) {
                    return res.status(404).send({ message: "Contest not found" });
                }
                res.send(result);
            } catch (error) {
                 res.status(400).send({ message: "Invalid Contest ID" });
            }
        });

        // D. নতুন কন্টেস্ট যোগ করা (CREATOR PROTECTED)
        app.post("/contest", verifyToken, verifyCreator, async (req, res) => {
            const contest = {
                ...req.body,
                creatorEmail: req.user.email,
                status: "pending", // তৈরির পর পেন্ডিং থাকবে
                participants: 0,
                createdAt: new Date(),
            };
            const result = await contestCollection.insertOne(contest);
            res.send(result);
        });

        // E. কন্টেস্ট আপডেট (CREATOR PROTECTED)
        app.patch("/contest/:id", verifyToken, verifyCreator, async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;

            const existingContest = await contestCollection.findOne({ _id: new ObjectId(id) });
            
            // নিরাপত্তা চেক:
            if (!existingContest) {
                return res.status(404).send({ message: "Contest not found" });
            }
            if (existingContest.creatorEmail !== req.user.email && req.user.role !== 'admin') {
                return res.status(403).send({ message: "Forbidden: Not authorized to edit this contest" });
            }
            // Admin ছাড়া অন্য কেউ Confirmed/Rejected কন্টেস্ট এডিট করতে পারবে না
            if (existingContest.status !== 'pending' && req.user.role !== 'admin') {
                return res.status(403).send({ message: "Forbidden: Cannot edit a confirmed or rejected contest." });
            }

            const result = await contestCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedData }
            );

            res.send(result);
        });

        // F. কন্টেস্ট ডিলিট (CREATOR PROTECTED)
        app.delete("/contest/:id", verifyToken, verifyCreator, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            
            const existingContest = await contestCollection.findOne(query);

            // নিরাপত্তা চেক:
            if (!existingContest) {
                return res.status(404).send({ message: "Contest not found" });
            }
            if (existingContest.creatorEmail !== req.user.email && req.user.role !== 'admin') {
                return res.status(403).send({ message: "Forbidden: Not authorized to delete this contest" });
            }
            // Admin ছাড়া অন্য কেউ Confirmed/Rejected কন্টেস্ট ডিলিট করতে পারবে না
            if (existingContest.status !== 'pending' && req.user.role !== 'admin') {
                return res.status(403).send({ message: "Forbidden: Only pending contests can be deleted." });
            }
            
            const result = await contestCollection.deleteOne(query);
            res.send(result);
        });

        // G. Creator-এর সকল কন্টেস্ট দেখা (CREATOR PROTECTED)
        app.get("/contest/creator/:email", verifyToken, verifyCreator, async (req, res) => {
            const email = req.params.email;
            if (req.user.email !== email) {
                return res.status(403).send({ message: "Forbidden access: Not your created contests" });
            }
            const result = await contestCollection
                .find({ creatorEmail: email })
                .sort({ createdAt: -1 })
                .toArray();
            res.send(result);
        });
        
        // =========================================================
        // 🛠️ ADMIN CONTEST MANAGEMENT ROUTES (ADMIN PROTECTED)
        // =========================================================
        
        // H. অ্যাডমিন: সকল কন্টেস্ট দেখা (Pending/Confirmed/Rejected)
        app.get("/admin/contests", verifyToken, verifyAdmin, async (req, res) => {
            const result = await contestCollection.find().sort({ createdAt: -1 }).toArray();
            res.send(result);
        });
        
        // I. অ্যাডমিন: কন্টেস্ট Approve/Reject করা
        app.patch("/admin/contests/status/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const { status } = req.body; // status: 'confirmed' বা 'rejected'
            
            if (!['confirmed', 'rejected'].includes(status)) {
                return res.status(400).send({ message: "Invalid status update" });
            }
            
            const result = await contestCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { status: status, approvedAt: new Date() } }
            );
            
            if (result.matchedCount === 0) {
                return res.status(404).send({ message: "Contest not found" });
            }
            res.send(result);
        });
        
        // J. অ্যাডমিন: কন্টেস্ট ডিলিট (Admin-এর জন্য বিশেষ রুট)
         app.delete("/admin/contests/:id", verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const result = await contestCollection.deleteOne({ _id: new ObjectId(id) });
            if (result.deletedCount === 0) {
                return res.status(404).send({ message: "Contest not found" });
            }
            res.send(result);
        });
        
        // =========================================================
        // 🏆 PARTICIPATION ROUTES
        // =========================================================
        
        // (এই সেকশনটি আপনার প্রয়োজন অনুযায়ী যোগ করতে হবে, যেমন:
        // app.post('/participate', verifyToken, ...), app.get('/my-participations', verifyToken, ...)
        // এই রুটে পেমেন্টের মাধ্যমে অংশগ্রহণ এবং টাস্ক জমা দেওয়ার লজিক থাকবে)
        
        // --- Connection Check ---
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // ...
    }
}
run().catch(console.dir);

// --- Base Route and Listener ---
app.get("/", (req, res) => {
    res.send("ContestHub Server is running smoothly");
});

app.listen(port, () => {
    console.log(`ContestHub app listening on port ${port}`);
});