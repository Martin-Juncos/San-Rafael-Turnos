import { DataTypes, Model } from 'sequelize'

export class Payment extends Model {}

export const initPaymentModel = (sequelize) => {
  Payment.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      appointmentId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true
      },
      provider: {
        type: DataTypes.ENUM('mock', 'mercadopago', 'stripe'),
        allowNull: false,
        defaultValue: 'mock'
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      currency: {
        type: DataTypes.STRING(8),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending'
      },
      externalRef: {
        type: DataTypes.STRING,
        allowNull: true
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'Payment',
      tableName: 'Payment',
      indexes: [
        {
          fields: ['status']
        }
      ]
    }
  )

  return Payment
}
