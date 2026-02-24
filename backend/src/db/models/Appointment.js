import { DataTypes, Model } from 'sequelize'

export class Appointment extends Model {}

export const initAppointmentModel = (sequelize) => {
  Appointment.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      doctorId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      specialtyId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      insuranceId: {
        type: DataTypes.UUID,
        allowNull: true
      },
      patientId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      startTime: {
        type: DataTypes.TIME,
        allowNull: false
      },
      endTime: {
        type: DataTypes.TIME,
        allowNull: false
      },
      symptoms: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      doctorNotes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM(
          'requested',
          'hold',
          'confirmed',
          'cancelled',
          'rescheduled',
          'attended',
          'no_show'
        ),
        allowNull: false,
        defaultValue: 'requested'
      },
      cancelReason: {
        type: DataTypes.STRING,
        allowNull: true
      },
      discountPercentApplied: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
      },
      createdByRole: {
        type: DataTypes.ENUM('admin', 'clinic', 'doctor', 'patient'),
        allowNull: false
      },
      createdByUserId: {
        type: DataTypes.UUID,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'Appointment',
      tableName: 'Appointment',
      paranoid: true,
      indexes: [
        {
          fields: ['doctorId', 'date']
        },
        {
          fields: ['patientId', 'date']
        },
        {
          fields: ['status']
        }
      ]
    }
  )

  return Appointment
}
