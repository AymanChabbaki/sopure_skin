import { useEffect } from 'react';

/**
 * Trustpilot review invitations (Automatic Feedback Service, JavaScript integration).
 * The official snippet is in index.html (every page: Trustpilot verifies the domain by finding it on the homepage);
 * this component falls back to loading it if it was missing, then asks Trustpilot to email the customer an invitation. The delay before sending (leave time for cash-on-delivery
 * shipping) and the email template are set in Trustpilot > Get reviews > Invitation settings.
 * Orders without an email address cannot be invited.
 */
const INTEGRATION_KEY = 'CTn8rohyFec1VcIp';
const invited = new Set();

function trustpilot() {
  if (!window.tp) {
    // Official loader: queues tp(...) calls until tp.min.js is ready
    window.TrustpilotObject = 'tp';
    window.tp = function tp(...args) {
      (window.tp.q = window.tp.q || []).push(args);
    };
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://invitejs.trustpilot.com/tp.min.js';
    script.onerror = () => script.remove(); // blocked by an ad blocker: the confirmation page still works
    document.head.appendChild(script);
    window.tp('register', INTEGRATION_KEY);
  }
  return window.tp;
}

export function TrustpilotInvite({ order }) {
  useEffect(() => {
    const email = order?.googleReview?.email;
    if (!order?.number || !email || invited.has(order.number)) return;
    invited.add(order.number);
    // Product reviews: sku = product id (same as g:id in the Google Merchant feed), French product page
    const products = (order.products || []).map((p) => ({
      sku: p.sku,
      productUrl: `${window.location.origin}/fr/product/${p.slug}`,
      imageUrl: p.image || undefined,
      name: p.name,
    }));
    trustpilot()('createInvitation', {
      recipientEmail: email,
      recipientName: order.customerName || undefined,
      referenceId: order.number,
      source: 'InvitationScript',
      productSkus: products.map((p) => p.sku),
      products,
    });
  }, [order]);
  return null;
}
