-- Hair care and body care categories (shown in the main menu)
INSERT INTO categories (slug, kind, name, description, position) VALUES
(
  'soins-cheveux', 'type',
  '{"fr": "Soins cheveux", "en": "Hair care", "ar": "العناية بالشعر"}',
  '{"fr": "Shampoings, soins du cuir chevelu, masques et sérums capillaires coréens pour des cheveux forts, brillants et un cuir chevelu sain. Des formules douces pensées pour réparer, hydrater et limiter la chute.",
    "en": "Korean shampoos, scalp treatments, hair masks and serums for strong, shiny hair and a healthy scalp. Gentle formulas made to repair, hydrate and reduce hair fall.",
    "ar": "شامبوهات وعلاجات فروة الرأس وماسكات وسيرومات كورية لشعر قوي ولامع وفروة رأس صحية. تركيبات لطيفة لإصلاح الشعر وترطيبه والتقليل من تساقطه."}',
  15
),
(
  'soins-corps', 'type',
  '{"fr": "Soins corps", "en": "Body care", "ar": "العناية بالجسم"}',
  '{"fr": "Nettoyants, exfoliants, savons et soins coréens pour le corps : une peau douce, nette et unifiée de la tête aux pieds, y compris sur le dos et les zones sujettes aux imperfections.",
    "en": "Korean body cleansers, exfoliants, soaps and treatments: soft, clear and even skin from head to toe, including the back and blemish-prone areas.",
    "ar": "غسولات ومقشرات وصابون وعلاجات كورية للجسم: بشرة ناعمة ونقية وموحدة من الرأس حتى القدمين، بما في ذلك الظهر والمناطق المعرضة للحبوب."}',
  16
)
ON CONFLICT (slug) DO NOTHING;
