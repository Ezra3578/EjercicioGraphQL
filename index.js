const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');

const database = [
    { id: "1", name: "Pawan", email: "pawan@gmail.com" },
    { id: "2", name: "akash", email: "akash@gmail.com" },
]

const schema = buildSchema(
    `
        type User {
            id: String
            name: String
            email: String
        }

        type Query {
            users: [User]!
        }

        type Mutation {
            createUser(id: String!, name: String!, email: String!): Boolean
        }

    `
)


const root = {
    users: () => database || null,
    createUser: ({ id, name, email }) => {
        if(database[id]) return false;
        database[id] = { id, name, email }
        return true;
    }
}

const app = express();

app.use(
    '/graphql',
    graphqlHTTP({
        schema: schema,
        rootValue: root,
        graphiql: true
    })
)

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`app is running on http://localhost:${PORT}/graphql`);
});
