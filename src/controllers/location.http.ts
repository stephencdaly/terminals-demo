import Stripe from 'stripe'
import {Request, Response, NextFunction} from 'express'
import {STRIPE_API_VERSION} from '../config'

const stripe = new Stripe(process.env.STRIPE_API_KEY, {
    apiVersion: STRIPE_API_VERSION
})

export async function list(req: Request, res: Response, next: NextFunction) {
    try {
        const locations = await stripe.terminal.locations.list()
        res.render('location/list', {
            locations: locations.data,
            flash: req.flash()
        })
    } catch (err) {
        next(err)
    }
}
