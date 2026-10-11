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
    price: 2750,
    currency: 'eur',
  },
  'classic-powerlifting-shirt-red': {
    name: 'Classic Powerlifting Shirt (Red)',
    description: 'Official T.S.K.V. Spartacus Classic Powerlifting Shirt in Red',
    price: 2750,
    currency: 'eur',
  },
  'classic-powerlifting-shirt-white': {
    name: 'Classic Powerlifting Shirt (White)',
    description: 'Official T.S.K.V. Spartacus Classic Powerlifting Shirt in White',
    price: 2750,
    currency: 'eur',
  },
  'competition-shirt-black': {
    name: 'Competition Shirt (Black)',
    description: 'Official T.S.K.V. Spartacus Competition Shirt in Black',
    price: 2750,
    currency: 'eur',
  },
  'competition-shirt-red': {
    name: 'Competition Shirt (Red)',
    description: 'Official T.S.K.V. Spartacus Competition Shirt in Red',
    price: 2750,
    currency: 'eur',
  },
  'competition-shirt-white': {
    name: 'Competition Shirt (White)',
    description: 'Official T.S.K.V. Spartacus Competition Shirt in White',
    price: 2750,
    currency: 'eur',
  },
  'hoodie-zip-black': {
    name: 'Hoodie with Zip (Black)',
    description: 'Official T.S.K.V. Spartacus Zip Hoodie in Black',
    price: 5000,
    currency: 'eur',
  },
  'hoodie-zip-burgundy': {
    name: 'Hoodie with Zip (Burgundy)',
    description: 'Official T.S.K.V. Spartacus Zip Hoodie in Burgundy',
    price: 5000,
    currency: 'eur',
  },
  'joggers-red': {
    name: 'Joggers (Red)',
    description: 'Official T.S.K.V. Spartacus Joggers in Red',
    price: 3500,
    currency: 'eur',
  },
  'joggers-white': {
    name: 'Joggers (White)',
    description: 'Official T.S.K.V. Spartacus Joggers in White',
    price: 3500,
    currency: 'eur',
  },
  'shorts-black': {
    name: 'Shorts (Black)',
    description: 'Official T.S.K.V. Spartacus Shorts in Black',
    price: 3000,
    currency: 'eur',
  },
  'tanktop-men-black': {
    name: 'Tank Top Men (Black)',
    description: 'Official T.S.K.V. Spartacus Men\'s Tank Top in Black',
    price: 2250,
    currency: 'eur',
  },
  'tanktop-men-red': {
    name: 'Tank Top Men (Red)',
    description: 'Official T.S.K.V. Spartacus Men\'s Tank Top in Red',
    price: 2250,
    currency: 'eur',
  },
  'tanktop-men-white': {
    name: 'Tank Top Men (White)',
    description: 'Official T.S.K.V. Spartacus Men\'s Tank Top in White',
    price: 2250,
    currency: 'eur',
  },
  'tanktop-women-black': {
    name: 'Tank Top Women (Black)',
    description: 'Official T.S.K.V. Spartacus Women\'s Tank Top in Black',
    price: 2250,
    currency: 'eur',
  },
  'tanktop-women-red': {
    name: 'Tank Top Women (Red)',
    description: 'Official T.S.K.V. Spartacus Women\'s Tank Top in Red',
    price: 2250,
    currency: 'eur',
  },
  'tanktop-women-white': {
    name: 'Tank Top Women (White)',
    description: 'Official T.S.K.V. Spartacus Women\'s Tank Top in White',
    price: 2250,
    currency: 'eur',
  },
  'varsity-jacket': {
    name: 'Varsity Jacket',
    description: 'Official T.S.K.V. Spartacus Varsity Jacket',
    price: 5000,
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
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Request body must be valid JSON.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { items } = body ?? {};
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Cart is empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (items.length > 50) {
      return new Response(
        JSON.stringify({ error: 'Too many different items in the cart.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate every item before contacting Stripe. Never silently drop invalid
    // products or accept client-supplied prices/quantities.
    for (const item of items) {
      if (!item || typeof item.productId !== 'string' || !PRODUCTS[item.productId]) {
        return new Response(
          JSON.stringify({ error: 'Your cart contains an invalid product. Please refresh and try again.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
        return new Response(
          JSON.stringify({ error: 'Each item quantity must be between 1 and 20.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const origin = new URL(request.url).origin;

    const params = new URLSearchParams();
    // Let Stripe use the payment methods enabled for this account in the Dashboard.
    // Hard-coding card + iDEAL can fail if one of those methods is not enabled.
    params.append('mode', 'payment');
    params.append('success_url', `${origin}/shop?status=success`);
    params.append('cancel_url', `${origin}/shop?status=cancelled`);

    let lineIndex = 0;
    for (const item of items) {
      const product = PRODUCTS[item.productId];
      if (!product) continue;

      params.append(`line_items[${lineIndex}][price_data][currency]`, product.currency);
      // Keep variant details from the shop UI only when they begin with the
      // server-owned catalog name; otherwise use the trusted catalog name.
      const displayName = typeof item.displayName === 'string'
        && item.displayName.startsWith(product.name)
        && item.displayName.length <= 120
        ? item.displayName
        : product.name;
      params.append(`line_items[${lineIndex}][price_data][product_data][name]`, displayName);
      params.append(`line_items[${lineIndex}][price_data][product_data][description]`, product.description);
      params.append(`line_items[${lineIndex}][price_data][unit_amount]`, String(product.price));
      params.append(`line_items[${lineIndex}][quantity]`, String(item.quantity));
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
