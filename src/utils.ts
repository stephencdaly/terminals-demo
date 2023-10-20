import Stripe from "stripe";

export function isSimulated(reader: Stripe.Terminal.Reader | Stripe.Terminal.DeletedReader) {
    return (reader as Stripe.Terminal.Reader).device_type.startsWith('simulated')
}
