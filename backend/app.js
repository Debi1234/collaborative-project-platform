const express = require("express");
const userRoutes = require("./routes/user.route");
const projectRoutes = require("./routes/project.route");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const morgan = require("morgan");
app.use(morgan("dev"));
const cookieParser = require("cookie-parser");
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cors = require("cors");
app.use(cors());

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.use('/user', userRoutes);
app.use('/project', projectRoutes);
app.use('/ai', require('./routes/ai.route'));

module.exports = app;