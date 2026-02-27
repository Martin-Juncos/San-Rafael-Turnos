import { DataTypes, Model } from 'sequelize'

export class ConsultNote extends Model {}

export const initConsultNoteModel = (sequelize) => {
  ConsultNote.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      appointmentId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      doctorId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      patientId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      subjective: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      objective: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      assessment: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      plan: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      followUp: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      internalNotes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      statusFinal: {
        type: DataTypes.ENUM('attended', 'no_show', 'requires_reschedule'),
        allowNull: false,
        defaultValue: 'attended'
      },
      referred: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      referralTo: {
        type: DataTypes.STRING(250),
        allowNull: true
      },
      nextSuggestedType: {
        type: DataTypes.ENUM('date', 'as_needed'),
        allowNull: true
      },
      nextSuggestedDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      createdByUserId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      updatedByUserId: {
        type: DataTypes.UUID,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'ConsultNote',
      tableName: 'ConsultNote',
      indexes: [
        {
          unique: true,
          fields: ['appointmentId']
        },
        {
          fields: ['doctorId', 'createdAt']
        },
        {
          fields: ['patientId', 'createdAt']
        }
      ]
    }
  )

  return ConsultNote
}
