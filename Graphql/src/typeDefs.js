const { buildSchema } = require('graphql');

const schema = buildSchema(`

    type Cliente {
        id: String!
        nombre: String!
        email: String
    }
    
    type Producto {
        id: Int!    
        nombre: String!
        precio: Float!
        stock: Int
    }
    
    type Compra {
        id_compra: String!
        cliente: Cliente!
        producto: Producto!
        cantidad: Int!
        total: Float!
        fecha: String!
    }


    type Query {
        clientes: [Cliente!]
        productos: [Producto!]
        compras: [Compra!]

        buscarCliente(id: String!): Cliente
        buscarProducto(id: Int!): Producto
        buscarCompra(id: String!): Compra

        compraPorNombreCliente (nombre: String!): [Compra!]!
    }

    type Mutation {
        crearCliente(id: String!, nombre: String!, email: String!): Cliente!
        crearProducto(id: Int!, nombre: String!, precio: Float!, stock: Int!): Producto!
        crearCompra(cliente: String!, producto: Int!, cantidad: Int!): Compra!
    }

`);

module.exports = schema;