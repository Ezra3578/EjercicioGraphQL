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