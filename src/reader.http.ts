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
        const deviceType = (query.simulated && query.simulated === 'true' && 'simulated_wisepos_e') || 'bbpos_wisepos_e'
        const readers = await stripe.terminal.readers.list({
            device_type: deviceType,
            expand: ['data.location']
        })
        res.render('reader/list', {
            readers: readers.data,
            simulated: query.simulated || false,
            flash: req.flash()
        })
    } catch (err) {
        next(err)
    }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
    try {
        const {params, query} = req
        const reader = await stripe.terminal.readers.retrieve(params.id, {
            expand: ['location']
        })
        res.render('reader/detail', {
            reader,
            simulated: query.simulated || false
        })
    } catch (err) {
        next(err)
    }
}

export async function getRegister(req: Request, res: Response, next: NextFunction) {
    try {
        const {query} = req
        const locations = await stripe.terminal.locations.list()
        res.render('reader/register', {
            simulated: query.simulated || false,
            locations: locations.data
        })
    } catch (err) {
        next(err)
    }
}

export async function postRegister(req: Request, res: Response, next: NextFunction) {
    try {
        const {body} = req
        const reader = await stripe.terminal.readers.create({
            label: body.label,
            registration_code: body.code,
            location: body.location
        })
        req.flash('generic', `Terminal successfully registered with name “${reader.label}”`)
        res.redirect(`/readers?simulated=${body.simulated || 'false'}`)
    } catch (err) {
        next(err)
    }
}

export async function deleteReader(req: Request, res: Response, next: NextFunction) {
    try {
        const {params, body} = req
        await stripe.terminal.readers.del(params.id)
        req.flash('generic', 'Terminal successfully deleted')
        res.redirect(`/readers?simulated=${body.simulated || 'false'}`)
    } catch (err) {
        next(err)
    }
}