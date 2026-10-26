
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
