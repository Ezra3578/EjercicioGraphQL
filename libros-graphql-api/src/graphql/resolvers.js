const libros = require("../data/libros");

let siguienteId = 3;

const resolvers = {
  // Consultas (Query)
  libros: () => libros,

  libro: ({ id }) => libros.find((libro) => libro.id === id),

  librosPorAutor: ({ autor }) =>
    libros.filter((libro) =>
      libro.autor.toLowerCase().includes(autor.toLowerCase())
    ),

  // Modificaciones (Mutation)
  crearLibro: (args) => {
    const nuevoLibro = { id: String(siguienteId++), ...args };
    libros.push(nuevoLibro);
    return nuevoLibro;
  }
};

module.exports = resolvers;