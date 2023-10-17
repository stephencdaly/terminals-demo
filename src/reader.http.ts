import Stripe from 'stripe'
import {Request, Response, NextFunction} from 'express'
import logger from './logger'
import {STRIPE_API_VERSION} from './config'

const stripe = new Stripe(process.env.STRIPE_API_KEY, {
    apiVersion: STRIPE_API_VERSION
})

export async function list(req: Request, res: Response, next: NextFunction) {
    try {
        const {query} = req
        const deviceType = (query.simulated && 'simulated_wisepos_e') || 'bbpos_wisepos_e'
        const readers = await stripe.terminal.readers.list({
                device_type: deviceType,
                expand: ['data.location']
            })
        res.render('list-readers', {readers: readers.data})
    } catch (err) {
        next(err)
    }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
    try {
        const {params} = req
        const reader = await stripe.terminal.readers.retrieve(params.id, {
            expand: ['location']
        })
        res.render('reader-detail', {reader})
    } catch (err) {
        next(err)
    }
}