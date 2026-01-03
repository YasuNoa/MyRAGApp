import Stripe from "stripe";

let stripePromise: Stripe;

export const getStripe = () => {
    if (!stripePromise) {
        if (!process.env.STRIPE_SECRET_KEY) {
            throw new Error("STRIPE_SECRET_KEY is missing. Cannot initialize Stripe.");
        }
        stripePromise = new Stripe(process.env.STRIPE_SECRET_KEY, {
            // apiVersion: "2024-11-20.acacia", // Use default installed version
        });
    }
    return stripePromise;
};
