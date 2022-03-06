const express = require('express');
const connectDB = require('./config/db');
var cors = require('cors')
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

//connecting the db first
connectDB();

app.use(bodyParser.json());
app.use(cors());

app.get('/', async (req, res) => {
  res.json({ msg: "Reunion test" });
});

//defining routes
app.use('/api', require('./routes/api/users'));
app.use('/api/authenticate', require('./routes/api/auth'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, ()=> console.log("Server started on port " +  PORT));
