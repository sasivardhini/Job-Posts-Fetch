const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Job = require('./Job');

const Application = sequelize.define('Application', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  jobId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'jobs',
      key: 'id'
    }
  },
  applicantName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  applicantEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  applicantPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  resumeUrl: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'URL or path to resume file'
  },
  coverLetter: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'submitted', 'reviewed', 'interview', 'rejected', 'accepted'),
    defaultValue: 'pending'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'applications',
  indexes: [
    { fields: ['job_id'] },
    { fields: ['applicant_email'] },
    { fields: ['status'] }
  ]
});

// Define relationships
Application.belongsTo(Job, { foreignKey: 'jobId', as: 'job' });
Job.hasMany(Application, { foreignKey: 'jobId', as: 'applications' });

module.exports = Application;
