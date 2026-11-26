import { money } from './ui.jsx';

/** "06 12.." -> "212612.." for wa.me links */
export const waNumber = (phone) => phone.replace(/\D/g, '').replace(/^0/, '212');

// Sent once the order is handed to the courier, in the customer's language
const SHIPPED_MESSAGE = {
  fr: ({ name, number, toPay }) =>
    `Bonjour ${name}, bonne nouvelle ! 📦 Votre commande ${number} So Pure Skin a été expédiée et sera bientôt chez vous. Le livreur vous contactera avant de passer, merci de garder votre téléphone à proximité.${toPay ? `\n\nMontant à régler à la livraison : ${toPay}` : ''}\n\nMerci pour votre confiance ✨`,
  en: ({ name, number, toPay }) =>
    `Hello ${name}, good news! 📦 Your So Pure Skin order ${number} has been shipped and will be with you soon. The courier will call you before coming, so please keep your phone nearby.${toPay ? `\n\nAmount to pay on delivery: ${toPay}` : ''}\n\nThank you for your trust ✨`,
  ar: ({ name, number, toPay }) =>
    `مرحباً ${name}، خبر سار! 📦 تم شحن طلبك ${number} من So Pure Skin وسيصلك قريباً. سيتصل بك عامل التوصيل قبل القدوم، المرجو إبقاء هاتفك قريباً منك.${toPay ? `\n\nالمبلغ الذي يجب دفعه عند الاستلام: ${toPay}` : ''}\n\nشكراً على ثقتك ✨`,
};

/**
 * Text of the WhatsApp button for an order: "your order is shipped" once it is Expédiée,
 * otherwise the confirmation message. Accepts the detail (snake_case) or list (camelCase) shape.
 */
export function orderWhatsappText(order) {
  const name = order.customer_name ?? order.customerName;
  const bankTransfer = (order.payment_method ?? order.paymentMethod) === 'bank_transfer';
  if (order.status === 'shipped') {
    const msg = SHIPPED_MESSAGE[order.locale] || SHIPPED_MESSAGE.fr;
    return msg({ name, number: order.number, toPay: bankTransfer ? null : money(order.total) });
  }
  return `Bonjour ${name}, nous vous contactons de la part de So Pure Skin pour confirmer votre commande ${order.number} d'un montant de ${money(order.total)}. Merci !`;
}

export const orderWhatsappLink = (order) => `https://wa.me/${waNumber(order.phone)}?text=${encodeURIComponent(orderWhatsappText(order))}`;
