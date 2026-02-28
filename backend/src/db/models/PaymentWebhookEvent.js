import { DataTypes, Model } from 'sequelize'

export class PaymentWebhookEvent extends Model {}

export const initPaymentWebhookEventModel = (sequelize) => {
  PaymentWebhookEvent.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      paymentId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      provider: {
        type: DataTypes.ENUM('mercadopago'),
        allowNull: false,
        defaultValue: 'mercadopago'
      },
      providerPaymentId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      providerStatus: {
        type: DataTypes.STRING,
        allowNull: false
      },
      preferenceId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      externalReference: {
        type: DataTypes.STRING,
        allowNull: true
      },
      webhookEventId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      },
      webhookTopic: {
        type: DataTypes.STRING,
        allowNull: true
      },
      webhookAction: {
        type: DataTypes.STRING,
        allowNull: true
      },
      payload: {
        type: DataTypes.JSONB,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'PaymentWebhookEvent',
      tableName: 'PaymentWebhookEvent',
      indexes: [
        {
          fields: ['paymentId']
        },
        {
          unique: true,
          fields: ['provider', 'paymentId', 'providerPaymentId', 'providerStatus']
        }
      ]
    }
  )

  return PaymentWebhookEvent
}
