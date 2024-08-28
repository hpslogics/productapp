'use strict';
module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        confirmedAt: DataTypes.DATE // This will initially be null and updated upon confirmation
    }, {
        tableName: 'Users', // explicitly set table name
        freezeTableName: true // prevent Sequelize from pluralizing the table name
    });
    return User;
};
