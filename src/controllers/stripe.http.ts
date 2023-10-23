import Stripe from 'stripe'
import {Request, Response, NextFunction} from 'express'
import logger from '../logger'
import {STRIPE_API_VERSION} from '../config'

const stripe = new Stripe(process.env.STRIPE_API_KEY, {
    apiVersion: STRIPE_API_VERSION
})

export async function connectionToken(req: Request, res: Response) {
    logger.info('Requesting connection token')
    try {
        const connectionToken = await stripe.terminal.connectionTokens.create();
        res.status(200)
        res.send(connectionToken)
    } catch (err) {
        res.status(500)
    }
}
