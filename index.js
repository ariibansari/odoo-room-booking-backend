const express = require('express');
const createError = require('http-errors');
const morgan = require('morgan');
const cors = require("cors");
const corsOptions = require('./config/corsOptions');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan('dev'));

app.use(cors(corsOptions))

app.use('/api/auth', require('./routes/auth.route'));
app.use('/api/user', require('./routes/user.route'));



app.use((req, res, next) => {
    next(createError.NotFound());
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server Started!`));