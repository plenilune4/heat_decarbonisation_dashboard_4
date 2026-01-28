import Mailjet from 'node-mailjet'

import { loadTemplate, loadTemplateLayout } from './email.config'
import LoggingService from './logging.service'

type EmailAddress = { Email: string; Name: string }

export async function SendEmail(
    to: EmailAddress[],
    variables: any,
    subject: string,
    emailTemplate: string,
    attachments?: any[]
) {
    const mailjet = new Mailjet({
        apiKey: process.env.MJ_APIKEY_PUBLIC ?? '',
        apiSecret: process.env.MJ_APIKEY_PRIVATE,
    })
    const layout = loadTemplateLayout()
    const templateHtml = loadTemplate(emailTemplate)

    const compiledTemplate = templateHtml.replace(/\$\{(.*?)\}/g, (_, variable) => variables[variable] || '')
    const compiledLayout = layout.replace(/\$\{(.*?)\}/g, (_, variable) => ({ ...variables, subject })[variable] || '')
    const compiledEmail = compiledLayout.replace('[BODY]', compiledTemplate)

    try {
        await mailjet.post('send', { version: 'v3.1' }).request({
            Messages: [
                {
                    From: {
                        Email: process.env.EMAIL_FROM,
                        Name: process.env.PROJECT_NAME,
                    },
                    To: to,
                    HTMLPart: compiledEmail,
                    Subject: subject,
                    Attachments: attachments,
                },
            ],
        })
        return true
    } catch (error) {
        LoggingService.log({
            level: 'error',
            message: 'Error sending email',
            error,
        })
        return false
    }
}
