const Compra = require('../models/compra')

const generar_id_compra = require('../utils/utils')
const { obtenerCliente } = require('../services/clienteService')
const { obtenerProducto } = require('../services/productoService')

// GET /compras — devuelve todos los registros
const obtenerTodos = async (req, res) => {
  try {
    const compras = await Compra.findAll();
    res.json(compras);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las compras', detalle: error.message });
  }
};


// GET /compras/:id — devuelve un registro por su id_compra
const obtenerUno = async (req, res) => {
  try {
    const compra = await Compra.findByPk(req.params.id);
    if (!compra) {
      return res.status(404).json({ error: `No se encontró el compra con id_compra ${req.params.id}` });
    }
    res.json(compra);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la compra', detalle: error.message });
  }
};

// POST /compras — crea una nueva compra, el id_compra es autogenerado
const crear = async (req, res) => {
  try {
    const { clienteId, productoId, cantidad } = req.body;
    let cliente;
    let producto;

    if (!clienteId || !productoId || !cantidad) {
      return res.status(400).json({ error: 'cliente, producto y cantidad son obligatorios' });
    }

    try {
      cliente = await obtenerCliente(clienteId);
      producto = await obtenerProducto(productoId);
    } catch (error) {
      return res.status(503).json({
        mensaje: "No se pudo validar la compra porque uno de los servicios no respondió",
        detalle: error.message,
        cliente,
        producto
      });
    }

    if (!cliente) {
      return res.status(404).json({ mensaje: `El cliente ${clienteId} no existe` });
    }

    if (!producto) {
      return res.status(404).json({ mensaje: `El producto ${productoId} no existe` });
    }

    if (producto.stock < cantidad) {
      return res.status(400).json({
        mensaje: `Stock insuficiente. Disponible: ${producto.stock}, solicitado: ${cantidad}`
      });
    }

    const total = producto.precio * cantidad;
    const fecha = new Date().toISOString();
    const id_compra = generar_id_compra(cliente.id, fecha) //poner el id real de cliente

    try {
      // Si ya existe una compra con ese id_compra, Sequelize lanzará un error de clave duplicada
      const nueva = await Compra.create({ id_compra, cliente: cliente.id, producto: producto.id, cantidad, total, fecha });
      res.status(201).json(nueva);

    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(409).json({ error: `Ya existe una compra con id_compra ${req.body.id_compra}` });
      }
      res.status(500).json({ error: 'Error al crear la compra', detalle: error.message });
    }
  } catch (error) {
    console.error(error);

    res.status(500).json({
      mensaje: "Error al crear la compra"
    });
  }
}

// PUT /compras/:id — actualiza una compra sin modificar su identificador
const actualizar = async (req, res) => {
  try {
    const compra = await Compra.findByPk(req.params.id);
    if (!compra) {
      return res.status(404).json({
        error: `No se encontró la compra con id_compra ${req.params.id}`
      });
    }

    const { cliente, producto, cantidad } = req.body;
    if (cliente === undefined && producto === undefined && cantidad === undefined) {
      return res.status(400).json({
        error: 'Debe proporcionar al menos un campo para actualizar'
      });
    }

    const clienteId = cliente === undefined ? compra.cliente : cliente;
    const productoId = producto === undefined ? compra.producto : producto;
    const nuevaCantidad = cantidad === undefined ? compra.cantidad : cantidad;

    if (!Number.isInteger(Number(nuevaCantidad)) || Number(nuevaCantidad) <= 0) {
      return res.status(400).json({ error: 'cantidad debe ser un entero mayor que cero' });
    }

    let clienteValidado;
    let productoValidado;
    try {
      [clienteValidado, productoValidado] = await Promise.all([
        obtenerClienteDB(clienteId),
        obtenerProductoDB(productoId)
      ]);
    } catch (error) {
      return res.status(503).json({
        mensaje: 'No se pudo validar la compra porque uno de los servicios no respondió',
        detalle: error.message
      });
    }

    if (!clienteValidado) {
      return res.status(404).json({ mensaje: `El cliente ${clienteId} no existe` });
    }
    if (!productoValidado) {
      return res.status(404).json({ mensaje: `El producto ${productoId} no existe` });
    }
    if (productoValidado.stock < nuevaCantidad) {
      return res.status(400).json({
        mensaje: `Stock insuficiente. Disponible: ${productoValidado.stock}, solicitado: ${nuevaCantidad}`
      });
    }

    await compra.update({
      cliente: clienteId,
      producto: productoId,
      cantidad: nuevaCantidad,
      total: productoValidado.precio * nuevaCantidad
    });

    res.json(compra);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar la compra', detalle: error.message });
  }
};

// DELETE /compras/:id — elimina una compra por su identificador
const eliminar = async (req, res) => {
  try {
    const compra = await Compra.findByPk(req.params.id);
    if (!compra) {
      return res.status(404).json({
        error: `No se encontró la compra con id_compra ${req.params.id}`
      });
    }

    await compra.destroy();
    res.json({ mensaje: 'Compra eliminada', eliminada: compra });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la compra', detalle: error.message });
  }
};

module.exports = { obtenerTodos, obtenerUno, crear, actualizar, eliminar };
