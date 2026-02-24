import { DataTypes, Model } from 'sequelize'

export class Doctor extends Model {}

export const initDoctorModel = (sequelize) => {
  Doctor.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      fullName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false
      },
      dni: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
        validate: {
          len: [6, 12],
          is: /^\d+$/
        }
      },
      consultorio: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 1
        }
      },
      specialtyId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: 'Doctor',
      tableName: 'Doctor',
      paranoid: true
    }
  )

  return Doctor
}
