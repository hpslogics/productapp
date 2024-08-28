'use strict';
module.exports = (sequelize, DataTypes) => {
    const Product = sequelize.define('Product', {
        name: DataTypes.STRING,
        type: DataTypes.STRING,
        description: DataTypes.TEXT
    }, {});
    return Product;
};
