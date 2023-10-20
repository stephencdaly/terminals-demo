import express, {Express} from 'express'
import dotenv from 'dotenv'
import nunjucks from 'nunjucks'
import flash from 'connect-flash'
import session from 'express-session'

import logger from './logger'

import * as payment from './payment.http'
import * as readers from './reader.http'
import * as locations from './location.http'
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
    secret: process.env.COOKIE_SESSION_ENCRYPTION_SECRET || "secretkey",
    resave: false,
    saveUninitialized: false}));
app.use(express.urlencoded({ extended: false }))
app.use(express.json({ strict: true, limit: '15kb' }))
app.use(flash())

// locations
app.get('/locations', locations.list)

// manage readers
app.get('/locations/:locationId/readers', readers.list)
app.get('/locations/:locationId/readers/register', readers.getRegister)
app.post('/locations/:locationId/readers/register', readers.postRegister)

app.get('/locations/:locationId/readers/:id', readers.detail)
app.post('/locations/:locationId/readers/:id/delete', readers.deleteReader)
app.get('/locations/:locationId/readers/:id/cancel-action', readers.cancelAction)

// payment
app.get('/locations/:locationId/readers/:id/payment', payment.getCreatePayment)
app.post('/locations/:locationId/readers/:id/payment', payment.postCreatePaymentServerSide)
app.post('/locations/:locationId/readers/:id/payment-client-side', payment.postCreatePaymentClientSide)
app.get('/locations/:locationId/readers/:readerId/payment/:paymentIntentId/simulate-payment-method', payment.getSimulatePaymentMethod)
app.post('/locations/:locationId/readers/:readerId/payment/:paymentIntentId/simulate-payment-method', payment.postSimulatePaymentMethod)
app.get('/locations/:locationId/readers/:readerId/payment/:paymentIntentId/check-status', payment.checkStatus)

// stripe
app.post('/stripe/connection-token', stripe.connectionToken)

app.listen(port, () => logger.info(`server started on port ${port}`))
