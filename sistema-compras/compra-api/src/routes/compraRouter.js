const express = require('express');
const comprasRouter = express.Router();
const {
  obtenerTodos,
  obtenerUno,
  crear,
  actualizar,
  eliminar,
} = require('../controllers/compraController');

comprasRouter.get('/',          obtenerTodos);
comprasRouter.get('/:id',     obtenerUno);
comprasRouter.post('/',         crear);
comprasRouter.put('/:id',     actualizar);
comprasRouter.delete('/:id',  eliminar);

module.exports = comprasRouter;