function generar_id_compra(id_cliente, fecha){ 
    //id_compra sera //id_cliente-año-mes-dia-hora-minuto-segundo
    const d = new Date(fecha);

    const año = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    const hora = String(d.getHours()).padStart(2, '0');
    const minuto = String(d.getMinutes()).padStart(2, '0');
    const segundo = String(d.getSeconds()).padStart(2, '0');

    return `${id_cliente}-${año}-${mes}-${dia}-${hora}-${minuto}-${segundo}`;
}


module.exports = generar_id_compra;