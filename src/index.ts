import express, {Express} from 'express'
import dotenv from 'dotenv'
import nunjucks from 'nunjucks'

import logger from './logger'

import * as payment from './payment.http'
import * as readers from './reader.http'
import path from 'path'
import fs from 'fs'

dotenv.config()

const app = express()
const port = 8080

app.use(express.static(__dirname + '/public'))
app.use('/', express.static('node_modules/govuk-frontend/govuk'))

const templatePathRoots = [path.join(process.cwd(), 'node_modules/govuk-frontend'), path.join(__dirname, 'views')]
nunjucks.configure(templatePathRoots, {autoescape: true, express: app})
app.set('view engine', 'njk')

app.get('/payment', payment.createUsingSimulatedReader)
app.get('/readers', readers.list)
app.get('/readers/:id', readers.detail)

app.listen(port, () => logger.info(`server started on port ${port}`))