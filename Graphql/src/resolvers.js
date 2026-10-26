const resolvers = {


    // -------- primero la solgica de cada query ---------------

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

