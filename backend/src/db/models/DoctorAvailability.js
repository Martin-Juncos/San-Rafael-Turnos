import { DataTypes, Model } from 'sequelize'

export class DoctorAvailability extends Model {}

export const initDoctorAvailabilityModel = (sequelize) => {
  DoctorAvailability.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      doctorId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      dayOfWeek: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 0,
          max: 6
        }
      },
      startTime: {
        type: DataTypes.TIME,
        allowNull: false
      },
      endTime: {
        type: DataTypes.TIME,
        allowNull: false
      },
      slotMinutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: 'DoctorAvailability',
      tableName: 'DoctorAvailability',
      indexes: [
        {
          fields: ['doctorId', 'dayOfWeek']
        }
      ]
    }
  )

  return DoctorAvailability
}
