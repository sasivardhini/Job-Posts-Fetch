const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Job = sequelize.define('Job', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  company: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  salary: {
    type: DataTypes.STRING,
    allowNull: true
  },
  jobType: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Full-time, Part-time, Contract, etc.'
  },
  source: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Source from where the job was fetched'
  },
  url: {
    type: DataTypes.STRING,
    allowNull: true
  },
  postedDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  requirements: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  skills: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'JSON array of required skills'
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'filled'),
    defaultValue: 'active'
  }
}, {
  tableName: 'jobs',
  indexes: [
    { fields: ['company'] },
    { fields: ['location'] },
    { fields: ['status'] },
    { fields: ['created_at'] }
  ]
});

module.exports = Job;
