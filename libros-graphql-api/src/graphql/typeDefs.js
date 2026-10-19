const { buildSchema } = require("graphql");

const schema = buildSchema(`
  type Libro {
    id: ID!
    titulo: String!
    autor: String!
    anio: Int
    genero: String
    paginas: Int
  }

  type Query {
    libros: [Libro!]!
    libro(id: ID!): Libro
    librosPorAutor(autor: String!): [Libro!]!
  }

  type Mutation {
    crearLibro(
      titulo: String!
      autor: String!
      anio: Int
      genero: String
      paginas: Int
    ): Libro!
  }
`);

module.exports = schema;