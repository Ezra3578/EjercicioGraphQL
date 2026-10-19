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