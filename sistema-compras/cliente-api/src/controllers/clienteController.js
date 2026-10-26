// Lógica de negocio de este microservicio cliente

const Cliente = require("../models/cliente");

// GET /clientes
const obtenerTodos = async (req, res) => {
    try {
        const clientes = await Cliente.findAll();
        res.status(200).json(clientes);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener los clientes" });
    }
}

// GET /clientes/:id
const obtenerUno = async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            return res.status(404).json({ error: "Cliente no encontrado" });
        }
        res.status(200).json(cliente);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener el cliente" });
    }
}

// POST /clientes
const crear = async (req, res) => {
    try {
        const { id, nombre, email } = req.body;
        if (!id || !nombre || !email) {
            return res.status(400).json({ error: "Cedula, nombre e email son obligatorios" });
        }
        const cliente = await Cliente.create({ id, nombre, email });
        res.status(201).json(cliente);
    } catch (error) {
        res.status(500).json({ error: "Error al crear el cliente" });
    }
}

// PUT /clientes/:id
const actualizar = async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            return res.status(404).json({ error: "Cliente no encontrado" });
        }

        const { nombre, email } = req.body;
        if (!nombre && !email) {
            return res.status(400).json({ error: "Es obligatorio al menos un campo: Nombre y/o email" });
        }

        await cliente.update({ nombre, email });
        res.status(200).json(cliente);
    } catch (error) {
        res.status(500).json({ error: "Error al actualizar el cliente" });
    }
}

// DELETE /clientes/:id
const eliminar = async (req, res) => {
    try {
        const cliente = await Cliente.findByPk(req.params.id);
        if (!cliente) {
            return res.status(404).json({ error: "Cliente no encontrado" });
        }
        await cliente.destroy();
        res.json({ message: "Cliente eliminado correctamente" });
    } catch (error) {
        res.status(500).json({ error: "Error al eliminar el cliente" });
    }
}

module.exports = {
    obtenerTodos,
    obtenerUno,
    crear,
    actualizar,
    eliminar
};
