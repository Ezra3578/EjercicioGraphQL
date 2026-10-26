require("dotenv").config();

const app = require("./src/app");
const sequelize = require("./src/config/database");

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // verifica la conexión a la base de datos
        await sequelize.authenticate();
        console.log("Conexión a la base de datos exitosa");

        // sincroniza los modelos con la base de datos
        await sequelize.sync();
        console.log("Base de datos sincronizada");

        // Inicia el servidor (las rutas manejadas por app serán escuchadas en el puerto del .env)
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en el puerto ${PORT}`);
        });
    } catch (error) {
        console.error("Error al conectar a la base de datos:", error);
        process.exit(1); // sale del proceso con error para que docker lo detecte y reinicie
    }
}

startServer();

