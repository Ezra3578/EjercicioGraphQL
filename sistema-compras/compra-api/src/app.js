const express = require('express');
const app = express();

app.use(express.json());

// Rutas
const compraRouter = require('./routes/compraRouter');
app.use('/compras', compraRouter);

// Para agregar más entidades en el futuro:
// const otraRoutes = require('./routes/otraRoutes');
// app.use('/otra', otraRoutes);

module.exports = app;