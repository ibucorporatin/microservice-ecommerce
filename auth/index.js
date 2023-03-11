const express = require('express');
require('express-async-errors');
const mongoose = require('mongoose');
require('dotenv').config()
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./user.model');

const app = express();

app.use(express.json(process.env.MONGODB_URI));

const port = process.env.PORT ;

app.listen(port, () => {
  console.log(`Users Service at ${port}`);
});

const mongoUrl = process.env.MONGODB_URI ;
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('MongoDB connected');
  })
  .catch((err) => {
    console.log(err);
  });




app.post('/signup', async (req, res) => {
  console.log("it working signup")
 try {
  let { name, email, password } = req.body;
  password = await bcrypt.hash(password, 12);

  await User.create({ name, email, password });
  const payload = {
    email,
    name,
  };
  jwt.sign(payload, process.env.JWT_SECRET, (err, token) => {
    if (err) console.log(err);
    res.status(200).json({ token, name, email });
  });
 } catch (error) {
   console.log(error,"error")
 }
});

app.post('/signin', async (req, res) => {
  console.log("it working signin")
  try {
    let { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  if (await bcrypt.compare(password, user.password)) {
    const payload = {
      email: user.email,
      name: user.name,
    };
    jwt.sign(payload, process.env.JWT_SECRET, (err, token) => {
      if (err) console.log(err);
      res.status(200).json({ token, name: user.name, email });
    });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
  } catch (error) {
    console.log(error,"error")
  }
});