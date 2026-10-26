# Guía práctica: Gateway GraphQL sobre un sistema de microservicios de compras

## Un solo punto de entrada para consultar y operar tres microservicios REST independientes

---

## Contexto previo

En guías anteriores construimos un **sistema de microservicios de compras** compuesto por tres APIs REST independientes, cada una con su propia tabla en una base de datos:

| Microservicio   | Puerto | Responsabilidad              |
|-----------------|--------|------------------------------|
| `cliente-api`   | 3001   | CRUD de clientes             |
| `producto-api`  | 3002   | CRUD de productos            |
| `compra-api`    | 3003   | Registro y gestión de compras|

Cada microservicio corre en su propio contenedor Docker y se orquesta con `docker-compose`. En esta guía **no tocaremos absolutamente nada de esos microservicios**. La idea es demostrar que se puede montar GraphQL sobre un sistema previamente construido: GraphQL no accede a bases de datos, solamente consume los endpoints de las APIs REST existentes.

---

## Objetivos de aprendizaje

Con esta guía buscamos que el estudiante logre:

- Entender la diferencia entre una API REST (muchos endpoints) y una API GraphQL (un solo endpoint).
- Definir un schema con tipos, consultas (`Query`) y modificaciones (`Mutation`) que reflejen los dominios de un sistema de microservicios.
- Implementar resolvers que consuman endpoints REST existentes sin tocar su código ni sus bases de datos.
- Integrar GraphQL con Express usando `express-graphql`.
- Contenerizar el gateway GraphQL con Docker y conectarlo a los microservicios que corren en el host.
- Probar consultas en las que el cliente elige qué campos quiere recibir.

---

## 1. De REST a GraphQL

En las guías anteriores cada operación tenía su propia ruta (`GET /clientes`, `POST /compras`, `GET /productos/:id`...). Para obtener los datos completos de una compra (con la información del cliente y del producto), era necesario hacer **varias peticiones a diferentes microservicios** y ensamblar la respuesta manualmente.

En GraphQL **toda la API vive en un solo endpoint**, `/graphql`, y lo que antes repartíamos en `routes/` ahora se divide en dos piezas:

- **Schema** (`typeDefs.js`): el contrato. Define qué tipos existen (`Cliente`, `Producto`, `Compra`) y qué se puede consultar (`Query`) o modificar (`Mutation`).
- **Resolvers** (`resolvers.js`): las funciones que responden cada operación del schema. Aquí es donde se hacen los `fetch` a cada microservicio REST.

| REST (microservicios separados)                             | GraphQL (gateway unificado)                                  |
|-------------------------------------------------------------|--------------------------------------------------------------|
| `GET /clientes`, `GET /productos`, `GET /compras`           | `Query { clientes, productos, compras }`                     |
| `GET /clientes/:id`, `GET /productos/:id`, `GET /compras/:id` | `Query { buscarCliente(id), buscarProducto(id), buscarCompra(id) }` |
| `POST /clientes`, `POST /productos`, `POST /compras`        | `Mutation { crearCliente(...), crearProducto(...), crearCompra(...) }` |
| Tres puertos distintos (3001, 3002, 3003)                    | Un solo puerto (4000) con un solo endpoint `/graphql`        |
| El cliente debe conocer cada URL                             | El cliente habla solo con el gateway                         |

### ¿Qué papel cumple cada librería?

- **express** es el servidor web: recibe peticiones HTTP, maneja rutas y puertos. Por sí solo no entiende GraphQL.
- **graphql** es la implementación de GraphQL: construye el schema, valida las consultas y ejecuta los resolvers.
- **express-graphql** es el puente entre los dos: monta GraphQL sobre una ruta de Express y, además, ofrece **GraphiQL**, un explorador en el navegador para probar consultas.

### ¿Por qué un servidor aparte?

Es fundamental que el gateway GraphQL sea un **servidor independiente**, no integrado dentro de ninguno de los microservicios. Si lo metiéramos dentro de `compra-api` o `cliente-api`, estaríamos creando un monolito disfrazado: un servicio que sabe demasiado y que acopla responsabilidades que deberían estar separadas.

En nuestro caso, la carpeta `Graphql/` vive **fuera** de la carpeta `sistema-compras/` (donde están los microservicios), dentro del mismo repositorio. Esto sigue el patrón de **monorepositorio**: todo el código está en un solo repositorio, pero cada servicio es independiente y desplegable por separado.

```
API-REST-microservicios/           ← raíz del monorepositorio
├── sistema-compras/               ← microservicios (NO se tocan)
│   ├── cliente-api/
│   ├── producto-api/
│   ├── compra-api/
│   └── docker-compose.yml
└── Graphql/                       ← gateway GraphQL (lo que construimos aquí)
    ├── src/
    ├── index.js
    ├── Dockerfile
    └── ...
```

---

## 2. Estructura del proyecto

```
Graphql/
├── node_modules/                # lo genera npm install (no se sube a git)
├── src/
│   ├── typeDefs.js              # schema: tipos, Query, Mutation
│   └── resolvers.js             # lógica que consume los endpoints REST
├── index.js                     # Express + express-graphql (servidor)
├── Dockerfile                   # imagen Docker del gateway
├── .dockerignore                # archivos que Docker ignora al copiar
├── .env                         # variables de entorno (URLs de los microservicios)
├── .env.example                 # plantilla del .env para el equipo
├── .gitignore
├── package.json
└── package-lock.json
```

Noten que **no hay carpeta `data/`**, **ni `routes/`**, **ni modelos**, **ni conexión a base de datos**. Este servidor no persiste nada: su única responsabilidad es recibir consultas GraphQL y traducirlas en peticiones HTTP a los microservicios que ya existen.

---

## 3. Inicialización

> **Importante**: todos los comandos de esta sección se ejecutan **dentro de la carpeta `Graphql/`**. No se tocará absolutamente nada del código de los microservicios en `sistema-compras/`.

```bash
mkdir Graphql
cd Graphql
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
  "start": "node index.js",
  "dev": "nodemon index.js"
}
```

### Variables de entorno

Archivo `.env` (y el mismo contenido en `.env.example`):

```
PORT=4000
CLIENTE_API_URL=http://host.docker.internal:3001
PRODUCTO_API_URL=http://host.docker.internal:3002
COMPRA_API_URL=http://host.docker.internal:3003
```

<!-- Las URLs usan `host.docker.internal` en lugar de `localhost` porque el gateway
     corre dentro de un contenedor Docker. Desde dentro del contenedor, `localhost`
     apunta al propio contenedor, no a la máquina host. `host.docker.internal` es
     un DNS especial de Docker que resuelve a la IP de la máquina host, permitiendo
     que el contenedor del gateway alcance los microservicios que corren en los
     puertos 3001, 3002 y 3003 de la máquina host. -->

> **¿Por qué `host.docker.internal` y no `localhost`?**
> El gateway corre dentro de un contenedor Docker. Desde ahí, `localhost` apunta al propio contenedor, no a la máquina real. `host.docker.internal` es un DNS especial de Docker que resuelve a la IP de la máquina host, permitiendo que el contenedor alcance los microservicios que corren en los puertos 3001, 3002 y 3003 del host.

Archivo `.gitignore`:

```
node_modules
.env
```

---

## 4. Schema

Archivo `src/typeDefs.js`:

```javascript
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
```

**Puntos clave**

- `buildSchema` convierte el texto del schema en un objeto que GraphQL puede ejecutar.

- El `!` significa "obligatorio, no puede ser `null`".

- El `!` en un atributo de un type, significa que al consultar ese atributo, siempre debe retornar un valor no `null`.

- En un query como lo es `buscarCliente(id: String!)`, se utiliza el `!` para que el usuario sí o sí deba pasar un `id`, de lo contrario dará error.

- El retorno `[Cliente!]` indica una lista donde ningún elemento interno puede ser `null`, pero la lista misma sí puede serlo (podría retornar `null` si no hay datos). En contraste, `[Compra!]!` en `compraPorNombreCliente` indica que la lista siempre existe (incluso vacía `[]`), nunca será `null`, y ningún elemento interno podrá ser `null`.

- **Tipos anidados**: el type `Compra` contiene `cliente: Cliente!` y `producto: Producto!`. Esto es lo que le da el poder a GraphQL: en una sola consulta se puede pedir la compra junto con los datos completos del cliente y del producto, algo que en REST requeriría múltiples peticiones manuales.

- Los types reflejan exactamente lo que devuelven los microservicios REST. Si el microservicio de clientes devuelve `{ id, nombre, email }`, nuestro type `Cliente` tiene exactamente esos campos.

---

## 5. Resolvers

Archivo `src/resolvers.js`:

```javascript
const resolvers = {


    // -------- primero la lógica de cada query ---------------

    clientes: async () => {

        const respuesta = await fetch(`${process.env.CLIENTE_API_URL}/clientes`);

        if (respuesta.status === 404) {
            return null;
        }

        if (!respuesta.ok) {
            throw new Error(`cliente-api respondió con estado ${respuesta.status}`);
        }

        return respuesta.json();
    },


    productos: async () => {
        const respuesta = await fetch(`${process.env.PRODUCTO_API_URL}/productos`);

        if (respuesta.status === 404) {
            return null;
        }

        if (!respuesta.ok) {
            throw new Error(`producto-api respondió con estado ${respuesta.status}`);
        }

        return respuesta.json();
    },

    compras: async () => {
        const respuesta = await fetch(`${process.env.COMPRA_API_URL}/compras`);

        if (respuesta.status === 404) {
            return null;
        }

        if (!respuesta.ok) {
            throw new Error(`compra-api respondió con estado ${respuesta.status}`);
        }

        const compras = await respuesta.json();

        //recorro  cada compra y pido su cliente y producto
        const comprasConDetalles = await Promise.all(
            compras.map(async compra => {
                const cliente = await fetch(`${process.env.CLIENTE_API_URL}/clientes/${compra.cliente}`);
                const clienteData = await cliente.json();
                const producto = await fetch(`${process.env.PRODUCTO_API_URL}/productos/${compra.producto}`);
                const productoData = await producto.json();
                return {
                    ...compra,
                    cliente: clienteData,
                    producto: productoData
                };
            })
        );

        return comprasConDetalles;
    },

    buscarCliente: async ({ id }) => {
        const respuesta = await fetch(`${process.env.CLIENTE_API_URL}/clientes/${id}`);

        if (respuesta.status === 404) {
            return null;
        }

        if (!respuesta.ok) {
            throw new Error(`cliente-api respondió con estado ${respuesta.status}`);
        }

        return respuesta.json();
    },

    buscarProducto: async ({ id }) => {
        const respuesta = await fetch(`${process.env.PRODUCTO_API_URL}/productos/${id}`);

        if (respuesta.status === 404) {
            return null;
        }

        if (!respuesta.ok) {
            throw new Error(`producto-api respondió con estado ${respuesta.status}`);
        }

        return respuesta.json();
    },

    buscarCompra: async ({ id }) => {
        const respuesta = await fetch(`${process.env.COMPRA_API_URL}/compras/${id}`);


        if (respuesta.status === 404) {
            return null;
        }

        if (!respuesta.ok) {
            throw new Error(`compra-api respondió con estado ${respuesta.status}`);
        }

        const compra = await respuesta.json();

        const cliente = await fetch(`${process.env.CLIENTE_API_URL}/clientes/${compra.cliente}`);
        const producto = await fetch(`${process.env.PRODUCTO_API_URL}/productos/${compra.producto}`);

        if (!cliente.ok || !producto.ok) {
            throw new Error('No fue posible obtener el cliente o el producto');
        }


        // este return crea un objeto nuevo con las propiedades de compra y después agrega las propiedades cliente y producto
        return {
            ...compra,
            cliente: await cliente.json(),
            producto: await producto.json()
        };
    },


    compraPorNombreCliente: async ({ nombre }) => {

        //obtengo el cliente para extraer su nombre
        const cliente = await fetch(`${process.env.CLIENTE_API_URL}/clientes`)

        // si no fue exitoso
        if (!cliente.ok) {
            throw new Error(`cliente-api respondió con estado ${cliente.status}`);
        }

        // convierto a json pa extraer el ide del cliente
        const clienteData = await cliente.json();

        const clienteEncontrado = clienteData.find(
            cliente => cliente.nombre.toLowerCase() === nombre.toLowerCase()
        )

        // si no se encontro el cliente
        if (!clienteEncontrado) {
            return [];
        }

        const idCliente = clienteEncontrado.id;

        // obtengo todas las compras registradas
        const respuesta = await fetch(`${process.env.COMPRA_API_URL}/compras`)

        // verifico si la respuesta fue exitosa
        if (respuesta.status === 404) {
            return [];
        }

        if (!respuesta.ok) {
            throw new Error(`compra-api respondió con estado ${respuesta.status}`);
        }

        //  convierto a json pa extraer el id de los clientes
        const compras = await respuesta.json();

        // Filtro las compras que tengan el id del cliente
        const comprasCliente = compras.filter(
            compra => String(compra.cliente) === String(idCliente)
        );

        //recorro cada compra y extraigo el producto y retorno el producto y el cliente dentro de la respuesta
        const comprasConDetalles = await Promise.all(
            comprasCliente.map(async compra => {
                const producto = await fetch(`${process.env.PRODUCTO_API_URL}/productos/${compra.producto}`);
                const productoData = await producto.json();
                return {
                    ...compra,
                    producto: productoData,
                    cliente: clienteEncontrado
                };
            })
        );

        // Si hay compras con ese nombre
        return comprasConDetalles;
    },


    // ----------- luego las mutations ------------
    crearCliente: async ({ id, nombre, email }) => {

        const respuesta = await fetch(`${process.env.CLIENTE_API_URL}/clientes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id,
                nombre,
                email
            }),
        });

        if (!respuesta.ok) {
            throw new Error(`cliente-api respondió con estado ${respuesta.status}`);
        }

        return respuesta.json();
    },

    crearProducto: async ({ id, nombre, precio, stock }) => {

        const respuesta = await fetch(`${process.env.PRODUCTO_API_URL}/productos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id,
                nombre,
                precio,
                stock
            }),
        });

        if (!respuesta.ok) {
            throw new Error(`producto-api respondió con estado ${respuesta.status}`);
        }

        return respuesta.json();
    },

    crearCompra: async ({ cliente, producto, cantidad }) => {

        const respuesta = await fetch(`${process.env.COMPRA_API_URL}/compras`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                clienteId: cliente,
                productoId: producto,
                cantidad
            }),
        });

        if (!respuesta.ok) {
            throw new Error(`compra-api respondió con estado ${respuesta.status}`);
        }

        const compra = await respuesta.json();

        const producto_Res = await fetch(`${process.env.PRODUCTO_API_URL}/productos/${compra.producto}`);
        const cliente_Res = await fetch(`${process.env.CLIENTE_API_URL}/clientes/${compra.cliente}`);

        if (!producto_Res.ok || !cliente_Res.ok) {
            throw new Error('No fue posible obtener el cliente o el producto');
        }

        return {
            ...compra,
            producto: await producto_Res.json(),
            cliente: await cliente_Res.json()
        };

    },

};

module.exports = resolvers;
```

**Puntos clave**

- Con `buildSchema` y `express-graphql`, los resolvers se escriben en un **objeto plano**: consultas y mutaciones van al mismo nivel, sin agruparlas en `Query` y `Mutation`. El nombre de cada función debe coincidir exactamente con el nombre del campo en el schema.

- Cada resolver recibe los **argumentos como primer parámetro**. Por eso escribimos `({ id })` para sacar directamente el `id` que vino en la consulta.

- No validamos a mano que los campos obligatorios vengan en la petición: el `!` del schema ya hace esa validación, y GraphQL rechaza la operación antes de llegar al resolver. En REST esto lo hacíamos con un `if` y un `400`.

- **Los resolvers no tocan bases de datos**. Solo hacen `fetch` a los endpoints REST de los microservicios. Si mañana los microservicios cambian de base de datos, de ORM, o de lenguaje, los resolvers no necesitan cambiar: solo consumen HTTP.

- **Composición de datos**: en los resolvers de `compras`, `buscarCompra` y `compraPorNombreCliente`, se hacen múltiples `fetch` para ensamblar la respuesta. Por ejemplo, una compra almacena solo el `id` del cliente y del producto; el resolver se encarga de ir a buscar los datos completos a los otros microservicios. Esto es exactamente el trabajo de un **API Gateway**.

- **Mapeo de nombres**: nótese en `crearCompra` que el schema usa `cliente` y `producto` como nombres de argumentos, pero el body que se envía al microservicio usa `clienteId` y `productoId`, porque eso es lo que espera la API REST de compras. El resolver actúa como traductor.

---

## 6. Servidor

Archivo `index.js` (en la raíz de `Graphql/`, no dentro de `src/`):

```javascript
require("dotenv").config();

const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const schema = require("./src/typeDefs");
const resolvers = require("./src/resolvers");

const app = express();

app.use("/graphql", graphqlHTTP({
    schema: schema,         //contrato
    rootValue: resolvers,   //logica
    graphiql: true,         //interfaz en el navegador
}));

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Graphql API corriendo en http://localhost:${PORT}/graphql`);
});
```

**Puntos clave**

- Este archivo es el **punto de entrada** del gateway. Aquí se centralizan el schema y los resolvers: se importan desde `src/` y se entregan al middleware de GraphQL.

- `graphqlHTTP` es el middleware que convierte la ruta `/graphql` en un endpoint GraphQL.

- `schema` es el contrato (los tipos, queries y mutations definidos en `typeDefs.js`).

- `rootValue` es donde se entregan los resolvers (las funciones que resuelven cada operación).

- `graphiql: true` habilita **GraphiQL**, un explorador interactivo en el navegador donde se pueden escribir consultas, ver el schema y usar autocompletado. Se accede navegando a `http://localhost:4000/graphql`.

- No necesitamos `app.use(express.json())` para la ruta de GraphQL: `express-graphql` lee el cuerpo de la petición por su cuenta.

- `require("dotenv").config()` carga las variables del archivo `.env` al inicio, antes de que cualquier resolver intente usar `process.env`.

---

## 7. Dockerfile

Archivo `Dockerfile` (en la raíz de `Graphql/`):

```dockerfile
# Imagen base de Node.js
FROM node:22-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --omit=dev

# Copiar el código de GraphQL
COPY . .

# Puerto del servidor GraphQL
EXPOSE 4000

# Iniciar el servidor
CMD ["node", "index.js"]
```

**Puntos clave**

- Se usa `node:22-alpine` como imagen base: es ligera (~50 MB) y suficiente para Node.js.
- `COPY package*.json ./` + `RUN npm ci` se hacen **antes** de copiar el código. Esto aprovecha la caché de capas de Docker: si no cambian las dependencias, Docker reutiliza la capa y no reinstala paquetes.
- `--omit=dev` excluye `nodemon` y otras dependencias de desarrollo del contenedor de producción.
- `EXPOSE 4000` es documentativo; el puerto real se mapea con `-p` al hacer `docker run`.
- `CMD ["node", "index.js"]` arranca directamente con Node (sin `nodemon`), que es lo correcto en producción.

---

## 8. Ejecución

### Prerrequisito: los microservicios deben estar corriendo

Antes de levantar el gateway, asegúrense de que los tres microservicios estén activos. Desde la carpeta `sistema-compras/`:

```bash
docker compose up
```

### Construir la imagen del gateway

Estos comandos se ejecutan **dentro de la carpeta `Graphql/`**:

```bash
docker build -t graphql-img:1.0 .
```

### Ejecutar el contenedor

```bash
docker run -d --name graphql-gateway --add-host=host.docker.internal:host-gateway --env-file ./.env -p 4000:4000 graphql-img:1.0
```

**Desglose del comando:**

| Flag | Significado |
|------|-------------|
| `-d` | Ejecuta el contenedor en segundo plano (detached). |
| `--name graphql-gateway` | Le asigna un nombre al contenedor para identificarlo fácilmente. |
| `--add-host=host.docker.internal:host-gateway` | **Clave**: agrega una entrada en el `/etc/hosts` del contenedor que mapea `host.docker.internal` a la IP del host real. Esto permite que las URLs del `.env` (como `http://host.docker.internal:3001`) resuelvan correctamente desde dentro del contenedor hacia los microservicios que corren en la máquina host. Sin esta flag, el contenedor no podría alcanzar los puertos 3001, 3002 y 3003 del host. |
| `--env-file ./.env` | Inyecta las variables de entorno del archivo `.env` al contenedor. |
| `-p 4000:4000` | Mapea el puerto 4000 del host al puerto 4000 del contenedor. |
| `graphql-img:1.0` | La imagen que construimos en el paso anterior. |

Deberían poder acceder a GraphiQL en: `http://localhost:4000/graphql`

---

## 9. Pruebas

### Desde el navegador (GraphiQL)

Abran `http://localhost:4000/graphql`. Gracias a `graphiql: true` aparece un editor donde pueden escribir consultas, ejecutarlas con el botón de play, ver el schema en la documentación lateral y usar autocompletado.

---

### 9.1 Mutations: poblar el sistema

Primero creamos los datos. En GraphQL las operaciones de escritura se llaman **mutations**.

#### Crear 3 clientes

```graphql
mutation {
  crearCliente(id: "1001", nombre: "Camila Torres", email: "camila@mail.com") {
    id
    nombre
    email
  }
}
```

```graphql
mutation {
  crearCliente(id: "1002", nombre: "Andrés Ríos", email: "andres@mail.com") {
    id
    nombre
    email
  }
}
```

```graphql
mutation {
  crearCliente(id: "1003", nombre: "Valentina López", email: "valentina@mail.com") {
    id
    nombre
    email
  }
}
```

> Noten que después del paréntesis de argumentos viene un bloque `{ }` donde se eligen los campos que queremos ver en la respuesta. Si solo quisiéramos ver el `id`, bastaría con poner `{ id }`.

#### Crear 3 productos

```graphql
mutation {
  crearProducto(id: 1, nombre: "Teclado mecánico", precio: 189000.50, stock: 25) {
    id
    nombre
    precio
    stock
  }
}
```

```graphql
mutation {
  crearProducto(id: 2, nombre: "Mouse inalámbrico", precio: 75000.00, stock: 40) {
    id
    nombre
    precio
    stock
  }
}
```

```graphql
mutation {
  crearProducto(id: 3, nombre: "Monitor 27 pulgadas", precio: 1250000.00, stock: 10) {
    id
    nombre
    precio
    stock
  }
}
```

#### Crear 3 compras

```graphql
mutation {
  crearCompra(cliente: "1001", producto: 1, cantidad: 2) {
    id_compra
    cantidad
    total
    fecha
    cliente {
      nombre
      email
    }
    producto {
      nombre
      precio
    }
  }
}
```

```graphql
mutation {
  crearCompra(cliente: "1002", producto: 3, cantidad: 1) {
    id_compra
    cantidad
    total
    cliente {
      nombre
    }
    producto {
      nombre
      precio
    }
  }
}
```

```graphql
mutation {
  crearCompra(cliente: "1001", producto: 2, cantidad: 5) {
    id_compra
    total
    cliente {
      nombre
    }
    producto {
      nombre
    }
  }
}
```

> **Aquí se ve el poder de GraphQL**: en una sola mutation de `crearCompra`, la respuesta ya trae los datos completos del cliente y del producto anidados. En REST, la respuesta de `POST /compras` solo devolvería los IDs, y habría que hacer peticiones adicionales a los otros microservicios.

---

### 9.2 Queries: consultar los datos

#### Listar todos los clientes (pidiendo solo algunos campos)

```graphql
query {
  clientes {
    id
    nombre
  }
}
```

Esta es la gran ventaja frente a REST: el cliente decide qué campos recibe. En REST, `GET /clientes` siempre devuelve el objeto completo con todos los campos.

#### Listar todos los productos

```graphql
query {
  productos {
    nombre
    precio
    stock
  }
}
```

#### Listar todas las compras (con datos anidados)

```graphql
query {
  compras {
    id_compra
    cantidad
    total
    fecha
    cliente {
      nombre
      email
    }
    producto {
      nombre
      precio
    }
  }
}
```

> Esta consulta demuestra la composición: con un solo request se obtiene cada compra con su cliente y producto completos. En REST esto requeriría: 1) pedir todas las compras, 2) por cada compra, pedir el cliente, 3) por cada compra, pedir el producto.

#### Buscar un cliente por ID

```graphql
query {
  buscarCliente(id: "1001") {
    id
    nombre
    email
  }
}
```

#### Buscar un producto por ID

```graphql
query {
  buscarProducto(id: 2) {
    id
    nombre
    precio
    stock
  }
}
```

#### Buscar una compra por ID

```graphql
query {
  buscarCompra(id: "PEGAR_AQUI_UN_ID_COMPRA_REAL") {
    id_compra
    cantidad
    total
    fecha
    cliente {
      nombre
    }
    producto {
      nombre
      precio
    }
  }
}
```

> Reemplacen `"PEGAR_AQUI_UN_ID_COMPRA_REAL"` por un `id_compra` obtenido de las mutations anteriores o de la consulta `compras`.

#### Buscar compras por nombre de cliente

```graphql
query {
  compraPorNombreCliente(nombre: "Camila Torres") {
    id_compra
    cantidad
    total
    fecha
    cliente {
      nombre
    }
    producto {
      nombre
      precio
    }
  }
}
```

> Como Camila Torres (id `1001`) hizo dos compras (teclado y mouse), esta consulta debería retornar una lista con dos elementos.

#### Recurso inexistente

```graphql
query {
  buscarCliente(id: "9999") {
    nombre
  }
}
```

Respuesta esperada:

```json
{ "data": { "buscarCliente": null } }
```

En GraphQL, un recurso inexistente se representa con `null`, que es la forma idiomática (en lugar del `404` que usaríamos en REST).

#### Campo obligatorio faltante

```graphql
mutation {
  crearCliente(id: "1004", nombre: "Solo nombre") {
    id
  }
}
```

GraphQL responde con un error en `errors` indicando que falta el argumento `email`, sin llegar a ejecutar el resolver. El `!` en el schema hace la validación automáticamente.

---

## 10. Cuando el proyecto crece

Si más adelante el gateway crece para cubrir más dominios (por ejemplo, `envíos`, `pagos`, `inventario`), la convención es organizar `src/` por dominio, separando el schema y los resolvers de cada entidad:

```
src/
├── cliente/
│   ├── cliente.typeDefs.js
│   └── cliente.resolvers.js
├── producto/
│   ├── producto.typeDefs.js
│   └── producto.resolvers.js
├── compra/
│   ├── compra.typeDefs.js
│   └── compra.resolvers.js
└── index.js        # une todos los typeDefs y resolvers
```

Para este proyecto, con tres tipos estrechamente relacionados, los dos archivos `typeDefs.js` y `resolvers.js` son suficientes. Pero cuando el schema empiece a tener decenas de types y resolvers, mantenerlo todo en un solo archivo se vuelve difícil de mantener. La separación por dominio permite que cada equipo trabaje en su parte sin conflictos.

---

## 11. Buenas prácticas aplicadas en esta guía

- El schema y los resolvers viven en archivos separados: uno define el contrato y el otro la lógica.
- El gateway no accede a ninguna base de datos: consume exclusivamente endpoints HTTP. Si un microservicio cambia internamente, el gateway no se entera.
- La validación de campos obligatorios se delega al schema (`!`) en lugar de repetirla en el código de los resolvers.
- Un recurso inexistente se representa con `null`, que es la forma idiomática en GraphQL.
- Los microservicios no fueron modificados. El gateway es un consumidor más de sus APIs, igual que lo sería un frontend.
- El gateway corre en su propio contenedor Docker, completamente desacoplado de los contenedores de los microservicios.
- Las URLs de los microservicios se configuran con variables de entorno, lo que facilita cambiar entre ambientes (desarrollo, staging, producción) sin tocar código.

---

## Ejercicios propuestos

- Agregar las mutaciones `actualizarCompra(id: String!, cliente: String, producto: Int, cantidad: Int): Compra!` y `eliminarCompra(id: String!): Compra` consumiendo los endpoints PUT y DELETE del microservicio de compras.
- Agregar un query `productosPorRangoDePrecio(min: Float!, max: Float!): [Producto!]!` que obtenga todos los productos y filtre por rango de precio en el resolver.
- Implementar una consulta `comprasPorProducto(productoId: Int!): [Compra!]!` que dado el id de un producto, retorne todas las compras que incluyen ese producto, enriquecidas con los datos del cliente.
- Agregar el gateway GraphQL al `docker-compose.yml` de `sistema-compras/` para que se levante junto con los microservicios con un solo comando.
- Migrar el servidor de `express-graphql` a `graphql-http` y comparar qué cambia en la configuración (pista: GraphiQL ya no viene incluido).
