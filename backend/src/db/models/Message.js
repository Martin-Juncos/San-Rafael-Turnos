import { DataTypes, Model } from 'sequelize'

export class Message extends Model {}

export const initMessageModel = (sequelize) => {
  Message.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      appointmentId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      senderRole: {
        type: DataTypes.ENUM('doctor', 'patient', 'clinic'),
        allowNull: false
      },
      senderId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'Message',
      tableName: 'Message',
      updatedAt: false,
      indexes: [
        {
          fields: ['appointmentId', 'createdAt']
        }
      ]
    }
  )

  return Message
}
