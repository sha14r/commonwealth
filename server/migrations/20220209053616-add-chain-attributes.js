module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async (t) => {

    // creates a new table called ChainCategoryTypes
    await queryInterface.createTable("ChainCategoryTypes", {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        category_name: { type: Sequelize.STRING, allowNull: true },
    }, { transaction: t });

    // creates a new table called ChainCategories
    await queryInterface.createTable("ChainCategories", {
      id: {type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true},
      chain_id: { type: Sequelize.STRING, allowNull: false, references: { model: "Chains", key: "id" }},
      category_type_id: {
        type: Sequelize.INTEGER, allowNull: false, references: { model: "ChainCategoryTypes", key: "id" }
      }
    }, { transaction: t });
    });
  },

  down: async (queryInterface, Sequelize) => {
      await queryInterface.sequelize.transaction(async (t) => {
        await queryInterface.dropTable('ChainCategories', { transaction: t });
        await queryInterface.dropTable('ChainCategoryTypes', { transaction: t });
      });
  },
};