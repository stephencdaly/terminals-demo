import Stripe from 'stripe'
import {Request, Response, NextFunction} from 'express'
import logger from './logger'
import {STRIPE_API_VERSION} from './config'
import {isSimulated} from "./utils";

const stripe = new Stripe(process.env.STRIPE_API_KEY, {
    apiVersion: STRIPE_API_VERSION
})

export async function createUsingSimulatedReader(req: Request, res: Response, next: NextFunction) {
    try {
        let reader = await stripe.terminal.readers.create({
            registration_code: 'simulated-wpe',
            location: process.env.STRIPE_LOCATION_ID
        })
        logger.info(`Simulated reader created: ${JSON.stringify(reader)}`)

        const paymentIntent = await stripe.paymentIntents.create({
            amount: 1000,
            currency: 'usd',
            payment_method_types: ['card_present'],
            capture_method: 'manual'
        })
        logger.info(`Payment intent created, id: ${paymentIntent.id}`)

        await stripe.terminal.readers.processPaymentIntent(reader.id, {
            payment_intent: paymentIntent.id
        })
        logger.info(`Started processing payment on reader ${reader.id}`)

        reader = await stripe.testHelpers.terminal.readers.presentPaymentMethod(reader.id)
        logger.info(`Created simulated payment method: ${JSON.stringify(reader)}`)

        await stripe.paymentIntents.capture(paymentIntent.id)
        logger.info(`Captured payment intent with id: ${paymentIntent.id}`)

        res.send(`Payment intent with id ${paymentIntent.id} created`)
    } catch (err) {
        next(err)
    }
}

export async function getCreatePayment(req: Request, res: Response, next: NextFunction) {
    try {
        const {params, query} = req
        res.render('payment/create', {
            readerId: params.id,
            simulated: query.simulated || false
        })
    } catch (err) {
        next(err)
    }
}

export async function postCreatePayment(req: Request, res: Response, next: NextFunction) {
    try {
        const {params, body} = req
        const amount = convertPoundsAndPenceToPence(body.amount)

        const reader = await stripe.terminal.readers.retrieve(params.id, {
            expand: ['location']
        })

        logger.info(`Creating payment for amount: ${amount} on reader ${reader.id}`)
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            description: body.reference,
            currency: 'gbp',
            payment_method_types: ['card_present'],
            capture_method: 'automatic'
        })
        logger.info(`Payment intent created, id: ${paymentIntent.id}`)

        // await stripe.terminal.readers.processPaymentIntent(reader.id, {
        //     payment_intent: paymentIntent.id
        // })
        // logger.info(`Started processing payment on reader ${reader.id}`)

        // res.redirect(`/readers/${reader.id}/payment/${paymentIntent.id}/check-status?simulated=${body.simulated || false}`)
        res.render('payment/start-payment', {
            stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
            readerId: reader.id,
            reader,
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            simulated: isSimulated(reader)
        })
    } catch (err) {
        next(err)
    }
}

export async function getSimulatePaymentMethod(req: Request, res: Response, next: NextFunction) {
    try {
        const {params} = req
        res.render('payment/simulate-payment-method', {
            simulated: true,
            readerId: params.readerId,
            paymentIntentId: params.paymentIntentId
        })
    } catch (err) {
        next(err)
    }
}

export async function postSimulatePaymentMethod(req: Request, res: Response, next: NextFunction) {
    try {
        const {params, body} = req
        const readerId = params.readerId
        const paymentIntentId = params.paymentIntentId
        await stripe.testHelpers.terminal.readers.presentPaymentMethod(readerId)
        res.redirect(`/reader/${readerId}/payment/${paymentIntentId}/check-status`)
    } catch (err) {
        next(err)
    }
}

export async function checkStatus(req: Request, res: Response, next: NextFunction) {
    try {
        const {params, query} = req
        logger.info(`Checking status of payment intent ${params.paymentIntentId}`)
        const paymentIntent = await stripe.paymentIntents.retrieve(params.paymentIntentId)
        logger.info(`Payment method status is ${paymentIntent.status}`)
        const reader = await stripe.terminal.readers.retrieve(params.readerId, {
            expand: ['location']
        })
        if (paymentIntent.status === 'succeeded') {
            res.render('payment/success', {
                paymentIntent,
                simulated: isSimulated(reader),
                reference: paymentIntent.description
            })
        } else if (paymentIntent.last_payment_error) {
            res.render('payment/declined', {
                paymentIntent,
                simulated: isSimulated(reader)
            })
        } else if (paymentIntent.status === 'requires_confirmation') {
            await stripe.paymentIntents.confirm(params.paymentIntentId)
            res.render('payment/in-progress', {
                reader,
                paymentIntentId: paymentIntent.id,
                simulated: isSimulated(reader)
            })
        } else {
            res.render('payment/in-progress', {
                reader,
                paymentIntentId: paymentIntent.id,
                simulated: isSimulated(reader)
            })
        }
    } catch (err) {
        next(err)
    }
}

function convertPoundsAndPenceToPence(poundsAndPenceAmount: string) {
    const indexOfLastCharacter = poundsAndPenceAmount.length - 1
    const indexOfDecimalPoint = poundsAndPenceAmount.lastIndexOf('.')
    const charactersAfterDecimalPoint = indexOfDecimalPoint !== -1 ? indexOfLastCharacter - indexOfDecimalPoint : 0

    let pounds
    let pence

    switch (charactersAfterDecimalPoint) {
        case 2:
            pounds = poundsAndPenceAmount.slice(0, indexOfDecimalPoint)
            pence = poundsAndPenceAmount.slice(indexOfDecimalPoint + 1)
            break
        case 1:
            pounds = poundsAndPenceAmount.slice(0, indexOfDecimalPoint)
            pence = poundsAndPenceAmount.slice(indexOfDecimalPoint + 1).concat('0')
            break
        default:
            pounds = poundsAndPenceAmount
            pence = '00'
    }

    return Number(pounds.concat(pence))
}
