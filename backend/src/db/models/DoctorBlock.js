import { DataTypes, Model } from 'sequelize'

export class DoctorBlock extends Model {}

export const initDoctorBlockModel = (sequelize) => {
  DoctorBlock.init(
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
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      startTime: {
        type: DataTypes.TIME,
        allowNull: false
      },
      endTime: {
        type: DataTypes.TIME,
        allowNull: false
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: true
      },
      createdByRole: {
        type: DataTypes.ENUM('admin', 'clinic'),
        allowNull: false
      },
      createdByUserId: {
        type: DataTypes.UUID,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'DoctorBlock',
      tableName: 'DoctorBlock',
      indexes: [
        {
          fields: ['doctorId', 'date']
        }
      ]
    }
  )

  return DoctorBlock
}
