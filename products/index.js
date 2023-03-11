const express = require('express');
require('express-async-errors');
const mongoose = require('mongoose');
require('dotenv').config()
const isAuthenticated = require('./isAuthenticated');
const Product = require('./product.model');
const amqp = require('amqplib');


let channel;

async function connect() {
  const amqpServer = process.env.RABBITMQ_URL;
  const connection = await amqp.connect(amqpServer);
  channel = await connection.createChannel();
  await channel.assertQueue('PRODUCT');
}
connect();
const app = express();

app.use(express.json());

const port = process.env.PORT ;

const mongoUrl = process.env.MONGODB_URI ;
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => {
    console.log(err);
  });

app.listen(port, () => {
  console.log(`Products Service at ${port}`);
});

app.get('/products', async (req, res) => {
  console.log("buy get products")
 try {
  const results = await Product.find().lean();
 console.log("products",results)
  res.status(200).json(results);
 } catch (error) {
  res.status(200).json(error);
 }
});

app.post('/products', isAuthenticated, async (req, res) => {
  console.log("buy createproducts")
try {
  const { name, price, description, imageURL } = req.body;

  const product = await Product.create({
    name,
    price,
    description,
    imageURL,
    creator: req.user.email,
  });

  res.status(200).json(product);
} catch (error) {
  res.status(200).json(error);
}
});

app.post('/products/buy', isAuthenticated, async (req, res) => {
  console.log("buy products")
 try {
  const { ids } = req.body;
  const products = await Product.find({ _id: { $in: ids } }).lean();
  let order;
console.log(products,req.user.email)
  channel.sendToQueue(
    'ORDER1',
    Buffer.from(
      JSON.stringify({
        products,
        userEmail: req.user.email,
      })
    )
  );

  await channel.consume('PRODUCT1', data => {
    console.log("it working")
    order = JSON.parse(data.content.toString());
    console.log(order)
  });
  
  res.json(products);
 } catch (error) {
   console.log(error,"error")
   res.json(error);
 }
});
