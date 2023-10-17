import Stripe from 'stripe'
import {Request, Response, NextFunction} from 'express'
import logger from './logger'
import {STRIPE_API_VERSION} from './config'

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