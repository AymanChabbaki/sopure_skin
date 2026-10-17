/**
 * Shop policies (terms of sale, returns, privacy) in the three languages.
 * Figures (fees, delays, contact) come from the admin settings so the page never contradicts the shop.
 * `s` = { casa, other, free, days, email, phone, whatsapp, city }
 */

export const POLICIES_UPDATED = '2026-10-17';

export const POLICY_SECTIONS = {
  fr: (s) => [
    {
      id: 'conditions',
      title: 'Conditions générales de vente',
      blocks: [
        ['Objet', `Les présentes conditions s'appliquent à toute commande passée sur sopureskin.com, boutique en ligne de cosmétiques coréens basée à ${s.city}, Maroc. Passer commande implique leur acceptation.`],
        ['Produits', 'Tous nos produits sont des cosmétiques coréens 100 % authentiques. Les photos et descriptions sont fournies à titre indicatif ; la texture ou l’emballage peuvent légèrement varier selon les lots du fabricant.'],
        ['Prix', 'Les prix sont indiqués en dirhams marocains (DH), toutes taxes comprises. Les frais de livraison sont affichés avant la validation de la commande. Le prix appliqué est celui affiché au moment de la commande.'],
        ['Commande', 'Après validation, vous recevez un numéro de commande. Notre équipe vous appelle ou vous écrit sur WhatsApp pour confirmer la commande avant l’expédition. Une commande injoignable ou non confirmée peut être annulée.'],
        ['Paiement', 'Le paiement se fait uniquement à la livraison, en espèces, au livreur. Aucune information bancaire ne vous est demandée sur le site.'],
        ['Livraison', `Livraison partout au Maroc : ${s.casa} DH à Casablanca, ${s.other} DH pour les autres villes, gratuite pour plus de ${s.free} produits. Délais indicatifs : 24 à 48 h à Casablanca, 2 à 4 jours ouvrés ailleurs. Vérifiez le colis en présence du livreur.`],
        ['Disponibilité', 'Nos stocks sont mis à jour en temps réel. Si un produit venait à manquer après votre commande, nous vous contactons pour vous proposer un échange ou l’annulation de ce produit.'],
      ],
    },
    {
      id: 'retours',
      title: 'Retours & remboursements',
      blocks: [
        ['Droit de rétractation', `Conformément à la loi 31-08 relative à la protection du consommateur, vous disposez de ${s.days} jours à compter de la réception pour retourner un produit, sans avoir à vous justifier.`],
        ['Conditions', 'Pour des raisons d’hygiène et de sécurité, seuls les produits non ouverts, non utilisés, dans leur emballage d’origine scellé, peuvent être repris.'],
        ['Produit abîmé ou erroné', 'Si vous recevez un produit endommagé ou différent de votre commande, contactez-nous dans les 48 h avec une photo : nous l’échangeons sans frais.'],
        ['Procédure', `Contactez-nous sur WhatsApp (${s.phone}) ou par e-mail (${s.email}) avec votre numéro de commande. Les frais de retour sont à votre charge, sauf erreur de notre part.`],
        ['Remboursement', 'Après réception et vérification du produit retourné, le remboursement est effectué au plus tard dans les 15 jours, par virement ou en espèces selon votre choix.'],
      ],
    },
    {
      id: 'confidentialite',
      title: 'Politique de confidentialité',
      blocks: [
        ['Données collectées', 'Lors d’une commande : nom, téléphone, ville, adresse et, si vous le souhaitez, e-mail. Lors de l’inscription à la newsletter : votre e-mail. Pour un avis : le prénom et la ville que vous indiquez.'],
        ['Utilisation', 'Ces données servent uniquement à traiter et livrer votre commande, à vous contacter à son sujet et, si vous l’avez demandé, à vous envoyer nos nouveautés. Nous ne vendons ni ne louons vos données.'],
        ['Partage', 'Vos nom, téléphone et adresse sont transmis au service de livraison, uniquement pour acheminer votre colis. Nos prestataires techniques (hébergement, base de données, stockage des images) n’y accèdent que pour faire fonctionner le site.'],
        ['Assistante Soso', 'Les messages écrits à notre assistante virtuelle sont traités par un service d’intelligence artificielle (Groq) pour générer les réponses. N’y indiquez pas d’informations sensibles. Les conversations ne sont pas conservées sur nos serveurs.'],
        ['Stockage dans votre navigateur', 'Le site enregistre dans votre navigateur votre panier, vos favoris, votre langue et la conversation en cours avec l’assistante. Nous n’utilisons pas de cookies publicitaires.'],
        ['Conservation', 'Les données de commande sont conservées le temps nécessaire au suivi de la commande et aux obligations comptables. Vous pouvez vous désinscrire de la newsletter à tout moment.'],
        ['Vos droits', `Conformément à la loi 09-08 relative à la protection des données personnelles, vous disposez d’un droit d’accès, de rectification et d’opposition. Écrivez-nous à ${s.email}.`],
      ],
    },
  ],

  en: (s) => [
    {
      id: 'conditions',
      title: 'Terms of sale',
      blocks: [
        ['Scope', `These terms apply to every order placed on sopureskin.com, an online Korean skincare shop based in ${s.city}, Morocco. Placing an order means you accept them.`],
        ['Products', 'All our products are 100% authentic Korean cosmetics. Photos and descriptions are for guidance; texture or packaging may vary slightly between the manufacturer’s batches.'],
        ['Prices', 'Prices are shown in Moroccan dirhams (MAD), all taxes included. Delivery fees are shown before you confirm the order. The price charged is the one displayed when you order.'],
        ['Orders', 'Once your order is placed you receive an order number. Our team calls you or writes on WhatsApp to confirm it before shipping. An order we cannot reach you about may be cancelled.'],
        ['Payment', 'Payment is cash on delivery only, to the courier. No bank details are ever requested on the website.'],
        ['Delivery', `Delivery across Morocco: ${s.casa} MAD in Casablanca, ${s.other} MAD in other cities, free for more than ${s.free} products. Usual delays: 24–48 h in Casablanca, 2–4 working days elsewhere. Please check the parcel in front of the courier.`],
        ['Availability', 'Stock is updated in real time. If a product becomes unavailable after your order, we contact you to offer an exchange or remove it from the order.'],
      ],
    },
    {
      id: 'retours',
      title: 'Returns & refunds',
      blocks: [
        ['Right of withdrawal', `Under Moroccan consumer protection law 31-08, you have ${s.days} days from delivery to return a product without giving a reason.`],
        ['Conditions', 'For hygiene and safety reasons, only unopened, unused products in their original sealed packaging can be returned.'],
        ['Damaged or wrong item', 'If a product arrives damaged or differs from your order, contact us within 48 hours with a photo and we exchange it free of charge.'],
        ['How to return', `Contact us on WhatsApp (${s.phone}) or by email (${s.email}) with your order number. Return shipping is at your expense unless we made a mistake.`],
        ['Refund', 'Once the returned product is received and checked, you are refunded within 15 days at the latest, by bank transfer or in cash as you prefer.'],
      ],
    },
    {
      id: 'confidentialite',
      title: 'Privacy policy',
      blocks: [
        ['Data we collect', 'For an order: name, phone, city, address and, if you wish, email. For the newsletter: your email. For a review: the first name and city you enter.'],
        ['How we use it', 'Only to process and deliver your order, contact you about it and, if you asked, send you our news. We never sell or rent your data.'],
        ['Sharing', 'Your name, phone and address are passed to the delivery service only to deliver your parcel. Our technical providers (hosting, database, image storage) only access it to run the website.'],
        ['Soso assistant', 'Messages written to our virtual assistant are processed by an artificial intelligence service (Groq) to generate answers. Do not share sensitive information. Conversations are not stored on our servers.'],
        ['Browser storage', 'The website stores your cart, wishlist, language and current assistant conversation in your browser. We do not use advertising cookies.'],
        ['Retention', 'Order data is kept as long as needed to follow up the order and for accounting obligations. You can unsubscribe from the newsletter at any time.'],
        ['Your rights', `Under Moroccan law 09-08 on personal data protection, you have the right to access, correct and object to the use of your data. Write to us at ${s.email}.`],
      ],
    },
  ],

  ar: (s) => [
    {
      id: 'conditions',
      title: 'الشروط العامة للبيع',
      blocks: [
        ['الموضوع', `تطبق هذه الشروط على كل طلب يتم عبر موقع sopureskin.com، متجر إلكتروني لمستحضرات التجميل الكورية مقره ${s.city}، المغرب. إتمام الطلب يعني الموافقة عليها.`],
        ['المنتجات', 'جميع منتجاتنا مستحضرات تجميل كورية أصلية 100%. الصور والأوصاف للاسترشاد فقط، وقد يختلف القوام أو التغليف قليلاً حسب دفعات الشركة المصنعة.'],
        ['الأسعار', 'الأسعار معروضة بالدرهم المغربي وتشمل جميع الضرائب. تظهر مصاريف التوصيل قبل تأكيد الطلب. السعر المعتمد هو المعروض لحظة الطلب.'],
        ['الطلب', 'بعد إتمام الطلب تحصلين على رقم الطلب. يتصل بك فريقنا أو يراسلك عبر واتساب لتأكيده قبل الشحن. قد يُلغى الطلب إذا تعذر التواصل معك.'],
        ['الدفع', 'الدفع يتم فقط عند الاستلام، نقداً لعامل التوصيل. لا نطلب أي معلومات بنكية على الموقع.'],
        ['التوصيل', `التوصيل لجميع مدن المغرب: ${s.casa} درهم في الدار البيضاء، ${s.other} درهم لباقي المدن، ومجاني عند شراء أكثر من ${s.free} منتجات. المدة التقريبية: 24 إلى 48 ساعة في الدار البيضاء، و2 إلى 4 أيام عمل في باقي المدن. يرجى التحقق من الطرد بحضور عامل التوصيل.`],
        ['التوفر', 'يتم تحديث المخزون بشكل فوري. إذا نفد منتج بعد طلبك، نتواصل معك لاقتراح استبداله أو حذفه من الطلب.'],
      ],
    },
    {
      id: 'retours',
      title: 'الإرجاع والاسترداد',
      blocks: [
        ['حق التراجع', `طبقاً للقانون 31-08 المتعلق بحماية المستهلك، لديك ${s.days} أيام من تاريخ الاستلام لإرجاع المنتج دون الحاجة لتقديم سبب.`],
        ['الشروط', 'لأسباب صحية ولسلامتك، لا نقبل إلا المنتجات غير المفتوحة وغير المستعملة وفي تغليفها الأصلي المختوم.'],
        ['منتج تالف أو خاطئ', 'إذا وصلك منتج تالف أو مختلف عن طلبك، تواصلي معنا خلال 48 ساعة مع صورة، ونستبدله مجاناً.'],
        ['طريقة الإرجاع', `تواصلي معنا عبر واتساب (${s.phone}) أو البريد الإلكتروني (${s.email}) مع رقم الطلب. مصاريف الإرجاع على حسابك إلا إذا كان الخطأ منا.`],
        ['الاسترداد', 'بعد استلام المنتج المرجع والتحقق منه، يتم الاسترداد في أجل أقصاه 15 يوماً، بتحويل بنكي أو نقداً حسب اختيارك.'],
      ],
    },
    {
      id: 'confidentialite',
      title: 'سياسة الخصوصية',
      blocks: [
        ['البيانات التي نجمعها', 'عند الطلب: الاسم، الهاتف، المدينة، العنوان، والبريد الإلكتروني إن رغبت. عند الاشتراك في النشرة: بريدك الإلكتروني. عند كتابة رأي: الاسم الأول والمدينة التي تختارينها.'],
        ['الاستعمال', 'تُستعمل هذه البيانات فقط لمعالجة طلبك وتوصيله والتواصل معك بشأنه، وإرسال جديدنا إذا طلبت ذلك. لا نبيع ولا نؤجر بياناتك.'],
        ['المشاركة', 'يُرسل اسمك وهاتفك وعنوانك إلى شركة التوصيل فقط لإيصال طردك. مزودونا التقنيون (الاستضافة، قاعدة البيانات، تخزين الصور) لا يطّلعون عليها إلا لتشغيل الموقع.'],
        ['المساعدة سوسو', 'تتم معالجة الرسائل الموجهة إلى مساعدتنا الافتراضية عبر خدمة ذكاء اصطناعي (Groq) لتوليد الأجوبة. لا تشاركي معلومات حساسة. لا نحتفظ بالمحادثات على خوادمنا.'],
        ['التخزين في المتصفح', 'يحفظ الموقع في متصفحك سلة المشتريات والمفضلة واللغة والمحادثة الجارية مع المساعدة. لا نستعمل ملفات تعريف الارتباط الإعلانية.'],
        ['مدة الاحتفاظ', 'نحتفظ ببيانات الطلب طوال المدة اللازمة لتتبعه وللالتزامات المحاسبية. يمكنك إلغاء الاشتراك في النشرة في أي وقت.'],
        ['حقوقك', `طبقاً للقانون 09-08 المتعلق بحماية المعطيات الشخصية، لك الحق في الولوج إلى بياناتك وتصحيحها والاعتراض على استعمالها. راسلينا على ${s.email}.`],
      ],
    },
  ],
};
