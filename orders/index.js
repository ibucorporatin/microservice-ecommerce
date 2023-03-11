const express = require('express');
require('express-async-errors');
const mongoose = require('mongoose');
const isAuthenticated = require('./isAuthenticated');
require('dotenv').config()
const Order = require('./order.model.js');
const amqp = require('amqplib');

const mongoUrl = process.env.MONGODB_URI ;
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected');

let channel;

async function createOrder(products, userEmail) {
 
  const total = products.reduce((accumulator, currentProduct) => {
    return accumulator + +currentProduct.price;
  }, 0);
 const productsI = products.map(product => {
    return product._id;
  });
// console.log("products",products)
// console.log(productsI)
// console.log("total",total)
try {
  const newOrder = await Order.create({
    products: productsI,
    creator: userEmail,
    totalPrice: total,
  });
  console.log(newOrder)
  return newOrder;
} catch (error) {
  console.log("error in here",error.message)
}
// console.log(total)
  
}

async function connect() {
  const amqpServer = process.env.RABBITMQ_URL;
  const connection = await amqp.connect(amqpServer);
  channel = await connection.createChannel();
  await channel.assertQueue('ORDER1');
  
}

connect().then(() => {
  channel.consume('ORDER1', data => {
    // console.log(JSON.parse(data.content.toString()))
    console.log('Consuming ORDER service');
    const { products, userEmail } = JSON.parse(data.content.toString());

 
    createOrder(products, userEmail).then(async(newOrder) => {
        channel.ack(data);
    
        channel.sendToQueue(
          'PRODUCT1',
          Buffer.from(JSON.stringify({ newOrder }))
        );
      })
      .catch(err => {
        console.log(err);
      });
  });
});


})
.catch((err) => {
  console.log(err);
});
const app = express();

app.use(express.json());

const port = process.env.PORT ;



app.get('/orders', async (req, res) => {
  console.log("oreder works")
  const results = await Order.find();

  res.status(200).json(results);
});

app.listen(port, () => {
  console.log(`Orders Service at ${port}`);
});
