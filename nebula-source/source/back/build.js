const esbuild = require('esbuild')
const { dependencies } = require('./package.json')
const fs = require('fs-extra')
const path = require('path')

const external = Object.keys(dependencies)

async function preBuildOperations() {
    const distPath = path.resolve(__dirname, 'dist')
    const envFilePath = path.resolve(__dirname, './src/.env')
    const emailTemplatesPath = path.resolve(__dirname, './src/services/email-templates')

    try {
        console.log(`Building with envFilePath ${envFilePath}`)

        await fs.emptyDir(distPath)
        console.log('Cleared the /dist folder.')

        await fs.copy(envFilePath, path.join(distPath, '.env'))
        console.log('Copied .env to /dist folder.')

        await fs.copy(emailTemplatesPath, path.join(distPath, '/email-templates'))
        console.log('Copied .env to /dist folder.')
    } catch (error) {
        console.error('Error during pre-build operations:', error)
        process.exit(1)
    }
}

async function build() {
    await preBuildOperations()

    esbuild
        .build({
            entryPoints: ['src/index.ts'],
            bundle: true,
            platform: 'node',
            target: 'es2020',
            outfile: 'dist/index.js',
            external,
            tsconfig: 'tsconfig.json',
        })
        .catch(() => process.exit(1))
}

build()
