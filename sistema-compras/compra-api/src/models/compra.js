const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');


const Compra = sequelize.define('Compra', {
    
    id_compra: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false,
    },
    cliente: {
        type: DataTypes.STRING,
        allowNull: false,
        references: {
            model: 'cliente',
            key: 'id' //Change to real id
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
    },
    producto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'producto',
            key: 'id' //Change to real id
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
    },
    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 0 // Checks of >=0
        }
    },
    total: {
        type: DataTypes.NUMERIC(10, 2), 
        allowNull: false,
        validate: {
            min: 0 // Checks of >=0
        }
    },
    fecha: {
        type: DataTypes.DATE,
        allowNull: false,
    },
},  {
  tableName: 'compra',
  timestamps: true,
});

module.exports = Compra;
