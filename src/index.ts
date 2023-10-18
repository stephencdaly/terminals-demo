import express, {Express} from 'express'
import dotenv from 'dotenv'
import nunjucks from 'nunjucks'
import flash from 'connect-flash'
import session from 'express-session'

import logger from './logger'

import * as payment from './payment.http'
import * as readers from './reader.http'
import * as stripe from './stripe.http'
import path from 'path'

dotenv.config()

const app = express()
const port = 8080

app.use(express.static(__dirname + '/public'))
app.use('/', express.static('node_modules/govuk-frontend/govuk'))

const templatePathRoots = [path.join(process.cwd(), 'node_modules/govuk-frontend'), path.join(__dirname, 'views')]
nunjucks.configure(templatePathRoots, {autoescape: true, express: app})
app.set('view engine', 'njk')

app.use(session({ cookie: { maxAge: 60000 },
    secret: process.env.COOKIE_SESSION_ENCRYPTION_SECRET,
    resave: false,
    saveUninitialized: false}));
app.use(express.urlencoded({ extended: false }))
app.use(express.json({ strict: true, limit: '15kb' }))
app.use(flash())

// manage readers
app.get('/readers', readers.list)
app.get('/readers/register', readers.getRegister)
app.post('/readers/register', readers.postRegister)
app.get('/readers/:id', readers.detail)
app.post('/readers/:id/delete', readers.deleteReader)

// payment
app.get('/readers/:id/payment', payment.getCreatePayment)
app.post('/readers/:id/payment', payment.postCreatePayment)
app.get('/readers/:readerId/payment/:paymentIntentId/simulate-payment-method', payment.getSimulatePaymentMethod)
app.post('/readers/:readerId/payment/:paymentIntentId/simulate-payment-method', payment.postSimulatePaymentMethod)
app.get('/readers/:readerId/payment/:paymentIntentId/check-status', payment.checkStatus)

// stripe
app.post('/stripe/connection-token', stripe.connectionToken)

app.listen(port, () => logger.info(`server started on port ${port}`))