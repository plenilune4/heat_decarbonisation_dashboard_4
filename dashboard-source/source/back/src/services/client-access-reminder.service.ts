import { differenceInCalendarDays, format, isSameDay, subDays } from 'date-fns'
import cron from 'node-cron'

import Client from '../models/client.model'
import User from '../models/user.model'
import { EMAIL_TEMPLATES } from './email.config'
import { SendEmail } from './email.service'
import LoggingService from './logging.service'

if (!process.env.ACCESS_REMINDER_EMAIL_ADDRESS) {
    throw new Error('ACCESS_REMINDER_EMAIL_ADDRESS is not set')
}

function getDaysUntil(date: Date) {
    return differenceInCalendarDays(new Date(date), new Date())
}

function shouldSendReminderOnSchedule(accessEndAt: Date, reminderDaysBefore: number, lastSentAt?: Date) {
    const nextNotificationDate = subDays(new Date(accessEndAt), reminderDaysBefore)
    const today = new Date()

    // Send only on the notification day.
    if (!isSameDay(today, nextNotificationDate)) {
        return false
    }

    // Avoid duplicate sends on the same scheduled day.
    if (lastSentAt && isSameDay(new Date(lastSentAt), nextNotificationDate)) {
        return false
    }

    return true
}

export async function sendClientAccessReminders() {
    const clients = await Client.find({ accessEndAt: { $exists: true, $ne: null } })
    if (!clients.length) return

    // const globalAdmins = await User.find({
    //     'permissions.isAdmin': true,
    //     isArchived: { $ne: true },
    // })
    // if (!globalAdmins.length) return

    const globalAdmins = [
        {
            email: process.env.ACCESS_REMINDER_EMAIL_ADDRESS,
            firstName: 'Global',
            lastName: 'Admin',
        },
    ]

    for (const client of clients) {
        const daysUntilEnd = getDaysUntil(client.accessEndAt as Date)
        const reminderDaysBefore = client.accessReminderDaysBefore ?? 14

        if (daysUntilEnd < 0 || daysUntilEnd > reminderDaysBefore) {
            continue
        }
        if (
            !shouldSendReminderOnSchedule(
                client.accessEndAt as Date,
                reminderDaysBefore,
                client.lastAccessReminderSentAt
            )
        ) {
            continue
        }

        const sent = await SendEmail(
            globalAdmins.map((admin) => ({
                Email: admin.email,
                Name: `${admin.firstName} ${admin.lastName}`,
            })),
            {
                name: 'Nebula Admin',
                subject: `Nebula: ${client.name} - Access ending in ${daysUntilEnd} day${daysUntilEnd === 1 ? '' : 's'}`,
                message: `Client access reminder:

• Client: ${client.name}
• Days remaining: ${daysUntilEnd}
• End date: ${format(new Date(client.accessEndAt as Date), 'EEEE do MMMM yyyy')}

Review this client's access status and renew if needed.`,
            },
            `${process.env.PROJECT_NAME} - Client Access Reminder`,
            EMAIL_TEMPLATES.notification
        )

        if (!sent) {
            LoggingService.log({
                level: 'error',
                service: 'client-access-reminder',
                message: 'Failed to send client access reminder email',
                data: { clientId: client._id, clientName: client.name },
            })
            continue
        }

        client.lastAccessReminderSentAt = new Date()
        await client.save()
    }
}

export function startClientAccessReminderScheduler() {
    cron.schedule('0 6 * * *', () => {
        sendClientAccessReminders().catch((error) => {
            LoggingService.log({
                level: 'error',
                service: 'client-access-reminder',
                message: 'Scheduled reminder dispatch failed',
                error,
            })
        })
    })
}
