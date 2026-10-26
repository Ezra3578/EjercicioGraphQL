# Imagen base: Node.js 20 en Alpine Linux (imagen mínima, ~50MB)
FROM node:20-alpine

# Directorio de trabajo dentro del contenedor
# Todos los comandos siguientes se ejecutan desde aquí
WORKDIR /app

# Copiar primero solo los archivos de dependencias
# Esto aprovecha el caché de Docker: si package.json no cambió,
# no se vuelve a ejecutar npm install en el siguiente build
COPY package.json ./

# Instalar dependencias
RUN npm install --omit=dev

# Copiar el resto del código
COPY . .

# Documentar el puerto que expone el contenedor
# (no publica el puerto — eso se hace al ejecutar con -p)
EXPOSE 3001

# Comando que se ejecuta al iniciar el contenedor
CMD ["node", "index.js"]