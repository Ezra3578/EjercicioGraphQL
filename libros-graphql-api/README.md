# Guía práctica: API de libros con GraphQL, Node.js y Express

## Consultas flexibles sobre un catálogo de libros con express-graphql

---

## Objetivos de aprendizaje

Con esta guía buscamos que el estudiante logre:

- Entender la diferencia entre una API REST (muchos endpoints) y una API GraphQL (un solo endpoint).
- Definir un schema con tipos, consultas (`Query`) y modificaciones (`Mutation`).
- Implementar resolvers que respondan a cada operación del schema.
- Integrar GraphQL con Express usando `express-graphql`.
- Probar consultas en las que el cliente elige qué campos quiere recibir.

---

## 1. De REST a GraphQL

En las guías anteriores cada operación tenía su propia ruta (`GET /libros`, `GET /libros/:id`, `POST /libros`...). En GraphQL **toda la API vive en un solo endpoint**, `/graphql`, y lo que antes repartíamos en `routes/` ahora se divide en dos piezas:

- **Schema**: el contrato. Define qué tipos existen (`Libro`) y qué se puede consultar (`Query`) o modificar (`Mutation`).
- **Resolvers**: las funciones que responden cada operación del schema. Cumplen el papel que antes tenían las funciones dentro de `router.get(...)`.

| REST                              | GraphQL                                         |
|-----------------------------------|-------------------------------------------------|
| `routes/libros.routes.js`         | `graphql/typeDefs.js` + `graphql/resolvers.js`  |
| `GET /libros`, `GET /libros/:id`  | `Query { libros, libro(id) }`                   |
| `POST`, `PUT`, `DELETE`           | `Mutation { crearLibro, ... }`                  |
| `data/`                           | `data/` (no cambia)                             |
| Respuesta 404                     | El campo devuelve `null`                        |

### ¿Qué papel cumple cada librería?

- **Express** es el servidor web: recibe peticiones HTTP, maneja rutas y puertos. Por sí solo no entiende GraphQL.
- **graphql** es la implementación de GraphQL: construye el schema, valida las consultas y ejecuta los resolvers.
- **express-graphql** es el puente entre los dos: monta GraphQL sobre una ruta de Express y, además, ofrece **GraphiQL**, un explorador en el navegador para probar consultas.

---

## 2. Estructura del proyecto

```
libros-graphql-api/
├── node_modules/                # lo genera npm install (no se sube a git)
├── src/
│   ├── data/
│   │   └── libros.js            # datos en memoria
│   ├── graphql/
│   │   ├── typeDefs.js          # schema: tipos, Query, Mutation
│   │   └── resolvers.js         # lógica que resuelve cada operación
│   └── server.js                # Express + express-graphql
├── .env
├── .env.example
├── .gitignore
├── package.json
└── package-lock.json
```

Noten que desaparece la carpeta `routes/` y aparece `graphql/`. La carpeta `data/` se mantiene igual que en REST: GraphQL cambia la forma de exponer los datos, no la forma de guardarlos.

---

## 3. Inicialización

```bash
mkdir libros-graphql-api
cd libros-graphql-api
npm init -y
npm install express express-graphql graphql@15 dotenv
npm install --save-dev nodemon
```

> **Nota sobre versiones:** `express-graphql` es compatible con `graphql` versión 15, no con la 16. Por eso instalamos `graphql@15`. Si ya tienen la 16 y npm muestra un error `ERESOLVE`, ejecuten `npm install graphql@15`.
>
> `express-graphql` está deprecado (dejó de recibir mantenimiento; su reemplazo oficial es `graphql-http`). Para fines de aprendizaje funciona sin problema y tiene la ventaja de traer GraphiQL integrado. En un proyecto real convendría usar una librería mantenida, como `graphql-http` o Apollo Server.

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
```

**Puntos clave**

- `buildSchema` convierte el texto del schema en un objeto que GraphQL puede ejecutar.

- El `!` significa "obligatorio, no puede ser `null`".

- El `!` en un atributo de un type, significa que al consultar ese atributo, siempre debe retorar un valor no `null`

- En un query como lo es `libro(id: ID!)`, se utiliza el `!` para que el usuario si o si deba poner un id, de lo contrario dara error.

- El retorno de una lista de types se ve de esta forma: `[Libro!]!` consta de una lista con `!` indica que siempre existe incluso si esta vacía, pero no retornara como null. Su elemento interno indica que la lista no podra tener un elemento null o generara error. 

---

## 6. Resolvers

Archivo `src/graphql/resolvers.js`:

```javascript
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
```

**Puntos clave**

- Con `buildSchema` y `express-graphql`, los resolvers se escriben en un **objeto plano**: consultas y mutaciones van al mismo nivel, sin agruparlas en `Query` y `Mutation`. El nombre de cada función debe coincidir exactamente con el nombre del campo en el schema.
- Cada resolver recibe los **argumentos como primer parámetro**. Por eso escribimos `({ id })` para sacar directamente el `id` que vino en la consulta.
- No validamos a mano que `titulo` y `autor` vengan en la petición: el `!` del schema ya hace esa validación, y GraphQL rechaza la operación antes de llegar al resolver. En REST esto lo hacíamos con un `if` y un `400`.

---

## 7. Servidor

Archivo `src/server.js`:

```javascript
require("dotenv").config();
const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const schema = require("./graphql/typeDefs");
const resolvers = require("./graphql/resolvers");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  "/graphql",
  graphqlHTTP({
    schema,               // el contrato
    rootValue: resolvers, // la lógica
    graphiql: true        // explorador en el navegador
  })
);

app.get("/", (req, res) => {
  res.status(200).json({ mensaje: "libros-graphql-api activa" });
});

app.listen(PORT, () => {
  console.log(`API GraphQL en http://localhost:${PORT}/graphql`);
});
```

**Puntos clave**

- `graphqlHTTP` es el middleware que convierte la ruta `/graphql` en un endpoint GraphQL.
- `rootValue` es donde se entregan los resolvers.
- No necesitamos `app.use(express.json())` para esta ruta: `express-graphql` lee el cuerpo de la petición por su cuenta.
- La ruta `GET /` es una ruta normal de Express. Esto muestra que GraphQL y las rutas tradicionales pueden convivir en el mismo servidor.

---

## 8. Ejecución

```bash
npm run dev
```

Deberían ver en consola: `API GraphQL en http://localhost:4000/graphql`.

---

## 9. Pruebas

### Desde el navegador (GraphiQL)

Abran `http://localhost:4000/graphql`. Gracias a `graphiql: true` aparece un editor donde pueden escribir consultas, ejecutarlas con el botón de play, ver el schema en la documentación lateral y usar autocompletado.

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

### Campo obligatorio faltante

```graphql
mutation {
  crearLibro(titulo: "Sin autor") {
    id
  }
}
```

GraphQL responde con un error en `errors` indicando que falta el argumento `autor`, sin llegar a ejecutar el resolver.

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
- Migrar el servidor de `express-graphql` a `graphql-http` y comparar qué cambia.