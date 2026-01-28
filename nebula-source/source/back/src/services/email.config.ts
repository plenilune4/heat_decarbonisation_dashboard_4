import fs from 'fs'
import path from 'path'

export const EMAIL_TEMPLATES = {
    notification: 'notify',
    passwordReset: 'password-reset',
    confirmAccount: 'confirm-account',
}

export function loadTemplateLayout() {
    const templatePath = path.join(__dirname, './email-templates', `layout.html`)
    return fs.readFileSync(templatePath, 'utf8')
}

export function loadTemplate(templateName: string) {
    const templatePath = path.join(__dirname, './email-templates', `${templateName}.html`)
    return fs.readFileSync(templatePath, 'utf8')
}
