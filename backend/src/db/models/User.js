import { DataTypes, Model } from 'sequelize'

export class User extends Model {}

export const initUserModel = (sequelize) => {
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      role: {
        type: DataTypes.ENUM('admin', 'clinic', 'doctor', 'secretary'),
        allowNull: false
      },
      accountType: {
        type: DataTypes.ENUM('staff', 'doctor', 'secretary'),
        allowNull: false,
        defaultValue: 'staff'
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false
      },
      doctorId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      fullName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      dni: {
        type: DataTypes.STRING,
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
      modelName: 'User',
      tableName: 'User',
      indexes: [
        {
          fields: ['role', 'accountType']
        },
        {
          fields: ['doctorId']
        }
      ]
    }
  )

  return User
}
