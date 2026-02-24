import { DataTypes, Model } from 'sequelize'

export class RefreshToken extends Model {}

export const initRefreshTokenModel = (sequelize) => {
  RefreshToken.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      tokenHash: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      revokedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      replacedByTokenId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      createdByIp: {
        type: DataTypes.STRING,
        allowNull: true
      },
      userAgent: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'RefreshToken',
      tableName: 'RefreshToken',
      indexes: [
        {
          fields: ['userId']
        },
        {
          fields: ['expiresAt']
        }
      ]
    }
  )

  return RefreshToken
}
