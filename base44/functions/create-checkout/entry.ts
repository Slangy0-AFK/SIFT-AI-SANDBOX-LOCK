import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const WIX_API_KEY = Deno.env.get("WIX_PAYMENTS_API_KEY");
    const WIX_SITE_ID = Deno.env.get("WIX_PAYMENTS_SITE_ID");

    if (!WIX_API_KEY || !WIX_SITE_ID) {
      return Response.json({ error: "Payment integration not configured." }, { status: 500 });
    }

    const { planKey, billingCycle } = await req.json();

    if (planKey === 'free') {
       return Response.json({ error: "Cannot checkout a free plan" }, { status: 400 });
    }

    let price = "5.00";
    let title = "Sift-AI Pro Monthly";
    let frequency = "MONTH";

    if (planKey === 'pro' && billingCycle === 'annual') {
      price = "50.00";
      title = "Sift-AI Pro Annual";
      frequency = "YEAR";
    }

    const appUrl = req.headers.get("X-Base44-App-Url") || Deno.env.get("WIX_CHECKOUT_APP_URL");
    
    if (!appUrl) {
      return Response.json({ error: "App URL not configured" }, { status: 500 });
    }

    const response = await fetch(
      "https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": WIX_API_KEY,
          "wix-site-id": WIX_SITE_ID,
        },
        body: JSON.stringify({
          cart: {
            items: [
              {
                name: title,
                quantity: 1,
                price: price,
                subscriptionInfo: {
                  subscriptionSettings: {
                    frequency: frequency
                  },
                  title: title,
                  description: `Subscription to ${title}`
                }
              }
            ],
            customerInfo: {
              email: user.email,
              firstName: user.full_name?.split(' ')[0] || '',
              lastName: user.full_name?.split(' ').slice(1).join(' ') || ''
            }
          },
          callbackUrls: {
            postFlowUrl: `${appUrl}/subscription`,
            thankYouPageUrl: `${appUrl}/dashboard`
          }
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Wix Checkout Error:", data);
      return Response.json({ error: "Failed to create checkout session" }, { status: 500 });
    }

    const checkoutId = data.checkoutSession.id;

    // Create a pending subscription in our database
    await base44.asServiceRole.entities.Subscription.create({
      user_id: user.id,
      plan: planKey,
      status: 'pending',
      billing_cycle: billingCycle,
      checkout_session_id: checkoutId
    });

    return Response.json({ redirectUrl: data.checkoutSession.redirectUrl });
  } catch (error) {
    console.error("Create Checkout Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});