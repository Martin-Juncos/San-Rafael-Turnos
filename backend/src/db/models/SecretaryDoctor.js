import { DataTypes, Model } from 'sequelize'

export class SecretaryDoctor extends Model {}

export const initSecretaryDoctorModel = (sequelize) => {
  SecretaryDoctor.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      secretaryUserId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      doctorId: {
        type: DataTypes.UUID,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'SecretaryDoctor',
      tableName: 'SecretaryDoctor',
      indexes: [
        {
          unique: true,
          fields: ['secretaryUserId', 'doctorId']
        },
        {
          fields: ['doctorId']
        }
      ]
    }
  )

  return SecretaryDoctor
}
