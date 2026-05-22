// Default catalog data — used by POST /admin/catalog/seed with { useDefaults: true }
// One entry per service. businessType + category + subCategory + name must be unique.

function rows(businessType, category, subCategory, names, orderStart) {
  return names.map((name, i) => ({ businessType, category, subCategory, name, order: orderStart + i }));
}

const catalog = [];
let o = 0;

// ─── BARBERSHOP ────────────────────────────────────────────────────────────────
catalog.push(...rows('barbershop','Hair Services','Haircuts',['Haircut','Fade Haircut','Kids Haircut'],o)); o+=10;
catalog.push(...rows('barbershop','Hair Services','Styling',['Hair Styling','Hair Wash'],o)); o+=10;

catalog.push(...rows('barbershop','Beard & Shaving','Beard Grooming',['Beard Trim','Beard Shaping','Beard Fade'],o)); o+=10;
catalog.push(...rows('barbershop','Beard & Shaving','Shaving',['Clean Shave','Hot Towel Shave'],o)); o+=10;

catalog.push(...rows('barbershop','Hair Treatment','Hair Care',['Hair Spa','Anti-Dandruff Treatment','Hair Fall Treatment'],o)); o+=10;
catalog.push(...rows('barbershop','Hair Treatment','Premium Treatment',['Keratin Treatment'],o)); o+=10;

catalog.push(...rows('barbershop','Hair Colour','Colour Services',['Hair Colour','Highlights','Grey Coverage'],o)); o+=10;

catalog.push(...rows('barbershop','Face & Skin','Face Care',['Cleanup','Facial','De-Tan'],o)); o+=10;
catalog.push(...rows('barbershop','Face & Skin','Skin Care',['Charcoal Facial','Anti-Acne Treatment'],o)); o+=10;

catalog.push(...rows('barbershop','Relaxation','Massage',['Head Massage','Head + Neck + Shoulder Massage'],o)); o+=10;

// ─── SALON — Men ─────────────────────────────────────────────────────────────
catalog.push(...rows('salon','Hair Services (Men)','Haircuts',['Haircut','Fade Haircut','Kids Haircut','Long Hair Cut'],o)); o+=10;
catalog.push(...rows('salon','Hair Services (Men)','Styling',['Hair Styling','Hair Wash','Blow Dry','Texture Styling'],o)); o+=10;

catalog.push(...rows('salon','Beard & Grooming (Men)','Beard Grooming',['Beard Trim','Beard Shaping','Beard Fade'],o)); o+=10;
catalog.push(...rows('salon','Beard & Grooming (Men)','Shaving',['Clean Shave','Hot Towel Shave','Royal Shave'],o)); o+=10;

catalog.push(...rows('salon','Hair Treatment (Men)','Hair Care',['Hair Spa','Anti-Dandruff Treatment','Hair Fall Treatment','Scalp Detox'],o)); o+=10;
catalog.push(...rows('salon','Hair Treatment (Men)','Premium Treatments',['Keratin Treatment','Hair Smoothening','Deep Conditioning'],o)); o+=10;

catalog.push(...rows('salon','Hair Colour (Men)','Colour Services',['Hair Colour','Highlights','Grey Coverage'],o)); o+=10;

catalog.push(...rows('salon','Face & Skin (Men)','Face Care',['Cleanup','Facial','De-Tan','Charcoal Facial'],o)); o+=10;
catalog.push(...rows('salon','Face & Skin (Men)','Skin Care',['Anti-Acne Treatment','Blackhead Removal','Skin Brightening'],o)); o+=10;

catalog.push(...rows('salon','Relaxation (Men)','Massage',['Head Massage','Oil Head Massage','Head + Neck + Shoulder Massage'],o)); o+=10;

// ─── SALON — Women ────────────────────────────────────────────────────────────
catalog.push(...rows('salon','Hair Services (Women)','Haircuts',['Haircut','Layer Cut','Step Cut','Kids Haircut'],o)); o+=10;
catalog.push(...rows('salon','Hair Services (Women)','Styling',['Hair Styling','Blow Dry','Hair Wash','Straightening','Curling','Party Hairstyle','Bridal Hairstyle'],o)); o+=10;

catalog.push(...rows('salon','Hair Colour (Women)','Colour Services',['Hair Colour','Highlights','Global Hair Colour','Grey Coverage'],o)); o+=10;

catalog.push(...rows('salon','Hair Treatment (Women)','Hair Care',['Hair Spa','Hair Fall Treatment','Dandruff Treatment','Deep Conditioning'],o)); o+=10;
catalog.push(...rows('salon','Hair Treatment (Women)','Premium Treatments',['Keratin Treatment','Hair Smoothening','Hair Straightening'],o)); o+=10;

catalog.push(...rows('salon','Skin & Face (Women)','Face Care',['Cleanup','Facial','De-Tan','Bleach','Charcoal Facial'],o)); o+=10;
catalog.push(...rows('salon','Skin & Face (Women)','Skin Care',['Skin Brightening','Anti-Acne Treatment','Dark Circle Treatment','Blackhead Removal'],o)); o+=10;

catalog.push(...rows('salon','Threading','Facial Threading',['Eyebrow Threading','Upper Lip Threading','Full Face Threading'],o)); o+=10;

catalog.push(...rows('salon','Waxing','Body Waxing',['Full Arms Wax','Half Arms Wax','Full Legs Wax','Half Legs Wax','Underarms Wax','Face Wax'],o)); o+=10;

catalog.push(...rows('salon','Nail Services','Basic Nail Care',['Manicure','Pedicure','Spa Manicure','Spa Pedicure'],o)); o+=10;
catalog.push(...rows('salon','Nail Services','Nail Styling',['Nail Art','Gel Nails','Nail Extensions'],o)); o+=10;

catalog.push(...rows('salon','Relaxation (Women)','Massage',['Head Massage','Oil Head Massage','Head + Neck + Shoulder Massage'],o)); o+=10;

// ─── MAKEUP & BRIDAL ──────────────────────────────────────────────────────────
catalog.push(...rows('makeup_bridal','Makeup Services','Bridal Makeup',['Bridal Makeup','Airbrush Bridal Makeup'],o)); o+=10;
catalog.push(...rows('makeup_bridal','Makeup Services','Event Makeup',['Engagement Makeup','Party Makeup'],o)); o+=10;
catalog.push(...rows('makeup_bridal','Makeup Services','Special Services',['On-Location Makeup Service'],o)); o+=10;

catalog.push(...rows('makeup_bridal','Hairstyling','Bridal & Party Styling',['Bridal Hairstyling','Party Hairstyling','Hair Extensions Styling'],o)); o+=10;

catalog.push(...rows('makeup_bridal','Draping & Dressing','Dressing Services',['Saree Draping','Lehenga Draping','Bridal Dressing Assistance'],o)); o+=10;

catalog.push(...rows('makeup_bridal','Pre-Bridal','Pre-Bridal Care',['Pre-Bridal Skin Care','Pre-Bridal Hair Care','Full Pre-Bridal Package'],o)); o+=10;

catalog.push(...rows('makeup_bridal','Grooming Add-ons','Bridal Grooming',['Eyebrow Shaping','Manicure & Pedicure (Bridal)','Full Body Wax (Bridal Prep)'],o)); o+=10;

// ─── SPA & WELLNESS ───────────────────────────────────────────────────────────
catalog.push(...rows('spa_wellness','Basic Massage','Men',['Head Massage','Neck & Shoulder Massage','Back Massage','Foot Massage'],o)); o+=10;
catalog.push(...rows('spa_wellness','Basic Massage','Female',['Head Massage','Neck & Shoulder Massage','Back Massage','Foot Massage'],o)); o+=10;

catalog.push(...rows('spa_wellness','Full Body Massage','Men',['Full Body Massage','Relaxation Massage','Deep Tissue Massage'],o)); o+=10;
catalog.push(...rows('spa_wellness','Full Body Massage','Female',['Full Body Massage','Relaxation Massage','Deep Tissue Massage'],o)); o+=10;

catalog.push(...rows('spa_wellness','Premium Therapies','Men',['Aroma Therapy Massage','Hot Stone Massage'],o)); o+=10;
catalog.push(...rows('spa_wellness','Premium Therapies','Female',['Aroma Therapy Massage','Hot Stone Massage'],o)); o+=10;

catalog.push(...rows('spa_wellness','Body Spa','Men',['Body Spa','Body Polish'],o)); o+=10;
catalog.push(...rows('spa_wellness','Body Spa','Female',['Body Spa','Body Polish'],o)); o+=10;

catalog.push(...rows('spa_wellness','Wellness Therapy','Men',['Stress Relief Therapy'],o)); o+=10;
catalog.push(...rows('spa_wellness','Wellness Therapy','Female',['Stress Relief Therapy','Sleep Therapy'],o)); o+=10;

catalog.push(...rows('spa_wellness','Special Care','Female',['Pre-Bridal Spa','Pregnancy Safe Massage'],o)); o+=10;

// ─── SKIN & DERMA ─────────────────────────────────────────────────────────────
catalog.push(...rows('skin_derma','Hair & Scalp','Men',['Hair Fall Consultation','Hair Regrowth Therapy','Male Pattern Baldness Treatment','PRP Hair Therapy','Dandruff Treatment'],o)); o+=10;
catalog.push(...rows('skin_derma','Hair & Scalp','Female',['Hair Fall Treatment','Hair Thinning Treatment','Hormonal Hair Loss Treatment','PRP Hair Therapy','Dandruff Treatment'],o)); o+=10;

catalog.push(...rows('skin_derma','Skin (Face)','Men',['Acne Treatment','Acne Scar Treatment','Detan Treatment','Open Pores Treatment','Skin Brightening Treatment'],o)); o+=10;
catalog.push(...rows('skin_derma','Skin (Face)','Female',['Acne Treatment','Acne Scar Treatment','Dark Circles Treatment','Detan Treatment','Open Pores Treatment','Pigmentation Treatment','Skin Brightening Treatment'],o)); o+=10;

catalog.push(...rows('skin_derma','Advanced Treatments','Men',['Chemical Peel','Laser Treatment'],o)); o+=10;
catalog.push(...rows('skin_derma','Advanced Treatments','Female',['Chemical Peel','Hydrafacial (Medical Grade)','Laser Skin Treatment','Skin Rejuvenation'],o)); o+=10;

catalog.push(...rows('skin_derma','Anti-Aging','Female',['Anti-Aging Treatment','Wrinkle Reduction'],o)); o+=10;

catalog.push(...rows('skin_derma','Body Skin','Men',['Back Acne Treatment','Body Acne Treatment','Skin Allergy Treatment'],o)); o+=10;
catalog.push(...rows('skin_derma','Body Skin','Female',['Back Acne Treatment','Body Acne Treatment','Skin Allergy Treatment','Underarm Pigmentation Treatment'],o)); o+=10;

catalog.push(...rows('skin_derma','Beard & Face Issues','Men',['Beard Growth Therapy','Ingrown Hair Treatment','Razor Bumps Treatment'],o)); o+=10;

catalog.push(...rows('skin_derma','Consultation','General',['General Skin Consultation','Hair Specialist Consultation','Online Dermatologist Consultation'],o)); o+=10;

module.exports = catalog;
