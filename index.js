const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config();
const { createRemoteJWKSet, jwtVerify } = require('jose-cjs');

const mongodburi = process.env.MONGO_URI;

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(mongodburi, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        // Create database and idea collection
        const db = client.db('ideavault');
        const ideaCollection = db.collection('ideas');
        const commentsCollection = db.collection('comments');

        const JWKS = createRemoteJWKSet(
            new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
        );

        // Verify Token
        const verifyToken = async (request, response, next) => {
            const authHeader = request.headers.authorization;
            if (!authHeader) {
                response.status(401).json({message: "Unauthorized"});
            }
            
            const token = authHeader.split(" ")[1];

            if (!token) {
                response.status(401).json({ message: "Unauthorized" });
            }

            try {
                const { payload } = await jwtVerify(token, JWKS);
                console.log(payload);
                next()
            } catch (error) {
                return response.status(403).json({message:"forbidden"})
            }
        }

        // Find all idea
        app.get('/idea', async (request, response) => {
            const result = await ideaCollection.find().toArray();
            response.json(result);
        })

        // Insert single idea
        app.post('/idea', verifyToken, async (request, response) => {
            const ideaData = request.body;
            const result = await ideaCollection.insertOne(ideaData);
            response.json(result);
        })

        // Find single idea
        app.get('/idea/:ideaId', verifyToken, async (request, response) => {
            const { ideaId } = request.params;
            const result = await ideaCollection.findOne({ _id: new ObjectId(ideaId) });
            response.json(result);
        })

        // Find all comments for singe idea
        app.get('/comment/:ideaId', async (request, response) => {
            const { ideaId } = request.params;
            console.log("Fetching comments for ideaId:", ideaId);
            const result = await commentsCollection.find({ ideaId: ideaId }).toArray();
            response.json(result);
        })

        // Insert single comment
        app.post('/comment', verifyToken, async (request, response) => {
            const commentData = request.body;
            const finalCommentData = {
                ...commentData,
                ideaId: new ObjectId(commentData.ideaId),
                createdAt: new Date()
            };
            const result = await commentsCollection.insertOne(commentData);
            response.json(result);
        })

        // Find all ideas for posted by a single user
        app.get('/idea-by-user/:userId', async (request, response) => {
            const { userId } = request.params;
            const result = await ideaCollection.find({ userId: userId }).toArray();
            response.json(result);
        })

        // Delete single idea
        app.delete('/idea/:ideaId', async (request, response) => {
            const { ideaId } = request.params;
            console.log(ideaId);
            const result = await ideaCollection.deleteOne({ _id: new ObjectId(ideaId) });
            response.json(result);
        })

        // Update single idea details
        app.patch('/update-idea/:ideaId', verifyToken, async (request, response) => {
            const { ideaId } = request.params;
            const updatedData = request.body;
            console.log(ideaId);
            const result = await ideaCollection.updateOne(
                { _id: new ObjectId(ideaId) },
                { $set: updatedData }
            );
            response.json(result);
        });

        // Find all idea commented by a user
        app.get('/commented-idea/:userId', async (request, response) => {
            const { userId } = request.params;

            // Find user all comments by this user
            const comments = await commentsCollection.find({ userId }).toArray();
            
            // Extracting unique idea ids
            const ideaIds = [
                ...new Set(
                    comments.map(comment => new ObjectId(comment.ideaId))
                )
            ];

            // Find commented ideas
            const result = await ideaCollection.find({_id: { $in: ideaIds } }).toArray();
            response.send(result);
        });

        // Update single comment
        app.put('/comment/:commentId', async (request, response) => {
            const { commentId } = request.params;
            const updatedData = request.body;
            console.log(commentId);
            const result = await commentsCollection.updateOne(
                { _id: new ObjectId(commentId) },
                { $set: updatedData }
            );
            response.json(result);
        });

        // Delete single comment
        app.delete('/comment/:commentId', async (request, response) => {
            const { commentId } = request.params;
            console.log(commentId);
            const result = await commentsCollection.deleteOne({ _id: new ObjectId(commentId) });
            response.json(result);
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (request, response) => {
    response.send('Server is running fine')
})

app.listen(PORT, () => {
    console.log(`Server running on PORT ${PORT}`);
})