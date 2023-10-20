import Stripe from 'stripe'
import {Request, Response, NextFunction} from 'express'
import logger from './logger'
import {STRIPE_API_VERSION} from './config'
import {isSimulated} from "./utils";

const stripe = new Stripe(process.env.STRIPE_API_KEY, {
    apiVersion: STRIPE_API_VERSION
})

export async function list(req: Request, res: Response, next: NextFunction) {
    try {
        const {params, query} = req
        const deviceType = (query.simulated && query.simulated === 'true' && 'simulated_wisepos_e') || 'bbpos_wisepos_e'
        const location = await stripe.terminal.locations.retrieve(params.locationId)
        const readers = await stripe.terminal.readers.list({
            device_type: deviceType,
            location: params.locationId,
            expand: ['data.location']
        })
        res.render('reader/list', {
            readers: readers.data,
            locationId: params.locationId,
            location,
            simulated: query.simulated || false,
            flash: req.flash()
        })
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
        res.render('reader/detail', {
            reader,
            locationId: params.locationId,
            simulated: isSimulated(reader)
        })
    } catch (err) {
        next(err)
    }
}

export async function getRegister(req: Request, res: Response, next: NextFunction) {
    try {
        const {params, query} = req
        const location = await stripe.terminal.locations.retrieve(params.locationId)
        res.render('reader/register', {
            locationId: params.locationId,
            simulated: query.simulated || false
        })
    } catch (err) {
        next(err)
    }
}

export async function postRegister(req: Request, res: Response, next: NextFunction) {
    try {
        const {params, body} = req
        const reader = await stripe.terminal.readers.create({
            label: body.label,
            registration_code: body.code,
            location: params.locationId
        })
        const simulated = isSimulated(reader)
        req.flash('generic', `Terminal successfully registered with name “${reader.label}”`)
        res.redirect(`/locations/${params.locationId}/readers?simulated=${simulated}`)
    } catch (err) {
        next(err)
    }
}

export async function cancelAction(req: Request, res: Response, next: NextFunction) {
    try {
        const {params} = req
        const reader = await stripe.terminal.readers.cancelAction(params.id)
        res.redirect(`/locations/${params.locationId}/readers?simulated=${isSimulated(reader)}`)
    } catch (err) {
        next(err)
    }
}

export async function deleteReader(req: Request, res: Response, next: NextFunction) {
    try {
        const {params, body} = req
        const reader = await stripe.terminal.readers.retrieve(params.id)
        await stripe.terminal.readers.del(params.id)
        req.flash('generic', 'Terminal successfully deleted')
        res.redirect(`/locations/${params.locationId}/readers?simulated=${isSimulated(reader)}`)
    } catch (err) {
        next(err)
    }
}
