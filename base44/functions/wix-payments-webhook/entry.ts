import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import jwt from "npm:jsonwebtoken";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const WEBHOOK_PUBLIC_KEY = Deno.env.get("WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY");
    
    if (!WEBHOOK_PUBLIC_KEY) {
      console.error("Missing WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY");
      return Response.json({ error: "Configuration Error" }, { status: 500 });
    }

    const requestBody = await req.text();
    let rawPayload;
    
    try {
      rawPayload = jwt.verify(requestBody, WEBHOOK_PUBLIC_KEY, { algorithms: ["RS256"] });
    } catch (err) {
      console.error("Invalid JWT signature", err);
      return Response.json({ error: "Invalid Signature" }, { status: 401 });
    }

    const event = JSON.parse(rawPayload.data);
    const eventData = JSON.parse(event.data);

    if (event.eventType === "wix.ecom.v1.order_approved") {
      const order = eventData.actionEvent.body.order;
      const checkoutId = order.checkoutId;

      // Find the pending subscription by checkoutId
      const pendingSubs = await base44.asServiceRole.entities.Subscription.filter({
        checkout_session_id: checkoutId
      });

      if (pendingSubs.length > 0) {
        const subToUpdate = pendingSubs[0];
        
        let subscriptionId = null;
        for (const lineItem of order.lineItems) {
          if (lineItem.subscriptionInfo) {
            subscriptionId = lineItem.subscriptionInfo.id;
            break;
          }
        }

        // Set renewal date based on billing cycle
        let renewalDate = new Date();
        if (subToUpdate.billing_cycle === 'annual') {
          renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        } else {
          renewalDate.setMonth(renewalDate.getMonth() + 1);
        }

        await base44.asServiceRole.entities.Subscription.update(subToUpdate.id, {
          status: 'active',
          wix_subscription_id: subscriptionId,
          renewal_date: renewalDate.toISOString().split('T')[0]
        });
      }
    } else if (event.eventType === "wix.ecom.subscription_contracts.v1.subscription_contract_canceled") {
      const subscriptionContract = eventData.actionEvent.body.subscriptionContract;
      const subscriptionId = subscriptionContract.id;

      const activeSubs = await base44.asServiceRole.entities.Subscription.filter({
        wix_subscription_id: subscriptionId
      });

      if (activeSubs.length > 0) {
        await base44.asServiceRole.entities.Subscription.update(activeSubs[0].id, {
          status: 'cancelled'
        });
      }
    } else if (event.eventType === "wix.ecom.subscription_contracts.v1.subscription_contract_expired") {
      const subscriptionContract = eventData.actionEvent.body.subscriptionContract;
      const subscriptionId = subscriptionContract.id;

      const activeSubs = await base44.asServiceRole.entities.Subscription.filter({
        wix_subscription_id: subscriptionId
      });

      if (activeSubs.length > 0) {
        await base44.asServiceRole.entities.Subscription.update(activeSubs[0].id, {
          status: 'expired'
        });
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});