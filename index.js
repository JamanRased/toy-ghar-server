const express = require('express');
const ObjectId = require('mongodb').ObjectId;
const admin = require("firebase-admin");
const cors = require('cors');

const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


app.use(cors());
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vrvfx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {
        }
    }
    next();
}

async function run(){
    try{
        await client.connect();
        console.log('Connect The Database');

        const database = client.db("toydb");
        const productsCollection = database.collection("products");
        const bookingCollection = database.collection("booking");
        const reviewCollection = database.collection("review");
        const usersCollection = database.collection('users');
        
        //Get API
        app.get('/products', async(req, res) => {
            const cursor = productsCollection.find({});
            const services = await cursor.toArray();
            res.send(services);
        })
        //Get Single Order
        app.get('/products/:id', async(req, res)=>{
            const id = req.params.id;

            const query = {_id: ObjectId(id)};
            const service = await productsCollection.findOne(query);
            res.json(service);
        })

        //POST API
        app.post('/products', async(req,res) => {
            const service = req.body;
            console.log('Submitted Api', service)

            const result= await productsCollection.insertOne(service);
            console.log(result);
            res.json(result)
        });
        //DELET API
        app.delete('/products/:id', async(req, res)=>{
            const id = req.params.id;
            console.log('DELET A SINGLE Service');

            const query = {_id: ObjectId(id)};
            const result = await productsCollection.deleteOne(query);
            res.json(result);
        })
        //Confirm Order
        app.post('/confirmOrder', async(req,res) => {
            const booking = req.body;
            console.log('Submitted Order', booking)

            const result= await bookingCollection.insertOne(booking);
            console.log(result);
            res.json(result)
        });
        app.get("/myOrders/:email", async (req, res) => {
            const result = await bookingCollection.find({ email: req.params.email })
              .toArray();
            res.send(result);
          });
        // delete order
        app.delete('/booking/:id', async(req, res)=>{
            const id = req.params.id;
            console.log('DELET A SINGLE Product');
            const query = {_id: ObjectId(id)};
            const result = await bookingCollection.deleteOne(query);
            res.json(result);
        });
        //review GET
       app.get('/review', async(req, res) => {
        const cursor = reviewCollection.find({});
        const products = await cursor.toArray();
        res.send(products);
    })
        //Review Post 
        app.post('/review', async(req,res) => {
            const review = req.body;
            console.log('Submitted Api', review)
            const result= await reviewCollection.insertOne(review);
            console.log(result);
            res.json(result)
        });
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        });

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        app.put('/users/admin', async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            
                // const requesterAccount = await usersCollection.findOne({ email: requester });
                // if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
            })
        }
    finally{
        //await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Running The Server');
});

app.listen(port, () =>{
    console.log("Hello ", port);
})
