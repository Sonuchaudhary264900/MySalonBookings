// Default catalog data — used by POST /admin/catalog/seed with { useDefaults: true }
// One entry per service. businessType + category + name must be unique.

function rows(businessType, category, names, orderStart) {
  return names.map((name, i) => ({ businessType, category, subCategory: '', name, order: orderStart + i }));
}

const catalog = [];
let o = 0;

// ─── BARBERSHOP ────────────────────────────────────────────────────────────────
catalog.push(...rows('barbershop','Hair Services',['Haircut','Fade Haircut','Kids Haircut','Hair Styling','Hair Wash'],o)); o+=10;
catalog.push(...rows('barbershop','Beard & Shaving',['Beard Trim','Beard Shaping','Beard Fade','Clean Shave','Hot Towel Shave'],o)); o+=10;
catalog.push(...rows('barbershop','Hair Treatment',['Hair Spa','Anti-Dandruff Treatment','Hair Fall Treatment','Keratin Treatment'],o)); o+=10;
catalog.push(...rows('barbershop','Hair Colour',['Hair Colour','Highlights','Grey Coverage'],o)); o+=10;
catalog.push(...rows('barbershop','Face & Skin',['Cleanup','Facial','De-Tan','Charcoal Facial','Anti-Acne Treatment'],o)); o+=10;
catalog.push(...rows('barbershop','Relaxation',['Head Massage','Head + Neck + Shoulder Massage'],o)); o+=10;

// ─── SALON — Men ─────────────────────────────────────────────────────────────
catalog.push(...rows('salon','Hair Services (Men)',['Haircut','Fade Haircut','Kids Haircut','Long Hair Cut','Hair Styling','Hair Wash','Blow Dry','Texture Styling'],o)); o+=10;
catalog.push(...rows('salon','Beard & Grooming (Men)',['Beard Trim','Beard Shaping','Beard Fade','Clean Shave','Hot Towel Shave','Royal Shave'],o)); o+=10;
catalog.push(...rows('salon','Hair Treatment (Men)',['Hair Spa','Anti-Dandruff Treatment','Hair Fall Treatment','Scalp Detox','Keratin Treatment','Hair Smoothening','Deep Conditioning'],o)); o+=10;
catalog.push(...rows('salon','Hair Colour (Men)',['Hair Colour','Highlights','Grey Coverage'],o)); o+=10;
catalog.push(...rows('salon','Face & Skin (Men)',['Cleanup','Facial','De-Tan','Charcoal Facial','Anti-Acne Treatment','Blackhead Removal','Skin Brightening'],o)); o+=10;
catalog.push(...rows('salon','Relaxation (Men)',['Head Massage','Oil Head Massage','Head + Neck + Shoulder Massage'],o)); o+=10;

// ─── SALON — Women ────────────────────────────────────────────────────────────
catalog.push(...rows('salon','Hair Services (Women)',['Haircut','Layer Cut','Step Cut','Kids Haircut','Hair Styling','Blow Dry','Hair Wash','Straightening','Curling','Party Hairstyle','Bridal Hairstyle'],o)); o+=10;
catalog.push(...rows('salon','Hair Colour (Women)',['Hair Colour','Highlights','Global Hair Colour','Grey Coverage'],o)); o+=10;
catalog.push(...rows('salon','Hair Treatment (Women)',['Hair Spa','Hair Fall Treatment','Dandruff Treatment','Deep Conditioning','Keratin Treatment','Hair Smoothening','Hair Straightening'],o)); o+=10;
catalog.push(...rows('salon','Skin & Face (Women)',['Cleanup','Facial','De-Tan','Bleach','Charcoal Facial','Skin Brightening','Anti-Acne Treatment','Dark Circle Treatment','Blackhead Removal'],o)); o+=10;
catalog.push(...rows('salon','Threading',['Eyebrow Threading','Upper Lip Threading','Full Face Threading'],o)); o+=10;
catalog.push(...rows('salon','Waxing',['Full Arms Wax','Half Arms Wax','Full Legs Wax','Half Legs Wax','Underarms Wax','Face Wax'],o)); o+=10;
catalog.push(...rows('salon','Nail Services',['Manicure','Pedicure','Spa Manicure','Spa Pedicure','Nail Art','Gel Nails','Nail Extensions'],o)); o+=10;
catalog.push(...rows('salon','Relaxation (Women)',['Head Massage','Oil Head Massage','Head + Neck + Shoulder Massage'],o)); o+=10;

// ─── MAKEUP & BRIDAL ──────────────────────────────────────────────────────────
catalog.push(...rows('makeup_bridal','Makeup Services',['Bridal Makeup','Airbrush Bridal Makeup','Engagement Makeup','Party Makeup','On-Location Makeup Service'],o)); o+=10;
catalog.push(...rows('makeup_bridal','Hairstyling',['Bridal Hairstyling','Party Hairstyling','Hair Extensions Styling'],o)); o+=10;
catalog.push(...rows('makeup_bridal','Draping & Dressing',['Saree Draping','Lehenga Draping','Bridal Dressing Assistance'],o)); o+=10;
catalog.push(...rows('makeup_bridal','Pre-Bridal',['Pre-Bridal Skin Care','Pre-Bridal Hair Care','Full Pre-Bridal Package'],o)); o+=10;
catalog.push(...rows('makeup_bridal','Grooming Add-ons',['Eyebrow Shaping','Manicure & Pedicure (Bridal)','Full Body Wax (Bridal Prep)'],o)); o+=10;

// ─── SPA & WELLNESS ───────────────────────────────────────────────────────────
catalog.push(...rows('spa_wellness','Basic Massage',['Head Massage','Neck & Shoulder Massage','Back Massage','Foot Massage'],o)); o+=10;
catalog.push(...rows('spa_wellness','Full Body Massage',['Full Body Massage','Relaxation Massage','Deep Tissue Massage'],o)); o+=10;
catalog.push(...rows('spa_wellness','Premium Therapies',['Aroma Therapy Massage','Hot Stone Massage'],o)); o+=10;
catalog.push(...rows('spa_wellness','Body Spa',['Body Spa','Body Polish'],o)); o+=10;
catalog.push(...rows('spa_wellness','Wellness Therapy',['Stress Relief Therapy','Sleep Therapy'],o)); o+=10;
catalog.push(...rows('spa_wellness','Special Care',['Pre-Bridal Spa','Pregnancy Safe Massage'],o)); o+=10;

// ─── SKIN & DERMA ─────────────────────────────────────────────────────────────
catalog.push(...rows('skin_derma','Hair & Scalp',['Hair Fall Consultation','Hair Regrowth Therapy','Male Pattern Baldness Treatment','PRP Hair Therapy','Dandruff Treatment','Hair Fall Treatment','Hair Thinning Treatment','Hormonal Hair Loss Treatment'],o)); o+=10;
catalog.push(...rows('skin_derma','Skin (Face)',['Acne Treatment','Acne Scar Treatment','Detan Treatment','Open Pores Treatment','Skin Brightening Treatment','Dark Circles Treatment','Pigmentation Treatment'],o)); o+=10;
catalog.push(...rows('skin_derma','Advanced Treatments',['Chemical Peel','Laser Treatment','Hydrafacial (Medical Grade)','Laser Skin Treatment','Skin Rejuvenation'],o)); o+=10;
catalog.push(...rows('skin_derma','Anti-Aging',['Anti-Aging Treatment','Wrinkle Reduction'],o)); o+=10;
catalog.push(...rows('skin_derma','Body Skin',['Back Acne Treatment','Body Acne Treatment','Skin Allergy Treatment','Underarm Pigmentation Treatment'],o)); o+=10;
catalog.push(...rows('skin_derma','Beard & Face Issues',['Beard Growth Therapy','Ingrown Hair Treatment','Razor Bumps Treatment'],o)); o+=10;
catalog.push(...rows('skin_derma','Consultation',['General Skin Consultation','Hair Specialist Consultation','Online Dermatologist Consultation'],o)); o+=10;

module.exports = catalog;