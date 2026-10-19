# Guía práctica: API de libros con GraphQL, Node.js y Express

## Consultas flexibles sobre un catálogo de libros

---

## Objetivos de aprendizaje

Con esta guía buscamos que el estudiante logre:

- Entender la diferencia entre una API REST (muchos endpoints) y una API GraphQL (un solo endpoint).
- Definir un schema con tipos, consultas (`Query`) y modificaciones (`Mutation`).
- Implementar resolvers que respondan a cada operación del schema.
- Integrar Apollo Server con Express.
- Probar consultas en las que el cliente elige qué campos quiere recibir.

---

## 1. De REST a GraphQL

En las guías anteriores cada operación tenía su propia ruta (`GET /libros`, `GET /libros/:id`, `POST /libros`...). En GraphQL **toda la API vive en un solo endpoint**, `/graphql`, y lo que antes repartíamos en `routes/` ahora se divide en dos piezas:

- **Schema (`typeDefs`)**: el contrato. Define qué tipos existen (`Libro`) y qué se puede consultar (`Query`) o modificar (`Mutation`).
- **Resolvers**: las funciones que responden cada operación del schema. Cumplen el papel que antes tenían las funciones dentro de `router.get(...)`.

| REST                              | GraphQL                                         |
|-----------------------------------|-------------------------------------------------|
| `routes/libros.routes.js`         | `graphql/typeDefs.js` + `graphql/resolvers.js`  |
| `GET /libros`, `GET /libros/:id`  | `Query { libros, libro(id) }`                   |
| `POST`, `PUT`, `DELETE`           | `Mutation { crearLibro, ... }`                  |
| `data/`                           | `data/` (no cambia)                             |
| Respuesta 404                     | El campo devuelve `null`                        |

---

## 2. Estructura del proyecto

```
libros-graphql-api/
├── src/
│   ├── data/
│   │   └── libros.js            # datos en memoria
│   ├── graphql/
│   │   ├── typeDefs.js          # schema: tipos, Query, Mutation
│   │   └── resolvers.js         # lógica que resuelve cada operación
│   └── server.js                # Express + Apollo Server
├── .env
├── .env.example
├── .gitignore
└── package.json
```

Noten que desaparece la carpeta `routes/` y aparece `graphql/`. La carpeta `data/` se mantiene igual que en REST: GraphQL cambia la forma de exponer los datos, no la forma de guardarlos.

---

## 3. Inicialización

```bash
mkdir libros-graphql-api
cd libros-graphql-api
npm init -y
npm install express @apollo/server @as-integrations/express5 graphql dotenv
npm install --save-dev nodemon
```

¿Qué instala cada paquete?

- `express`: el servidor web que ya conocemos.
- `@apollo/server`: el servidor GraphQL.
- `@as-integrations/express5`: el puente entre Apollo Server y Express 5. Desde Apollo Server 5 esta integración ya no viene incluida en `@apollo/server`, sino en un paquete aparte (para Express 4 existe `@as-integrations/express4`).
- `graphql`: la implementación base de GraphQL que Apollo necesita.
- `dotenv`: variables de entorno.

Scripts en `package.json`:

```json
"scripts": {
  "start": "node src/server.js",
  "dev": "nodemon src/server.js"
}
```

### Variables de entorno

Archivo `.env` (y el mismo contenido en `.env.example`):

```
PORT=4000
```

Archivo `.gitignore`:

```
node_modules/
.env
```

---

## 4. Datos en memoria

Archivo `src/data/libros.js`:

```javascript
let libros = [
  {
    id: "1",
    titulo: "Cien años de soledad",
    autor: "Gabriel García Márquez",
    anio: 1967,
    genero: "Realismo mágico",
    paginas: 471
  },
  {
    id: "2",
    titulo: "La vorágine",
    autor: "José Eustasio Rivera",
    anio: 1924,
    genero: "Novela",
    paginas: 320
  }
];

module.exports = libros;
```

Los `id` son strings porque el tipo `ID` de GraphQL se serializa como texto.

---

## 5. Schema

Archivo `src/graphql/typeDefs.js`:

```javascript
const typeDefs = `#graphql
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
`;

module.exports = typeDefs;
```

**Puntos clave**

- El `!` significa "obligatorio, no puede ser `null`".
- `libro(id)` devuelve `Libro` sin `!`: si el libro no existe, la respuesta es `null`. Es el equivalente al 404 de REST.
- `[Libro!]!` se lee como "una lista que siempre existe (aunque esté vacía) y cuyos elementos nunca son `null`".
- El comentario `#graphql` al inicio solo sirve para que el editor resalte la sintaxis.

---

## 6. Resolvers

Archivo `src/graphql/resolvers.js`:

```javascript
const libros = require("../data/libros");

let siguienteId = 3;

const resolvers = {
  Query: {
    libros: () => libros,

    libro: (_, { id }) => libros.find((libro) => libro.id === id),

    librosPorAutor: (_, { autor }) =>
      libros.filter((libro) =>
        libro.autor.toLowerCase().includes(autor.toLowerCase())
      )
  },

  Mutation: {
    crearLibro: (_, args) => {
      const nuevoLibro = { id: String(siguienteId++), ...args };
      libros.push(nuevoLibro);
      return nuevoLibro;
    }
  }
};

module.exports = resolvers;
```

**Puntos clave**

- La estructura del objeto `resolvers` debe coincidir con el schema: `Query.libros`, `Query.libro`, `Mutation.crearLibro`...
- Cada resolver recibe `(parent, args, context, info)`. En este ejemplo solo usamos `args`, que son los parámetros definidos en el schema. El primer parámetro lo nombramos `_` porque no lo necesitamos.
- No validamos a mano que `titulo` y `autor` vengan en la petición: el `!` del schema ya hace esa validación, y GraphQL rechaza la operación antes de llegar al resolver. En REST esto lo hacíamos con un `if` y un `400`.

---

## 7. Servidor

Archivo `src/server.js`:

```javascript
require("dotenv").config();
const express = require("express");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@as-integrations/express5");
const typeDefs = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");

const PORT = process.env.PORT || 4000;

async function iniciar() {
  const app = express();
  const server = new ApolloServer({ typeDefs, resolvers });

  // Es obligatorio iniciar Apollo antes de montar el middleware
  await server.start();

  app.use("/graphql", express.json(), expressMiddleware(server));

  app.get("/", (req, res) => {
    res.status(200).json({ mensaje: "libros-graphql-api activa" });
  });

  app.listen(PORT, () => {
    console.log(`API GraphQL en http://localhost:${PORT}/graphql`);
  });
}

iniciar();
```

Como `server.start()` es asíncrono y debe terminar antes de usar `expressMiddleware`, todo el arranque va dentro de una función `async`.

---

## 8. Ejecución

```bash
npm run dev
```

Deberían ver en consola: `API GraphQL en http://localhost:4000/graphql`.

---

## 9. Pruebas

### Desde el navegador

Abran `http://localhost:4000/graphql`. Apollo muestra un explorador (Apollo Sandbox) donde pueden escribir consultas, ver el schema y autocompletar campos.

### Listar todos los libros, pidiendo solo algunos campos

```graphql
query {
  libros {
    titulo
    autor
  }
}
```

### Consultar un libro por id

```graphql
query {
  libro(id: "1") {
    titulo
    anio
    paginas
  }
}
```

Esta es la gran ventaja frente a REST: el cliente decide qué campos recibe. En REST, `GET /libros/1` siempre devuelve el objeto completo.

### Libro inexistente

```graphql
query {
  libro(id: "99") {
    titulo
  }
}
```

Respuesta esperada:

```json
{ "data": { "libro": null } }
```

### Buscar por autor

```graphql
query {
  librosPorAutor(autor: "garcía") {
    titulo
    anio
  }
}
```

### Crear un libro

```graphql
mutation {
  crearLibro(
    titulo: "El amor en los tiempos del cólera"
    autor: "Gabriel García Márquez"
    anio: 1985
    genero: "Novela"
  ) {
    id
    titulo
  }
}
```

### Con curl

En GraphQL todas las operaciones se envían por `POST` al mismo endpoint, con la consulta dentro del cuerpo JSON:

```bash
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ libros { titulo autor } }"}'
```

---

## 10. Cuando el proyecto crece

Si más adelante agregan otras entidades (por ejemplo un tipo `Autor` aparte), la convención es organizar `graphql/` por entidad:

```
src/graphql/
├── libro/
│   ├── libro.typeDefs.js
│   └── libro.resolvers.js
├── autor/
│   ├── autor.typeDefs.js
│   └── autor.resolvers.js
└── index.js        # une todos los typeDefs y resolvers
```

Para este ejemplo, con un solo tipo, los dos archivos `typeDefs.js` y `resolvers.js` son suficientes.

---

## 11. Buenas prácticas aplicadas en esta guía

- El schema y los resolvers viven en archivos separados: uno define el contrato y el otro la lógica.
- Los datos están en su propia carpeta, independientes de GraphQL.
- La validación de campos obligatorios se delega al schema (`!`) en lugar de repetirla en el código.
- Un recurso inexistente se representa con `null`, que es la forma idiomática en GraphQL.
- El puerto se configura con variables de entorno.

---

## Ejercicios propuestos

- Agregar las mutaciones `actualizarLibro(id, ...)` y `eliminarLibro(id)`.
- Agregar una consulta `librosPorGenero(genero: String!)`.
- Crear un tipo `Autor` con su propia lista de libros y reorganizar la carpeta `graphql/` por entidad.
