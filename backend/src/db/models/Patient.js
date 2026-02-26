import { DataTypes, Model } from 'sequelize'

export class Patient extends Model {}

export const initPatientModel = (sequelize) => {
  Patient.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      dni: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      fullName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false
      },
      streetAndNumber: {
        type: DataTypes.STRING,
        allowNull: true
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true
      },
      birthDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'Patient',
      tableName: 'Patient'
    }
  )

  return Patient
}
