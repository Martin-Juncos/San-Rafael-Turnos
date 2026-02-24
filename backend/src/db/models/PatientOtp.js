import { DataTypes, Model } from 'sequelize'

export class PatientOtp extends Model {}

export const initPatientOtpModel = (sequelize) => {
  PatientOtp.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      dni: {
        type: DataTypes.STRING,
        allowNull: false
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false
      },
      codeHash: {
        type: DataTypes.STRING,
        allowNull: false
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      consumedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'PatientOtp',
      tableName: 'PatientOtp',
      updatedAt: false,
      indexes: [
        {
          fields: ['dni']
        },
        {
          fields: ['expiresAt']
        }
      ]
    }
  )

  return PatientOtp
}
