import { useEffect } from 'react';

const MERCHANT_ID = 5875716384;
let platform;
const renderedOrders = new Set();

function loadPlatform() {
  if (!platform) {
    platform = new Promise((resolve, reject) => {
      window.renderOptIn = resolve;
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/platform.js?onload=renderOptIn';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        script.remove();
        platform = undefined;
        reject(new Error('Google Customer Reviews unavailable'));
      };
      document.body.appendChild(script);
    });
  }
  return platform;
}

export function GoogleMerchantWidget() {
  useEffect(() => {
    if (document.getElementById('merchantWidgetScript')) return;
    const script = document.createElement('script');
    script.id = 'merchantWidgetScript';
    script.src = 'https://www.gstatic.com/shopping/merchant/merchantwidget.js';
    script.defer = true;
    script.onload = () => window.merchantwidget?.start({
      merchant_id: MERCHANT_ID,
      position: 'LEFT_BOTTOM',
      // Leave room for Soso, including its raised position on product pages.
      bottomMargin: 120,
      mobileBottomMargin: 250,
    });
    script.onerror = () => script.remove();
    document.head.appendChild(script);
  }, []);
  return null;
}

export function GoogleReviewOptIn({ order }) {
  useEffect(() => {
    const review = order?.googleReview;
    if (!order?.number || !review?.email || !review.estimatedDeliveryDate || renderedOrders.has(order.number)) return;
    let active = true;
    loadPlatform().then(() => {
      if (!active) return;
      window.gapi.load('surveyoptin', () => {
        if (!active || renderedOrders.has(order.number)) return;
        window.gapi.surveyoptin.render({
          merchant_id: MERCHANT_ID,
          order_id: order.number,
          email: review.email,
          delivery_country: 'MA',
          estimated_delivery_date: review.estimatedDeliveryDate,
        });
        renderedOrders.add(order.number);
      });
    }).catch(() => { /* A blocked Google script must not interrupt confirmation. */ });
    return () => { active = false; };
  }, [order]);
  return null;
}
