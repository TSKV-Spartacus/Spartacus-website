// src/pages/api/create-checkout-session.js
// Stripe Checkout Session creation endpoint using the Stripe REST API directly
// (no npm dependency needed — works on Cloudflare Workers without bundling issues)
//
// Required environment variable (set in Cloudflare Workers dashboard):
//   STRIPE_SECRET_KEY - Your Stripe secret key (sk_test_... or sk_live_...)

// Ensure this endpoint runs server-side, not prerendered
export const prerender = false;

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
  const stripeSecretKey = locals?.runtime?.env?.STRIPE_SECRET_KEY || import.meta.env.STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    return new Response(
      JSON.stringify({
        error: 'Stripe is not configured. Please set the STRIPE_SECRET_KEY environment variable.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Cart is empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const origin = new URL(request.url).origin;

    const params = new URLSearchParams();
    params.append('payment_method_types[]', 'card');
    params.append('payment_method_types[]', 'ideal');
    params.append('mode', 'payment');
    params.append('success_url', `${origin}/shop?status=success`);
    params.append('cancel_url', `${origin}/shop?status=cancelled`);

    let lineIndex = 0;
    for (const item of items) {
      const product = PRODUCTS[item.productId];
      if (!product) continue;

      params.append(`line_items[${lineIndex}][price_data][currency]`, product.currency);
      params.append(`line_items[${lineIndex}][price_data][product_data][name]`, product.name);
      params.append(`line_items[${lineIndex}][price_data][product_data][description]`, product.description);
      params.append(`line_items[${lineIndex}][price_data][unit_amount]`, String(product.price));
      params.append(`line_items[${lineIndex}][quantity]`, String(item.quantity || 1));
      lineIndex++;
    }

    if (lineIndex === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid products in cart' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await stripeResponse.json();

    if (!stripeResponse.ok) {
      console.error('Stripe API error:', session);
      return new Response(
        JSON.stringify({ error: session.error?.message || 'Stripe error' }),
        { status: stripeResponse.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

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
