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
  'classic-powerlifting-shirt-black': {
    name: 'Classic Powerlifting Shirt (Black)',
    description: 'Official T.S.K.V. Spartacus Classic Powerlifting Shirt in Black',
    price: 500, // TODO: update price
    currency: 'eur',
  },
  'classic-powerlifting-shirt-red': {
    name: 'Classic Powerlifting Shirt (Red)',
    description: 'Official T.S.K.V. Spartacus Classic Powerlifting Shirt in Red',
    price: 500,
    currency: 'eur',
  },
  'classic-powerlifting-shirt-white': {
    name: 'Classic Powerlifting Shirt (White)',
    description: 'Official T.S.K.V. Spartacus Classic Powerlifting Shirt in White',
    price: 500,
    currency: 'eur',
  },
  'competition-shirt-black': {
    name: 'Competition Shirt (Black)',
    description: 'Official T.S.K.V. Spartacus Competition Shirt in Black',
    price: 500,
    currency: 'eur',
  },
  'competition-shirt-red': {
    name: 'Competition Shirt (Red)',
    description: 'Official T.S.K.V. Spartacus Competition Shirt in Red',
    price: 500,
    currency: 'eur',
  },
  'competition-shirt-white': {
    name: 'Competition Shirt (White)',
    description: 'Official T.S.K.V. Spartacus Competition Shirt in White',
    price: 500,
    currency: 'eur',
  },
  'hoodie-zip-black': {
    name: 'Hoodie with Zip (Black)',
    description: 'Official T.S.K.V. Spartacus Zip Hoodie in Black',
    price: 500,
    currency: 'eur',
  },
  'hoodie-zip-burgundy': {
    name: 'Hoodie with Zip (Burgundy)',
    description: 'Official T.S.K.V. Spartacus Zip Hoodie in Burgundy',
    price: 500,
    currency: 'eur',
  },
  'joggers-red': {
    name: 'Joggers (Red)',
    description: 'Official T.S.K.V. Spartacus Joggers in Red',
    price: 500,
    currency: 'eur',
  },
  'joggers-white': {
    name: 'Joggers (White)',
    description: 'Official T.S.K.V. Spartacus Joggers in White',
    price: 500,
    currency: 'eur',
  },
  'shorts-black': {
    name: 'Shorts (Black)',
    description: 'Official T.S.K.V. Spartacus Shorts in Black',
    price: 500,
    currency: 'eur',
  },
  'tanktop-men-black': {
    name: 'Tank Top Men (Black)',
    description: 'Official T.S.K.V. Spartacus Men\'s Tank Top in Black',
    price: 500,
    currency: 'eur',
  },
  'tanktop-men-red': {
    name: 'Tank Top Men (Red)',
    description: 'Official T.S.K.V. Spartacus Men\'s Tank Top in Red',
    price: 500,
    currency: 'eur',
  },
  'tanktop-men-white': {
    name: 'Tank Top Men (White)',
    description: 'Official T.S.K.V. Spartacus Men\'s Tank Top in White',
    price: 500,
    currency: 'eur',
  },
  'tanktop-women-black': {
    name: 'Tank Top Women (Black)',
    description: 'Official T.S.K.V. Spartacus Women\'s Tank Top in Black',
    price: 500,
    currency: 'eur',
  },
  'tanktop-women-red': {
    name: 'Tank Top Women (Red)',
    description: 'Official T.S.K.V. Spartacus Women\'s Tank Top in Red',
    price: 500,
    currency: 'eur',
  },
  'tanktop-women-white': {
    name: 'Tank Top Women (White)',
    description: 'Official T.S.K.V. Spartacus Women\'s Tank Top in White',
    price: 500,
    currency: 'eur',
  },
  'varsity-jacket': {
    name: 'Varsity Jacket',
    description: 'Official T.S.K.V. Spartacus Varsity Jacket',
    price: 500,
    currency: 'eur',
  },
  'powerlifting-team-shirt': {
    name: 'Powerlifting Team Shirt',
    description: 'Official T.S.K.V. Spartacus Powerlifting Team Shirt',
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
