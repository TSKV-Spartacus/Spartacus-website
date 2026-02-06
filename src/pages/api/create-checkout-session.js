// src/pages/api/create-checkout-session.js
// Stripe Checkout Session creation endpoint
//
// Required environment variable (set in Cloudflare Workers dashboard or wrangler.json):
//   STRIPE_SECRET_KEY - Your Stripe secret key (sk_test_... or sk_live_...)

import Stripe from 'stripe';

// Product catalog - update prices (in cents) and details as needed
const PRODUCTS = {
  'spartacus-tshirt': {
    name: 'Spartacus T-Shirt',
    description: 'Official T.S.K.V. Spartacus t-shirt',
    price: 500, // €5.00 in cents
    currency: 'eur',
  },
  'spartacus-stringer': {
    name: 'Spartacus Stringer',
    description: 'Official T.S.K.V. Spartacus stringer',
    price: 500,
    currency: 'eur',
  },
  'spartacus-shaker': {
    name: 'Spartacus Shaker',
    description: 'Official T.S.K.V. Spartacus shaker bottle',
    price: 500,
    currency: 'eur',
  },
  'spartacus-wristband': {
    name: 'Spartacus Wristbands',
    description: 'Official T.S.K.V. Spartacus wristbands (pair)',
    price: 500,
    currency: 'eur',
  },
  'spartacus-hoodie': {
    name: 'Spartacus Hoodie',
    description: 'Official T.S.K.V. Spartacus hoodie',
    price: 500,
    currency: 'eur',
  },
  'spartacus-bag': {
    name: 'Spartacus Gym Bag',
    description: 'Official T.S.K.V. Spartacus gym bag',
    price: 500,
    currency: 'eur',
  },
};

export async function POST({ request, locals }) {
  // STRIPE_SECRET_KEY should be set as an environment variable in Cloudflare
  // For local dev, you can set it in a .dev.vars file
  const stripeSecretKey = locals?.runtime?.env?.STRIPE_SECRET_KEY || import.meta.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return new Response(
      JSON.stringify({
        error: 'Stripe is not configured. Please set the STRIPE_SECRET_KEY environment variable.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const stripe = new Stripe(stripeSecretKey);

  try {
    const body = await request.json();
    const { productId, quantity = 1 } = body;

    const product = PRODUCTS[productId];
    if (!product) {
      return new Response(
        JSON.stringify({ error: 'Invalid product' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const origin = new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'ideal'],
      line_items: [
        {
          price_data: {
            currency: product.currency,
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: product.price,
          },
          quantity: quantity,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/shop?status=success`,
      cancel_url: `${origin}/shop?status=cancelled`,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create checkout session. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
