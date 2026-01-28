import path from 'path'
import commandLineArgs from 'command-line-args'
import dotenv from 'dotenv'

const options = commandLineArgs([{ name: 'env', alias: 'e', defaultValue: 'production', type: String }])
const res = dotenv.config({ path: path.join(__dirname, `./.env.${options.env}`) })
