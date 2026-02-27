import { DataTypes, Model } from 'sequelize'

export class HealthInsurance extends Model {}

export const initHealthInsuranceModel = (sequelize) => {
  HealthInsurance.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      discountPercent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100
        }
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: 'HealthInsurance',
      tableName: 'HealthInsurance',
      paranoid: true,
      indexes: [
        {
          fields: ['name']
        },
        {
          fields: ['discountPercent']
        }
      ]
    }
  )

  return HealthInsurance
}
