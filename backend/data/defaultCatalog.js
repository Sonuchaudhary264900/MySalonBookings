// Default catalog data — used by POST /admin/catalog/seed with { useDefaults: true }
// One entry per service. businessType + category + subCategory + name must be unique.

function rows(businessType, category, subCategory, names, orderStart) {
  return names.map((name, i) => ({ businessType, category, subCategory, name, order: orderStart + i }));
}

const catalog = [];
let o = 0;

// ─── BARBERSHOP ────────────────────────────────────────────────────────────────
catalog.push(...rows('barbershop','Hair Services','Basic Haircuts',['Classic Haircut','Trim / Maintenance Cut','Kids Haircut','Senior Citizen Haircut'],o)); o+=10;
catalog.push(...rows('barbershop','Hair Services','Precision Cuts',['Low Fade','Mid Fade','High Fade','Taper Fade','Skin Fade / Bald Fade','Buzz Cut','Crew Cut','Caesar Cut'],o)); o+=10;
catalog.push(...rows('barbershop','Hair Services','Advanced / Trend Cuts',['Undercut','Pompadour','Quiff','Slick Back','Textured Crop','Modern Mullet','Fringe / Bangs Style'],o)); o+=10;
catalog.push(...rows('barbershop','Hair Services','Long Hair Services',['Layered Cut','Straight Cut','Volume Reduction','Split-End Cutting','Long Hair Styling'],o)); o+=10;
catalog.push(...rows('barbershop','Hair Services','Hair Art & Detailing',['Hair Tattoo / Design','Line-up / Edge-up','Hard Part / Razor Part','Fade Patterns'],o)); o+=10;
catalog.push(...rows('barbershop','Hair Services','Hair Styling',['Blow Dry','Hair Wax Styling','Gel Styling','Clay Styling','Party / Event Styling'],o)); o+=10;

catalog.push(...rows('barbershop','Beard & Shaving','Shaving',['Basic Shave','Razor Shave','Straight Razor Shave','Hot Towel Shave','Royal Shave','Head Shave'],o)); o+=10;
catalog.push(...rows('barbershop','Beard & Shaving','Beard Grooming',['Beard Trim','Beard Shaping','Beard Fade','Beard Sculpting'],o)); o+=10;
catalog.push(...rows('barbershop','Beard & Shaving','Mustache Services',['Mustache Trim','Mustache Styling','Handlebar Styling'],o)); o+=10;
catalog.push(...rows('barbershop','Beard & Shaving','Beard Treatments',['Beard Conditioning','Beard Spa','Hot Oil Beard Treatment','Beard Straightening','Beard Smoothening'],o)); o+=10;

catalog.push(...rows('barbershop','Hair Colour & Chemical','Natural Colour',['Grey Coverage','Grey Blending','Beard Colouring','Mustache Colour'],o)); o+=10;
catalog.push(...rows('barbershop','Hair Colour & Chemical','Fashion Colour',['Global Hair Colour','Highlights','Lowlights','Balayage','Ombre'],o)); o+=10;
catalog.push(...rows('barbershop','Hair Colour & Chemical','Creative Colour',['Fantasy Colours','Neon Colours','Colour + Fade Design'],o)); o+=10;
catalog.push(...rows('barbershop','Hair Colour & Chemical','Chemical Treatments',['Hair Smoothening','Hair Rebonding','Hair Relaxing','Perming','Keratin Treatment'],o)); o+=10;

catalog.push(...rows('barbershop','Skincare & Face','Facial Services',['Basic Clean-up','Deep Cleansing Facial','Anti-Aging Facial','De-tan Facial','Hydration Facial','Acne Treatment Facial'],o)); o+=10;
catalog.push(...rows('barbershop','Skincare & Face','Skin Treatments',['Blackhead Removal','Whitehead Removal','Pimple Treatment','Skin Polishing'],o)); o+=10;
catalog.push(...rows('barbershop','Skincare & Face','Grooming Details',['Eyebrow Threading','Eyebrow Waxing','Ear Hair Removal','Nose Hair Removal','Face Waxing'],o)); o+=10;
catalog.push(...rows('barbershop','Skincare & Face','Advanced Aesthetic',['Skin Tightening','Face Massage','LED Facial Therapy'],o)); o+=10;

catalog.push(...rows('barbershop','Scalp & Hair Health','Scalp Treatments',['Anti-Dandruff Treatment','Scalp Detox','Hair Fall Control','Hair Growth Therapy','Scalp Nourishment Therapy'],o)); o+=10;
catalog.push(...rows('barbershop','Scalp & Hair Health','Oil & Therapy',['Head Oil Massage','Deep Conditioning Treatment','Protein Treatment'],o)); o+=10;

catalog.push(...rows('barbershop','Wellness & Relaxation','Massage Services',['Head Massage','Neck Massage','Shoulder Massage','Head + Neck + Shoulder Combo'],o)); o+=10;
catalog.push(...rows('barbershop','Wellness & Relaxation','Relaxation Services',['Stress Relief Therapy','Relaxation Package'],o)); o+=10;

catalog.push(...rows('barbershop','Hand & Foot Grooming','Hand Care',['Express Manicure','Nail Cleaning','Nail Shaping'],o)); o+=10;
catalog.push(...rows('barbershop','Hand & Foot Grooming','Foot Care',['Express Pedicure','Foot Cleaning','Heel Repair'],o)); o+=10;

// ─── MAKEUP & BRIDAL ──────────────────────────────────────────────────────────
catalog.push(...rows('makeup_bridal','Makeup Services','Bridal Makeup',['Bridal Makeup','HD Bridal Makeup','Airbrush Bridal Makeup'],o)); o+=10;
catalog.push(...rows('makeup_bridal','Makeup Services','Event Makeup',['Engagement Makeup','Party Makeup','Reception Makeup','Cocktail Makeup'],o)); o+=10;
catalog.push(...rows('makeup_bridal','Makeup Services','Special Services',['Trial Makeup','Makeup Consultation','On-Location Makeup Service','Photoshoot Makeup'],o)); o+=10;

catalog.push(...rows('makeup_bridal','Hairstyling','Bridal & Events',['Bridal Hairstyling','Engagement Hairstyling','Reception Hairstyling','Party Hairstyling'],o)); o+=10;
catalog.push(...rows('makeup_bridal','Hairstyling','Styling',['Hair Extensions Styling'],o)); o+=10;

catalog.push(...rows('makeup_bridal','Draping & Dressing','Draping',['Saree Draping','Lehenga Draping','Dupatta Draping'],o)); o+=10;
catalog.push(...rows('makeup_bridal','Draping & Dressing','Assistance',['Bridal Dressing Assistance'],o)); o+=10;

catalog.push(...rows('makeup_bridal','Pre-Bridal','Skin & Hair Care',['Pre-Bridal Skin Care','Pre-Bridal Hair Care'],o)); o+=10;
catalog.push(...rows('makeup_bridal','Pre-Bridal','Packages & Consultation',['Full Pre-Bridal Package','Bridal Consultation'],o)); o+=10;

catalog.push(...rows('makeup_bridal','Grooming Add-ons','Grooming',['Eyebrow Shaping','Upper Lip / Face Cleanup','Manicure & Pedicure (Bridal)','Full Body Wax (Bridal Prep)'],o)); o+=10;

catalog.push(...rows('makeup_bridal','Premium Add-ons','Premium',['False Eyelashes','Lens Application','High-End Product Upgrade','Touch-Up Services (Hourly / Event)'],o)); o+=10;

// ─── SPA & WELLNESS (unisex — sections label Men / Female inside) ─────────────
catalog.push(...rows('spa_wellness','Basic Massage','Men',['Head Massage','Neck & Shoulder Massage','Back Massage','Foot Massage','Hand Massage'],o)); o+=10;
catalog.push(...rows('spa_wellness','Basic Massage','Female',['Head Massage','Neck & Shoulder Massage','Back Massage','Foot Massage','Hand Massage'],o)); o+=10;

catalog.push(...rows('spa_wellness','Full Body Massage','Men',['Full Body Massage','Relaxation Massage','Deep Tissue Massage','Swedish Massage'],o)); o+=10;
catalog.push(...rows('spa_wellness','Full Body Massage','Female',['Full Body Massage','Relaxation Massage','Deep Tissue Massage','Swedish Massage'],o)); o+=10;

catalog.push(...rows('spa_wellness','Premium Therapies','Men',['Aroma Therapy Massage','Hot Stone Massage','Thai Massage','Balinese Massage'],o)); o+=10;
catalog.push(...rows('spa_wellness','Premium Therapies','Female',['Aromatherapy Massage','Hot Stone Massage','Thai Massage','Balinese Massage','Signature Spa Therapy'],o)); o+=10;

catalog.push(...rows('spa_wellness','Body Spa','Men',['Body Spa','Body Polishing','Body Scrub','Body Wrap'],o)); o+=10;
catalog.push(...rows('spa_wellness','Body Spa','Female',['Body Spa','Body Polishing','Body Scrub','Body Wrap'],o)); o+=10;

catalog.push(...rows('spa_wellness','Wellness Therapy','Men',['Stress Relief Therapy','Muscle Recovery Therapy','Detox Therapy'],o)); o+=10;
catalog.push(...rows('spa_wellness','Wellness Therapy','Female',['Stress Relief Therapy','Muscle Relaxation Therapy','Detox Therapy','Sleep Therapy'],o)); o+=10;

catalog.push(...rows('spa_wellness','Special Care','Female',['Pre-Bridal Spa','Post-Bridal Relaxation','Pregnancy Safe Massage'],o)); o+=10;

// ─── SKIN & DERMA (unisex — sections label Men / Female inside) ───────────────
catalog.push(...rows('skin_derma','Hair & Scalp','Men',['Hair Fall Consultation','Hair Regrowth Therapy','Male Pattern Baldness Treatment','Alopecia Treatment','PRP Hair Therapy','Scalp Infection Treatment'],o)); o+=10;
catalog.push(...rows('skin_derma','Hair & Scalp','Female',['Hair Fall Treatment','Hair Thinning Treatment','Hormonal Hair Loss Treatment','Alopecia Treatment','PRP Hair Therapy','Scalp Infection Treatment','Dandruff Treatment'],o)); o+=10;

catalog.push(...rows('skin_derma','Skin (Face)','Men',['Acne Treatment','Acne Scar Treatment','Detan Treatment','Open Pores Treatment','Skin Brightening Treatment'],o)); o+=10;
catalog.push(...rows('skin_derma','Skin (Face)','Female',['Acne Treatment','Acne Scar Treatment','Dark Circles Treatment','Detan Treatment','Open Pores Treatment','Pigmentation Treatment','Skin Brightening Treatment','Uneven Skin Tone Treatment'],o)); o+=10;

catalog.push(...rows('skin_derma','Advanced Treatments','Men',['Chemical Peel','Laser Treatment','Skin Tightening'],o)); o+=10;
catalog.push(...rows('skin_derma','Advanced Treatments','Female',['Chemical Peel','Hydrafacial (Medical Grade)','Laser Skin Treatment','Skin Rejuvenation','Skin Tightening'],o)); o+=10;

catalog.push(...rows('skin_derma','Anti-Aging','Female',['Anti-Aging Treatment','Collagen Boost Therapy','Fine Line Treatment','Skin Lifting Treatment','Wrinkle Reduction'],o)); o+=10;

catalog.push(...rows('skin_derma','Body Skin','Men',['Back Acne Treatment','Body Acne Treatment','Skin Allergy Treatment','Stretch Marks Treatment'],o)); o+=10;
catalog.push(...rows('skin_derma','Body Skin','Female',['Back Acne Treatment','Body Acne Treatment','Skin Allergy Treatment','Stretch Marks Treatment','Underarm Pigmentation Treatment'],o)); o+=10;

catalog.push(...rows('skin_derma','Beard & Face Issues','Men',['Beard Growth Therapy','Beard Patch Treatment','Ingrown Hair Treatment','Razor Bumps Treatment','Skin Irritation Treatment (After Shaving)'],o)); o+=10;

catalog.push(...rows('skin_derma','Consultation','Men',['General Skin Consultation','Follow-up Consultation','Hair Specialist Consultation','Online Dermatologist Consultation'],o)); o+=10;
catalog.push(...rows('skin_derma','Consultation','Female',['General Skin Consultation','Follow-up Consultation','Hair Specialist Consultation','Online Dermatologist Consultation'],o)); o+=10;

// ─── SALON — Male ─────────────────────────────────────────────────────────────
catalog.push(...rows('salon','Hair Services (Men)','Basic Haircuts',['Classic Haircut','Trim / Maintenance Cut','Kids Haircut','Senior Citizen Haircut'],o)); o+=10;
catalog.push(...rows('salon','Hair Services (Men)','Precision Cuts',['Low Fade','Mid Fade','High Fade','Taper Fade','Skin Fade / Bald Fade','Buzz Cut','Crew Cut','Caesar Cut'],o)); o+=10;
catalog.push(...rows('salon','Hair Services (Men)','Advanced Cuts',['Undercut','Pompadour','Quiff','Slick Back','Textured Crop','Modern Mullet','Fringe / Bangs Style'],o)); o+=10;
catalog.push(...rows('salon','Hair Services (Men)','Hair Art & Detailing',['Hair Tattoo / Design','Line-up / Edge-up','Hard Part / Razor Part','Fade Patterns'],o)); o+=10;
catalog.push(...rows('salon','Hair Services (Men)','Hair Styling',['Blow Dry','Hair Wax Styling','Gel Styling','Clay Styling','Party / Event Styling'],o)); o+=10;

catalog.push(...rows('salon','Beard & Grooming (Men)','Shaving',['Basic Shave','Hot Towel Shave','Straight Razor Shave','Royal Shave','Head Shave'],o)); o+=10;
catalog.push(...rows('salon','Beard & Grooming (Men)','Beard Grooming',['Beard Trim','Beard Shaping','Beard Fade','Beard Sculpting'],o)); o+=10;
catalog.push(...rows('salon','Beard & Grooming (Men)','Mustache',['Mustache Trim','Mustache Styling','Handlebar Styling'],o)); o+=10;
catalog.push(...rows('salon','Beard & Grooming (Men)','Beard Treatments',['Beard Conditioning','Beard Spa','Hot Oil Beard Treatment','Beard Smoothening'],o)); o+=10;

catalog.push(...rows('salon','Hair Services (Women)','Haircuts',['Haircut (Layer / Step / Trim)','Advanced Haircut','Fringe / Bangs Cut','U-Cut','V-Cut','Feather Cut','Blunt Cut','Kids Haircut'],o)); o+=10;
catalog.push(...rows('salon','Hair Services (Women)','Hair Styling',['Hair Styling (Straight / Curl / Party)','Blow Dry','Hair Ironing','Hair Curling','Party Hairstyle','Bridal Hairstyle','Engagement Hairstyle','Reception Hairstyle'],o)); o+=10;
catalog.push(...rows('salon','Hair Services (Women)','Hair Color',['Hair Coloring','Global Hair Color','Highlights','Balayage','Ombre','Root Touch-Up','Fashion Color','Grey Coverage','Hair Extension Installation'],o)); o+=10;
catalog.push(...rows('salon','Hair Services (Women)','Hair Treatments',['Hair Spa','Hair Smoothening','Hair Straightening','Keratin Treatment','Hair Botox','Rebonding','Cysteine Treatment','Nanoplastia'],o)); o+=10;
catalog.push(...rows('salon','Hair Services (Women)','Hair Care',['Hair Wash','Deep Conditioning','Head Massage','Scalp Treatment','Dandruff Treatment','Hair Fall Treatment','Oil Treatment','Protein Treatment','Split Ends Treatment'],o)); o+=10;

catalog.push(...rows('salon','Skin & Face (Women)','Basic Care',['Clean-up','Basic Facial','Detan','Bleach','Face Cleanup (Advanced)','Express Cleanup','Premium Cleanup'],o)); o+=10;
catalog.push(...rows('salon','Skin & Face (Women)','Premium Facials',['Gold Facial','Diamond Facial','Charcoal Facial','Hydra Facial','Anti-Aging Facial','Oxygen Facial','Vitamin C Facial'],o)); o+=10;
catalog.push(...rows('salon','Skin & Face (Women)','Skin Treatments',['Anti-Acne Treatment','Skin Brightening','Pigmentation Treatment','Dark Circle Treatment','Tan Removal Treatment','Open Pores Treatment'],o)); o+=10;
catalog.push(...rows('salon','Skin & Face (Women)','Advanced Skin Care',['Face Polishing','Skin Hydration Treatment','Exfoliation Treatment','Skin Tightening','Collagen Boost Treatment'],o)); o+=10;

catalog.push(...rows('salon','Threading','Threading',['Eyebrow Threading','Upper Lip Threading','Forehead Threading','Chin Threading','Full Face Threading'],o)); o+=10;

catalog.push(...rows('salon','Waxing','Body Waxing',['Full Body Wax','Half Body Wax','Full Arms Wax','Half Arms Wax','Full Legs Wax','Half Legs Wax','Underarms Wax','Bikini Wax','Brazilian Wax','Face Wax'],o)); o+=10;

catalog.push(...rows('salon','Body Care','Body Care',['Body Polish','Body Scrub','Body Detan','Underarm Lightening','Back Cleanup'],o)); o+=10;

catalog.push(...rows('salon','Nail Services','Basic Nail Care',['Manicure','Pedicure','Express Manicure','Express Pedicure','Spa Manicure','Spa Pedicure','Paraffin Treatment','Detox Pedicure','Callus Removal','Cuticle Care','Nail Buffing','Nail Shaping'],o)); o+=10;
catalog.push(...rows('salon','Nail Services','Nail Art',['Nail Art','French Nails','Chrome Nails','Matte Finish Nails','3D Nail Art','Glitter Nails','Bridal Nail Art'],o)); o+=10;
catalog.push(...rows('salon','Nail Services','Gel & Acrylic',['Gel Nails','Acrylic Nails','Polygel Nails','Nail Extensions','Gel Extensions','Acrylic Extensions'],o)); o+=10;
catalog.push(...rows('salon','Nail Services','Nail Repair & Removal',['Nail Repair','Nail Strengthening','Gel Removal','Acrylic Removal','Extension Removal','Refill / Touch-Up'],o)); o+=10;

catalog.push(...rows('salon','Skincare & Face (Men)','Facial Services',['Basic Clean-up','Deep Cleansing Facial','Anti-Aging Facial','De-tan Facial','Hydration Facial','Acne Treatment Facial'],o)); o+=10;
catalog.push(...rows('salon','Skincare & Face (Men)','Grooming Details',['Eyebrow Threading','Eyebrow Waxing','Ear Hair Removal','Nose Hair Removal'],o)); o+=10;
catalog.push(...rows('salon','Skincare & Face (Men)','Advanced Aesthetic',['Skin Tightening','Face Massage','LED Facial Therapy'],o)); o+=10;

catalog.push(...rows('salon','Scalp & Hair Health','Scalp Treatments',['Anti-Dandruff Treatment','Scalp Detox','Hair Fall Control','Hair Growth Therapy','Scalp Nourishment Therapy'],o)); o+=10;
catalog.push(...rows('salon','Scalp & Hair Health','Oil & Therapy',['Head Oil Massage','Deep Conditioning Treatment','Protein Treatment'],o)); o+=10;

catalog.push(...rows('salon','Wellness & Relaxation','Massage',['Head Massage','Neck Massage','Shoulder Massage','Head + Neck + Shoulder Combo'],o)); o+=10;
catalog.push(...rows('salon','Wellness & Relaxation','Relaxation',['Stress Relief Therapy','Relaxation Package'],o)); o+=10;

catalog.push(...rows('salon','Grooming & Body Care (Men)','Body Waxing',['Chest Waxing','Back Waxing','Arm Waxing','Leg Waxing'],o)); o+=10;
catalog.push(...rows('salon','Grooming & Body Care (Men)','Hand & Foot',['Express Manicure','Nail Cleaning','Nail Shaping','Express Pedicure','Foot Cleaning','Heel Repair'],o)); o+=10;

module.exports = catalog;
