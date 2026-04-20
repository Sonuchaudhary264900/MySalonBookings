// Shared salon category constants used by registration form and settings editor

export const MALE_CATEGORIES = [
  {
    key: 'hair_services',
    label: 'Hair Services (Men)',
    icon: '✂️',
    subServices: [
      // Haircuts
      'Basic Haircut', 'Fade / Taper / Skin Fade', 'Designer Haircut',
      'Undercut', 'Crew Cut', 'Buzz Cut',
      // Styling & ColorFFF
      'Hair Styling', 'Hair Coloring', 'Global Hair Color',
      'Highlights / Streaks', 'Root Touch-Up',
      // Hair Treatments
      'Hair Spa', 'Hair Smoothening', 'Hair Straightening',
      'Keratin Treatment', 'Hair Botox', 'Hair Rebonding',
      // Hair Care & Scalp
      'Hair Wash', 'Blow Dry', 'Dandruff Treatment',
      'Hair Fall Treatment', 'Scalp Treatment', 'Deep Conditioning',
    ],
  },
  {
    key: 'beard_grooming',
    label: 'Beard & Grooming',
    icon: '🧔',
    subServices: [
      // Basic Grooming
      'Beard Trim', 'Clean Shave', 'Hot Towel Shave',
      // Styling & Shaping
      'Beard Styling / Shape', 'Designer Beard', 'Beard Fade',
      // Coloring
      'Beard Coloring', 'Grey Coverage (Beard)',
      // Premium Treatments
      'Beard Spa', 'Beard Smoothening',
      // Care & Maintenance
      'Beard Wash', 'Beard Conditioning', 'Beard Oil Treatment',
      'Beard Dandruff Treatment',
    ],
  },
  {
    key: 'spa_massage',
    label: 'Spa & Massage',
    icon: '💆',
    subServices: [
      // Basic Massage
      'Head Massage', 'Neck & Shoulder Massage', 'Back Massage',
      'Foot Massage', 'Hand Massage',
      // Full Body Massage
      'Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage', 'Swedish Massage',
      // Premium Therapies
      'Aroma Therapy Massage', 'Hot Stone Massage', 'Thai Massage', 'Balinese Massage',
      // Spa Treatments
      'Body Spa', 'Body Polishing', 'Body Scrub', 'Body Wrap',
      // Wellness & Therapy
      'Stress Relief Therapy', 'Muscle Recovery Therapy', 'Detox Therapy',
    ],
  },
  {
    key: 'skin_face',
    label: 'Skin & Face (Men Grooming)',
    icon: '🧴',
    subServices: [
      // Basic Care
      'Clean-up', 'Basic Facial', 'Detan', 'Face Bleach',
      // Premium Facials
      'Gold Facial', 'Diamond Facial', 'Charcoal Facial', 'Fruit Facial', 'Anti-Aging Facial',
      // Skin Treatments
      'Anti-Acne Treatment', 'Skin Brightening', 'Pigmentation Treatment', 'Dark Circle Treatment',
      // Advanced Care
      'Face Polishing', 'Skin Hydration Treatment', 'Exfoliation Treatment',
      // Therapy & Wellness
      'Oil Control Treatment', 'Sensitive Skin Treatment', 'Deep Cleansing Treatment',
    ],
  },
  {
    key: 'body_grooming',
    label: 'Body Grooming',
    icon: '🧍',
    subServices: [
      // Waxing Services
      'Chest Waxing', 'Back Waxing', 'Arm Waxing', 'Leg Waxing', 'Full Body Wax',
      // Precision Grooming
      'Eyebrow Threading', 'Threading (optional)', 'Nose Wax', 'Ear Wax',
      // Hygiene & Care
      'Ear Cleaning', 'Underarm Cleaning', 'Intimate Area Grooming (optional)',
      // Premium Body Care
      'Body Polishing', 'Body Scrub', 'Body Detan',
    ],
  },
  {
    key: 'men_dermatology',
    label: 'Men Dermatology',
    icon: '🧴',
    subServices: [
      // Hair & Scalp Treatments
      'Alopecia Treatment', 'Hair Fall Consultation', 'Hair Regrowth Therapy',
      'Male Pattern Baldness Treatment', 'PRP Hair Therapy', 'Scalp Infection Treatment',
      // Skin Treatments (Face)
      'Acne Scar Treatment', 'Acne Treatment', 'Detan Treatment',
      'Open Pores Treatment', 'Skin Brightening Treatment',
      // Beard & Face Issues
      'Beard Growth Therapy', 'Beard Patch Treatment', 'Ingrown Hair Treatment',
      'Razor Bumps Treatment', 'Skin Irritation Treatment (After Shaving)',
      // Advanced Dermatology Treatments
      'Anti-Aging Treatment', 'Chemical Peel', 'Laser Treatment',
      'Scar Reduction Treatment', 'Skin Tightening',
      // Body Skin Treatments
      'Back Acne Treatment', 'Body Acne Treatment',
      'Skin Allergy Treatment', 'Stretch Marks Treatment',
      // Consultation
      'Follow-up Consultation', 'General Skin Consultation',
      'Hair Specialist Consultation', 'Online Dermatologist Consultation',
    ],
  },
];

export const MALE_OPTIONALS = [
  { key: 'kidsHaircut',    label: "Kids' Haircut",     icon: '👶' },
  { key: 'atHomeServices', label: 'At-Home Services',  icon: '🏠' },
];

export const FEMALE_CATEGORIES = [
  {
    key: 'hair_services_women',
    label: 'Hair Services (Women)',
    icon: '💇',
    subServices: [
      // Haircuts
      'Haircut (Layer / Step / Trim)', 'Advanced Haircut', 'Fringe / Bangs Cut',
      'U-Cut', 'V-Cut', 'Feather Cut', 'Blunt Cut', 'Kids Haircut',
      // Styling
      'Hair Styling (Straight / Curl / Party)', 'Blow Dry', 'Hair Ironing',
      'Hair Curling', 'Party Hairstyle', 'Bridal Hairstyle',
      'Engagement Hairstyle', 'Reception Hairstyle',
      // Coloring
      'Hair Coloring', 'Global Hair Color', 'Highlights', 'Balayage',
      'Ombre', 'Root Touch-Up', 'Fashion Color (Creative Colors)', 'Grey Coverage',
      // Hair Treatments
      'Hair Spa', 'Hair Smoothening', 'Hair Straightening', 'Keratin Treatment',
      'Hair Botox', 'Rebonding', 'Cysteine Treatment', 'Nanoplastia',
      // Hair Care & Scalp
      'Hair Wash', 'Deep Conditioning', 'Scalp Treatment', 'Dandruff Treatment',
      'Hair Fall Treatment', 'Oil Treatment', 'Protein Treatment', 'Split Ends Treatment',
    ],
  },
  {
    key: 'nail_services',
    label: 'Nail Services',
    icon: '💅',
    subServices: [
      // Basic Care
      'Manicure', 'Pedicure', 'Express Manicure', 'Express Pedicure',
      // Nail Art & Styling
      'Nail Art', 'French Nails', 'Chrome Nails', 'Matte Finish Nails',
      '3D Nail Art', 'Glitter Nails', 'Bridal Nail Art',
      // Nail Enhancements
      'Gel Nails', 'Acrylic Nails', 'Polygel Nails', 'Nail Extensions',
      'Gel Extensions', 'Acrylic Extensions',
      // Nail Care & Repair
      'Nail Repair', 'Nail Strengthening Treatment', 'Cuticle Care',
      'Nail Buffing', 'Nail Shaping',
      // Premium Treatments
      'Spa Manicure', 'Spa Pedicure', 'Paraffin Treatment',
      'Detox Pedicure', 'Callus Removal',
      // Removal & Maintenance
      'Gel Removal', 'Acrylic Removal', 'Extension Removal', 'Refill / Touch-Up',
    ],
  },
  {
    key: 'skin_beauty',
    label: 'Skin & Beauty',
    icon: '🧖',
    subServices: [
      // Basic Care
      'Clean-up', 'Basic Facial', 'Detan', 'Bleach', 'Face Cleanup (Advanced)',
      // Premium Facials
      'Gold Facial', 'Diamond Facial', 'Charcoal Facial', 'Fruit Facial',
      'Hydra Facial', 'Anti-Aging Facial', 'Oxygen Facial', 'Vitamin C Facial',
      // Skin Treatments
      'Anti-Acne Treatment', 'Skin Brightening', 'Pigmentation Treatment',
      'Dark Circle Treatment', 'Tan Removal Treatment', 'Open Pores Treatment',
      // Advanced Skin Care
      'Face Polishing', 'Skin Hydration Treatment', 'Exfoliation Treatment',
      'Skin Tightening Treatment', 'Collagen Boost Treatment',
      // Therapy & Wellness
      'Oil Control Treatment', 'Sensitive Skin Treatment',
      'Deep Cleansing Treatment', 'Skin Repair Therapy',
      // Add-On Services
      'Face Massage', 'Neck Treatment', 'Under Eye Care', 'Lip Care Treatment',
    ],
  },
  {
    key: 'body_grooming_women',
    label: 'Body Grooming',
    icon: '🧴',
    subServices: [
      // Waxing
      'Full Body Wax', 'Half Body Wax', 'Full Arms Wax', 'Half Arms Wax',
      'Full Legs Wax', 'Half Legs Wax', 'Underarms Wax', 'Bikini Wax',
      'Brazilian Wax', 'Face Wax',
      // Threading
      'Eyebrow Threading', 'Upper Lip Threading', 'Forehead Threading',
      'Chin Threading', 'Full Face Threading',
      // Body Care
      'Body Polish', 'Body Scrub', 'Body Detan', 'Underarm Lightening', 'Back Cleanup',
      // Premium Treatments
      'Full Body Polishing', 'Full Body Spa', 'Body Glow Treatment',
      'Skin Brightening Body Treatment',
      // Hygiene & Maintenance
      'Intimate Area Cleanup (optional)', 'Ingrown Hair Treatment', 'Tan Removal Body Treatment',
      // Add-ons
      'Hand Polishing', 'Foot Polishing', 'Neck Cleanup',
    ],
  },
  {
    key: 'spa_relaxation',
    label: 'Spa & Relaxation',
    icon: '💆',
    subServices: [
      // Basic Massage
      'Head Massage', 'Neck & Shoulder Massage', 'Back Massage',
      'Foot Massage', 'Hand Massage',
      // Full Body Massage
      'Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage', 'Swedish Massage',
      // Premium Therapies
      'Aromatherapy Massage', 'Hot Stone Massage', 'Thai Massage',
      'Balinese Massage', 'Signature Spa Therapy',
      // Body Spa Treatments
      'Body Spa', 'Body Polishing', 'Body Scrub', 'Body Wrap',
      // Wellness & Therapy
      'Stress Relief Therapy', 'Muscle Relaxation Therapy', 'Detox Therapy', 'Sleep Therapy',
      // Special Care
      'Pre-Bridal Spa', 'Post-Bridal Relaxation', 'Pregnancy Safe Massage',
    ],
  },
  {
    key: 'bridal_events',
    label: 'Bridal & Events',
    icon: '👰',
    subServices: [
      // Makeup Services
      'Bridal Makeup', 'HD Bridal Makeup', 'Airbrush Bridal Makeup',
      'Engagement Makeup', 'Party Makeup', 'Reception Makeup', 'Cocktail Makeup',
      // Hairstyling
      'Bridal Hairstyling', 'Party Hairstyling', 'Engagement Hairstyling',
      'Reception Hairstyling', 'Hair Extensions Styling',
      // Draping & Styling
      'Saree Draping', 'Lehenga Draping', 'Dupatta Draping', 'Bridal Dressing Assistance',
      // Pre-Bridal Packages
      'Pre-Bridal Skin Care', 'Pre-Bridal Hair Care',
      'Full Pre-Bridal Package', 'Bridal Consultation',
      // Grooming Add-ons
      'Eyebrow Shaping', 'Upper Lip / Face Cleanup',
      'Manicure & Pedicure (Bridal)', 'Full Body Wax (Bridal Prep)',
      // Special Services
      'Trial Makeup', 'Makeup Consultation',
      'On-Location Makeup Service', 'Photoshoot Makeup',
      // Premium Add-ons
      'False Eyelashes', 'Lens Application',
      'High-End Product Upgrade', 'Touch-Up Services (Hourly / Event)',
    ],
  },
  {
    key: 'women_dermatology',
    label: 'Women Dermatology',
    icon: '🧴',
    subServices: [
      // Hair & Scalp Treatments
      'Alopecia Treatment', 'Dandruff Treatment', 'Hair Fall Treatment',
      'Hair Thinning Treatment', 'Hormonal Hair Loss Treatment',
      'PRP Hair Therapy', 'Scalp Infection Treatment',
      // Skin Treatments (Face)
      'Acne Scar Treatment', 'Acne Treatment', 'Dark Circles Treatment',
      'Detan Treatment', 'Open Pores Treatment', 'Pigmentation Treatment',
      'Skin Brightening Treatment', 'Uneven Skin Tone Treatment',
      // Advanced Skin Treatments
      'Chemical Peel', 'Hydrafacial (Medical Grade)', 'Laser Skin Treatment',
      'Skin Rejuvenation', 'Skin Tightening',
      // Anti-Aging & Beauty
      'Anti-Aging Treatment', 'Botox / Fillers (Future Option)', 'Collagen Boost Therapy',
      'Fine Line Treatment', 'Skin Lifting Treatment', 'Wrinkle Reduction',
      // Body Skin Treatments
      'Back Acne Treatment', 'Body Acne Treatment', 'Skin Allergy Treatment',
      'Stretch Marks Treatment', 'Underarm Pigmentation Treatment',
      // Consultation
      'Follow-up Consultation', 'General Skin Consultation',
      'Hair Specialist Consultation', 'Online Dermatologist Consultation',
    ],
  },
];

export const FEMALE_OPTIONALS = [
  { key: 'kidsServices',   label: "Kids' Services",   icon: '👶' },
  { key: 'atHomeServices', label: 'At-Home Services', icon: '🏠' },
];

export const UNISEX_CATEGORIES = [
  {
    key: 'hair_services_unisex',
    label: 'Hair Services',
    icon: '✂️',
    maleSubServices: [
      'Basic Haircut', 'Fade / Taper / Skin Fade', 'Designer Haircut',
      'Undercut', 'Crew Cut', 'Buzz Cut',
      'Hair Styling', 'Hair Coloring', 'Global Hair Color', 'Highlights / Streaks', 'Root Touch-Up',
      'Hair Spa', 'Hair Smoothening', 'Hair Straightening', 'Keratin Treatment', 'Hair Botox', 'Hair Rebonding',
      'Hair Wash', 'Blow Dry', 'Dandruff Treatment', 'Hair Fall Treatment', 'Scalp Treatment', 'Deep Conditioning',
    ],
    femaleSubServices: [
      'Haircut (Layer / Step / Trim)', 'Advanced Haircut', 'Fringe / Bangs Cut',
      'U-Cut', 'V-Cut', 'Feather Cut', 'Blunt Cut', 'Kids Haircut',
      'Hair Styling (Straight / Curl / Party)', 'Blow Dry', 'Hair Ironing', 'Hair Curling',
      'Party Hairstyle', 'Bridal Hairstyle', 'Engagement Hairstyle', 'Reception Hairstyle',
      'Hair Coloring', 'Global Hair Color', 'Highlights', 'Balayage', 'Ombre',
      'Root Touch-Up', 'Fashion Color (Creative Colors)', 'Grey Coverage',
      'Hair Spa', 'Hair Smoothening', 'Hair Straightening', 'Keratin Treatment',
      'Hair Botox', 'Rebonding', 'Cysteine Treatment', 'Nanoplastia',
      'Hair Wash', 'Deep Conditioning', 'Scalp Treatment', 'Dandruff Treatment',
      'Hair Fall Treatment', 'Oil Treatment', 'Protein Treatment', 'Split Ends Treatment',
    ],
    get subServices() { return [...new Set([...this.maleSubServices, ...this.femaleSubServices])]; },
  },
  {
    key: 'beard_grooming_unisex',
    label: 'Beard & Grooming',
    icon: '🧔',
    maleSubServices: [
      'Beard Trim', 'Clean Shave', 'Hot Towel Shave',
      'Beard Styling / Shape', 'Designer Beard', 'Beard Fade',
      'Beard Coloring', 'Grey Coverage (Beard)',
      'Beard Spa', 'Beard Smoothening',
      'Beard Wash', 'Beard Conditioning', 'Beard Oil Treatment', 'Beard Dandruff Treatment',
    ],
    femaleSubServices: [],
    get subServices() { return this.maleSubServices; },
  },
  {
    key: 'nail_services_unisex',
    label: 'Nail Services',
    icon: '💅',
    maleSubServices: [
      'Manicure', 'Pedicure',
    ],
    femaleSubServices: [
      'Manicure', 'Pedicure', 'Express Manicure', 'Express Pedicure',
      'Nail Art', 'French Nails', 'Chrome Nails', 'Matte Finish Nails',
      '3D Nail Art', 'Glitter Nails', 'Bridal Nail Art',
      'Gel Nails', 'Acrylic Nails', 'Polygel Nails', 'Nail Extensions',
      'Gel Extensions', 'Acrylic Extensions',
      'Nail Repair', 'Nail Strengthening Treatment', 'Cuticle Care', 'Nail Buffing', 'Nail Shaping',
      'Spa Manicure', 'Spa Pedicure', 'Paraffin Treatment', 'Detox Pedicure', 'Callus Removal',
      'Gel Removal', 'Acrylic Removal', 'Extension Removal', 'Refill / Touch-Up',
    ],
    get subServices() { return [...new Set([...this.maleSubServices, ...this.femaleSubServices])]; },
  },
  {
    key: 'skin_beauty_unisex',
    label: 'Skin & Face / Beauty',
    icon: '🧖',
    maleSubServices: [
      'Clean-up', 'Basic Facial', 'Detan', 'Face Bleach',
      'Gold Facial', 'Diamond Facial', 'Charcoal Facial', 'Fruit Facial', 'Anti-Aging Facial',
      'Anti-Acne Treatment', 'Skin Brightening', 'Pigmentation Treatment', 'Dark Circle Treatment',
      'Face Polishing', 'Skin Hydration Treatment', 'Exfoliation Treatment',
      'Oil Control Treatment', 'Sensitive Skin Treatment', 'Deep Cleansing Treatment',
    ],
    femaleSubServices: [
      'Clean-up', 'Basic Facial', 'Detan', 'Bleach', 'Face Cleanup (Advanced)',
      'Gold Facial', 'Diamond Facial', 'Charcoal Facial', 'Fruit Facial',
      'Hydra Facial', 'Anti-Aging Facial', 'Oxygen Facial', 'Vitamin C Facial',
      'Anti-Acne Treatment', 'Skin Brightening', 'Pigmentation Treatment',
      'Dark Circle Treatment', 'Tan Removal Treatment', 'Open Pores Treatment',
      'Face Polishing', 'Skin Hydration Treatment', 'Exfoliation Treatment',
      'Skin Tightening Treatment', 'Collagen Boost Treatment',
      'Oil Control Treatment', 'Sensitive Skin Treatment', 'Deep Cleansing Treatment', 'Skin Repair Therapy',
      'Face Massage', 'Neck Treatment', 'Under Eye Care', 'Lip Care Treatment',
    ],
    get subServices() { return [...new Set([...this.maleSubServices, ...this.femaleSubServices])]; },
  },
  {
    key: 'spa_massage_unisex',
    label: 'Spa & Massage',
    icon: '💆',
    maleSubServices: [
      'Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage', 'Hand Massage',
      'Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage', 'Swedish Massage',
      'Aroma Therapy Massage', 'Hot Stone Massage', 'Thai Massage', 'Balinese Massage',
      'Body Spa', 'Body Polishing', 'Body Scrub', 'Body Wrap',
      'Stress Relief Therapy', 'Muscle Recovery Therapy', 'Detox Therapy',
    ],
    femaleSubServices: [
      'Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage', 'Hand Massage',
      'Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage', 'Swedish Massage',
      'Aromatherapy Massage', 'Hot Stone Massage', 'Thai Massage', 'Balinese Massage', 'Signature Spa Therapy',
      'Body Spa', 'Body Polishing', 'Body Scrub', 'Body Wrap',
      'Stress Relief Therapy', 'Muscle Relaxation Therapy', 'Detox Therapy', 'Sleep Therapy',
      'Pre-Bridal Spa', 'Post-Bridal Relaxation', 'Pregnancy Safe Massage',
    ],
    get subServices() { return [...new Set([...this.maleSubServices, ...this.femaleSubServices])]; },
  },
  {
    key: 'body_grooming_unisex',
    label: 'Body Grooming',
    icon: '🧴',
    maleSubServices: [
      'Chest Waxing', 'Back Waxing', 'Arm Waxing', 'Leg Waxing', 'Full Body Wax',
      'Eyebrow Threading', 'Threading (optional)', 'Nose Wax', 'Ear Wax',
      'Ear Cleaning', 'Underarm Cleaning', 'Intimate Area Grooming (optional)',
      'Body Polishing', 'Body Scrub', 'Body Detan',
    ],
    femaleSubServices: [
      'Full Body Wax', 'Half Body Wax', 'Full Arms Wax', 'Half Arms Wax',
      'Full Legs Wax', 'Half Legs Wax', 'Underarms Wax', 'Bikini Wax', 'Brazilian Wax', 'Face Wax',
      'Eyebrow Threading', 'Upper Lip Threading', 'Forehead Threading', 'Chin Threading', 'Full Face Threading',
      'Body Polish', 'Body Scrub', 'Body Detan', 'Underarm Lightening', 'Back Cleanup',
      'Full Body Polishing', 'Full Body Spa', 'Body Glow Treatment', 'Skin Brightening Body Treatment',
      'Intimate Area Cleanup (optional)', 'Ingrown Hair Treatment', 'Tan Removal Body Treatment',
      'Hand Polishing', 'Foot Polishing', 'Neck Cleanup',
    ],
    get subServices() { return [...new Set([...this.maleSubServices, ...this.femaleSubServices])]; },
  },
  {
    key: 'bridal_events_unisex',
    label: 'Bridal & Events',
    icon: '👰',
    maleSubServices: [
      'Groom Makeup', 'Hairstyling (Groom)', 'Shave & Grooming (Groom)',
    ],
    femaleSubServices: [
      'Bridal Makeup', 'HD Bridal Makeup', 'Airbrush Bridal Makeup',
      'Engagement Makeup', 'Party Makeup', 'Reception Makeup', 'Cocktail Makeup',
      'Bridal Hairstyling', 'Party Hairstyling', 'Engagement Hairstyling',
      'Reception Hairstyling', 'Hair Extensions Styling',
      'Saree Draping', 'Lehenga Draping', 'Dupatta Draping', 'Bridal Dressing Assistance',
      'Pre-Bridal Skin Care', 'Pre-Bridal Hair Care', 'Full Pre-Bridal Package', 'Bridal Consultation',
      'Eyebrow Shaping', 'Upper Lip / Face Cleanup', 'Manicure & Pedicure (Bridal)', 'Full Body Wax (Bridal Prep)',
      'Trial Makeup', 'Makeup Consultation', 'On-Location Makeup Service', 'Photoshoot Makeup',
      'False Eyelashes', 'Lens Application', 'High-End Product Upgrade', 'Touch-Up Services (Hourly / Event)',
    ],
    get subServices() { return [...new Set([...this.maleSubServices, ...this.femaleSubServices])]; },
  },
  {
    key: 'kids_services_unisex',
    label: 'Kids Services',
    icon: '👶',
    maleSubServices: [
      "Kids' Haircut (Boys)", "Kids' Hair Styling (Boys)", "Kids' Hair Wash",
    ],
    femaleSubServices: [
      "Kids' Haircut (Girls)", "Kids' Hair Styling (Girls)", "Kids' Hair Wash", "Kids' Braiding",
    ],
    get subServices() { return [...new Set([...this.maleSubServices, ...this.femaleSubServices])]; },
  },
  {
    key: 'men_dermatology_unisex',
    label: 'Men Dermatology',
    icon: '🧴',
    maleSubServices: [
      // Hair & Scalp Treatments
      'Alopecia Treatment', 'Hair Fall Consultation', 'Hair Regrowth Therapy',
      'Male Pattern Baldness Treatment', 'PRP Hair Therapy', 'Scalp Infection Treatment',
      // Skin Treatments (Face)
      'Acne Scar Treatment', 'Acne Treatment', 'Detan Treatment',
      'Open Pores Treatment', 'Skin Brightening Treatment',
      // Beard & Face Issues
      'Beard Growth Therapy', 'Beard Patch Treatment', 'Ingrown Hair Treatment',
      'Razor Bumps Treatment', 'Skin Irritation Treatment (After Shaving)',
      // Advanced Dermatology Treatments
      'Anti-Aging Treatment', 'Chemical Peel', 'Laser Treatment',
      'Scar Reduction Treatment', 'Skin Tightening',
      // Body Skin Treatments
      'Back Acne Treatment', 'Body Acne Treatment',
      'Skin Allergy Treatment', 'Stretch Marks Treatment',
      // Consultation
      'Follow-up Consultation', 'General Skin Consultation',
      'Hair Specialist Consultation', 'Online Dermatologist Consultation',
    ],
    femaleSubServices: [],
    get subServices() { return this.maleSubServices; },
  },
  {
    key: 'women_dermatology_unisex',
    label: 'Women Dermatology',
    icon: '🧴',
    maleSubServices: [],
    femaleSubServices: [
      // Hair & Scalp Treatments
      'Alopecia Treatment', 'Dandruff Treatment', 'Hair Fall Treatment',
      'Hair Thinning Treatment', 'Hormonal Hair Loss Treatment',
      'PRP Hair Therapy', 'Scalp Infection Treatment',
      // Skin Treatments (Face)
      'Acne Scar Treatment', 'Acne Treatment', 'Dark Circles Treatment',
      'Detan Treatment', 'Open Pores Treatment', 'Pigmentation Treatment',
      'Skin Brightening Treatment', 'Uneven Skin Tone Treatment',
      // Advanced Skin Treatments
      'Chemical Peel', 'Hydrafacial (Medical Grade)', 'Laser Skin Treatment',
      'Skin Rejuvenation', 'Skin Tightening',
      // Anti-Aging & Beauty
      'Anti-Aging Treatment', 'Botox / Fillers (Future Option)', 'Collagen Boost Therapy',
      'Fine Line Treatment', 'Skin Lifting Treatment', 'Wrinkle Reduction',
      // Body Skin Treatments
      'Back Acne Treatment', 'Body Acne Treatment', 'Skin Allergy Treatment',
      'Stretch Marks Treatment', 'Underarm Pigmentation Treatment',
      // Consultation
      'Follow-up Consultation', 'General Skin Consultation',
      'Hair Specialist Consultation', 'Online Dermatologist Consultation',
    ],
    get subServices() { return this.femaleSubServices; },
  },
  {
    key: 'at_home_services_unisex',
    label: 'At-Home Services',
    icon: '🏠',
    maleSubServices: [
      'At-Home Haircut (Men)', 'At-Home Shave', 'At-Home Massage', 'At-Home Facial (Men)',
    ],
    femaleSubServices: [
      'At-Home Haircut (Women)', 'At-Home Facial', 'At-Home Waxing',
      'At-Home Massage', 'At-Home Bridal',
    ],
    get subServices() { return [...new Set([...this.maleSubServices, ...this.femaleSubServices])]; },
  },
];

// ─── Shared helpers — import these instead of hardcoding in components ────────
export const CATEGORY_ICON_MAP = Object.fromEntries(
  [...MALE_CATEGORIES, ...FEMALE_CATEGORIES, ...UNISEX_CATEGORIES].map(c => [c.label, c.icon])
);

// ── Lightweight djb2-style hash for deterministic image pool selection ─────
const _nameHash = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};

// ── Category image pools (2-3 per high-repetition category) ───────────────
export const CATEGORY_IMAGES = {
  'Hair Services': [
    'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=80&h=80&fit=crop&q=70',
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=80&h=80&fit=crop&q=70',
    'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=80&h=80&fit=crop&q=70',
  ],
  'Hair Services (Men)': [
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=80&h=80&fit=crop&q=70',
    'https://images.unsplash.com/photo-1599351431613-18ef1fdd27e5?w=80&h=80&fit=crop&q=70',
  ],
  'Hair Services (Women)': [
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=80&h=80&fit=crop&q=70',
    'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=80&h=80&fit=crop&q=70',
  ],
  'Beard & Grooming': [
    'https://images.unsplash.com/photo-1599351431613-18ef1fdd27e5?w=80&h=80&fit=crop&q=70',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=80&h=80&fit=crop&q=70',
  ],
  'Nail Services': [
    'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=80&h=80&fit=crop&q=70',
    'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=80&h=80&fit=crop&q=70',
  ],
  'Skin & Face / Beauty': [
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=80&h=80&fit=crop&q=70',
    'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=80&h=80&fit=crop&q=70',
  ],
  'Skin & Face (Men Grooming)': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=80&h=80&fit=crop&q=70',
  'Skin & Beauty':              'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=80&h=80&fit=crop&q=70',
  'Face & Skin':                'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=80&h=80&fit=crop&q=70',
  'Spa & Massage': [
    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=80&h=80&fit=crop&q=70',
    'https://images.unsplash.com/photo-1498842812179-c81beecf902c?w=80&h=80&fit=crop&q=70',
  ],
  'Spa & Relaxation':  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=80&h=80&fit=crop&q=70',
  'Body Grooming':     'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=80&h=80&fit=crop&q=70',
  'Bridal & Events':   'https://images.unsplash.com/photo-1519741497674-611481863552?w=80&h=80&fit=crop&q=70',
  'Men Dermatology':   'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop&q=70',
  'Women Dermatology': 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=80&h=80&fit=crop&q=70',
  'Kids Services':     'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=80&h=80&fit=crop&q=70',
  'At-Home Services':  'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=80&h=80&fit=crop&q=70',
  'Makeup Services':   'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=80&h=80&fit=crop&q=70',
  'Hairstyling':       'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=80&h=80&fit=crop&q=70',
};

// ── Category card images — shown on the category card header (owner service menu) ──
export const CATEGORY_CARD_IMAGE_MAP = {
  // ─── Bridal & Makeup ───────────────────────────────────────────────────────
  'Bridal & Events':          'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=300&fit=crop&q=85',
  'Makeup Services':          'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&h=300&fit=crop&q=85',
  'Hairstyling':              'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=300&fit=crop&q=85',
  'Draping & Dressing':       'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&h=300&fit=crop&q=85',
  'Pre-Bridal':               'https://images.unsplash.com/photo-1526413232644-8a40f03cc03b?w=600&h=300&fit=crop&q=85',
  'Grooming Add-ons':         'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=300&fit=crop&q=85',
  'Premium Add-ons':          'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&h=300&fit=crop&q=85',

  // ─── Hair ──────────────────────────────────────────────────────────────────
  'Hair Services':            'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600&h=300&fit=crop&q=85',
  'Hair Services (Men)':      'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=300&fit=crop&q=85',
  'Hair Services (Women)':    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=300&fit=crop&q=85',

  // ─── Beard ─────────────────────────────────────────────────────────────────
  'Beard & Grooming':         'https://images.unsplash.com/photo-1599351431613-18ef1fdd27e5?w=600&h=300&fit=crop&q=85',
  'Beard & Face Issues':      'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=600&h=300&fit=crop&q=85',

  // ─── Nails ─────────────────────────────────────────────────────────────────
  'Nail Services':            'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=300&fit=crop&q=85',

  // ─── Skin & Face ───────────────────────────────────────────────────────────
  'Skin & Face / Beauty':     'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=300&fit=crop&q=85',
  'Skin & Face (Men Grooming)':'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=300&fit=crop&q=85',
  'Skin & Beauty':            'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&h=300&fit=crop&q=85',
  'Face & Skin':              'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=300&fit=crop&q=85',
  'Skin & Face':              'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=300&fit=crop&q=85',
  'Skin (Face)':              'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=300&fit=crop&q=85',

  // ─── Spa ───────────────────────────────────────────────────────────────────
  'Spa & Massage':            'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=300&fit=crop&q=85',
  'Spa & Relaxation':         'https://images.unsplash.com/photo-1498842812179-c81beecf902c?w=600&h=300&fit=crop&q=85',
  'Basic Massage':            'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=300&fit=crop&q=85',
  'Full Body Massage':        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=300&fit=crop&q=85',
  'Premium Therapies':        'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=600&h=300&fit=crop&q=85',
  'Body Spa':                 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&h=300&fit=crop&q=85',
  'Wellness Therapy':         'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=300&fit=crop&q=85',
  'Special Care':             'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&h=300&fit=crop&q=85',

  // ─── Body ──────────────────────────────────────────────────────────────────
  'Body Grooming':            'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=300&fit=crop&q=85',
  'Grooming & Hair Removal':  'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=300&fit=crop&q=85',

  // ─── Dermatology ───────────────────────────────────────────────────────────
  'Men Dermatology':          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&h=300&fit=crop&q=85',
  'Women Dermatology':        'https://images.unsplash.com/photo-1614859324967-bdf413c35a2c?w=600&h=300&fit=crop&q=85',
  'Hair & Scalp':             'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&h=300&fit=crop&q=85',
  'Advanced Treatments':      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&h=300&fit=crop&q=85',
  'Anti-Aging':               'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=300&fit=crop&q=85',
  'Body Skin':                'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=300&fit=crop&q=85',
  'Consultation':             'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=300&fit=crop&q=85',

  // ─── Kids ──────────────────────────────────────────────────────────────────
  'Kids Services':            'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&h=300&fit=crop&q=85',

  // ─── At-Home ───────────────────────────────────────────────────────────────
  'At-Home Services':         'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=300&fit=crop&q=85',

  // ─── Barbershop / Men's Salon new categories ───────────────────────────────
  'Hair Services':            'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=300&fit=crop&q=85',
  'Beard & Shaving':          'https://images.unsplash.com/photo-1599351431613-18ef1fdd27e5?w=600&h=300&fit=crop&q=85',
  'Hair Colour & Chemical':   'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&h=300&fit=crop&q=85',
  'Skincare & Face':          'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=300&fit=crop&q=85',
  'Scalp & Hair Health':      'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&h=300&fit=crop&q=85',
  'Wellness & Relaxation':    'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=300&fit=crop&q=85',
  'Hand & Foot Grooming':     'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=300&fit=crop&q=85',
  'Packages & Combos':        'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=600&h=300&fit=crop&q=85',
  'Memberships':              'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&h=300&fit=crop&q=85',
  'Premium / Modern Services':'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=300&fit=crop&q=85',
  'Grooming & Body Care':     'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=300&fit=crop&q=85',
};

// Priority: owner photo → deterministic pool pick → null
export const getServiceImage = (service) => {
  if (service.photos?.[0]) return service.photos[0];
  const entry = CATEGORY_IMAGES[service.category];
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  return entry[_nameHash(service.name) % entry.length];
};

export const ALL_CATEGORY_ORDER = [
  'Hair Services', 'Hair Services (Men)', 'Hair Services (Women)',
  'Beard & Grooming', 'Nail Services',
  'Skin & Face / Beauty', 'Skin & Face (Men Grooming)', 'Skin & Beauty',
  'Spa & Massage', 'Spa & Relaxation', 'Body Grooming',
  'Men Dermatology', 'Women Dermatology',
  'Bridal & Events', 'Kids Services', 'At-Home Services',
];

// Category labels that belong exclusively to one gender
// (used to hide/show category groups in gender-filtered views)
export const MALE_ONLY_CAT_LABELS  = new Set(['Beard & Grooming', 'Men Dermatology']);
export const FEMALE_ONLY_CAT_LABELS = new Set(['Bridal & Events',  'Women Dermatology']);

// ─── Salon type definitions ───────────────────────────────────────────────────
// autoGender: pre-selects served gender (null = owner chooses)
export const SALON_TYPES = [
  {
    key:         'barbershop',
    label:       'Barbershop',
    icon:        '✂️',
    description: 'Expert cuts, shaves & beard grooming',
    autoGender:  'male',
    color:       '#3b82f6',
  },
  {
    key:         'salon',
    label:       'Salon',
    icon:        '💇',
    description: 'Hair, beauty & grooming for everyone',
    autoGender:  null,
    color:       '#8b5cf6',
  },
  {
    key:         'spa_wellness',
    label:       'Spa & Wellness',
    icon:        '🧘',
    description: 'Relaxation, massage & holistic care',
    autoGender:  null,
    color:       '#10b981',
  },
  {
    key:         'makeup_bridal',
    label:       'Makeup & Bridal',
    icon:        '💄',
    description: 'Bridal, party makeup & beauty services',
    autoGender:  'female',
    color:       '#ec4899',
  },
  {
    key:         'skin_derma',
    label:       'Skin & Derma Clinic',
    icon:        '🏥',
    description: 'Advanced skin treatments & dermatology',
    autoGender:  'unisex',
    color:       '#f59e0b',
  },
];

// ─── Curated service lists per salon type ────────────────────────────────────
// These keep only the services that make sense for each specific business type.

export const BARBERSHOP_CATEGORIES = [
  {
    key: 'hair_services',
    label: 'Hair Services',
    icon: '✂️',
    tabIcon: 'scissors',
    sections: [
      {
        label: 'Basic Haircuts',
        services: ['Classic Haircut', 'Trim / Maintenance Cut', 'Kids Haircut', 'Senior Citizen Haircut'],
      },
      {
        label: 'Precision Cuts',
        services: ['Low Fade', 'Mid Fade', 'High Fade', 'Taper Fade', 'Skin Fade / Bald Fade', 'Buzz Cut', 'Crew Cut', 'Caesar Cut'],
      },
      {
        label: 'Advanced / Trend Cuts',
        services: ['Undercut', 'Pompadour', 'Quiff', 'Slick Back', 'Textured Crop', 'Modern Mullet', 'Fringe / Bangs Style'],
      },
      {
        label: 'Long Hair Services',
        services: ['Layered Cut', 'Straight Cut', 'Volume Reduction', 'Split-End Cutting', 'Long Hair Styling'],
      },
      {
        label: 'Hair Art & Detailing',
        services: ['Hair Tattoo / Design', 'Line-up / Edge-up', 'Hard Part / Razor Part', 'Fade Patterns'],
      },
      {
        label: 'Hair Styling',
        services: ['Blow Dry', 'Hair Wax Styling', 'Gel Styling', 'Clay Styling', 'Party / Event Styling'],
      },
    ],
    subServices: [
      'Classic Haircut', 'Trim / Maintenance Cut', 'Kids Haircut', 'Senior Citizen Haircut',
      'Low Fade', 'Mid Fade', 'High Fade', 'Taper Fade', 'Skin Fade / Bald Fade', 'Buzz Cut', 'Crew Cut', 'Caesar Cut',
      'Undercut', 'Pompadour', 'Quiff', 'Slick Back', 'Textured Crop', 'Modern Mullet', 'Fringe / Bangs Style',
      'Layered Cut', 'Straight Cut', 'Volume Reduction', 'Split-End Cutting', 'Long Hair Styling',
      'Hair Tattoo / Design', 'Line-up / Edge-up', 'Hard Part / Razor Part', 'Fade Patterns',
      'Blow Dry', 'Hair Wax Styling', 'Gel Styling', 'Clay Styling', 'Party / Event Styling',
    ],
  },
  {
    key: 'beard_grooming',
    label: 'Beard & Shaving',
    icon: '🧔',
    tabIcon: 'beard',
    sections: [
      {
        label: 'Shaving',
        services: ['Basic Shave', 'Razor Shave', 'Straight Razor Shave', 'Hot Towel Shave', 'Royal Shave', 'Head Shave'],
      },
      {
        label: 'Beard Grooming',
        services: ['Beard Trim', 'Beard Shaping', 'Beard Fade', 'Beard Sculpting'],
      },
      {
        label: 'Mustache Services',
        services: ['Mustache Trim', 'Mustache Styling', 'Handlebar Styling'],
      },
      {
        label: 'Beard Treatments',
        services: ['Beard Conditioning', 'Beard Spa', 'Hot Oil Beard Treatment', 'Beard Straightening', 'Beard Smoothening'],
      },
    ],
    subServices: [
      'Basic Shave', 'Razor Shave', 'Straight Razor Shave', 'Hot Towel Shave', 'Royal Shave', 'Head Shave',
      'Beard Trim', 'Beard Shaping', 'Beard Fade', 'Beard Sculpting',
      'Mustache Trim', 'Mustache Styling', 'Handlebar Styling',
      'Beard Conditioning', 'Beard Spa', 'Hot Oil Beard Treatment', 'Beard Straightening', 'Beard Smoothening',
    ],
  },
  {
    key: 'hair_colour',
    label: 'Hair Colour & Chemical',
    icon: '🎨',
    tabIcon: 'color',
    sections: [
      {
        label: 'Natural Colour',
        services: ['Grey Coverage', 'Grey Blending', 'Beard Colouring', 'Mustache Colour'],
      },
      {
        label: 'Fashion Colour',
        services: ['Global Hair Colour', 'Highlights', 'Lowlights', 'Balayage', 'Ombre'],
      },
      {
        label: 'Creative Colour',
        services: ['Fantasy Colours', 'Neon Colours', 'Colour + Fade Design'],
      },
      {
        label: 'Chemical Treatments',
        services: ['Hair Smoothening', 'Hair Rebonding', 'Hair Relaxing', 'Perming', 'Keratin Treatment'],
      },
    ],
    subServices: [
      'Grey Coverage', 'Grey Blending', 'Beard Colouring', 'Mustache Colour',
      'Global Hair Colour', 'Highlights', 'Lowlights', 'Balayage', 'Ombre',
      'Fantasy Colours', 'Neon Colours', 'Colour + Fade Design',
      'Hair Smoothening', 'Hair Rebonding', 'Hair Relaxing', 'Perming', 'Keratin Treatment',
    ],
  },
  {
    key: 'skin_face',
    label: 'Skincare & Face',
    icon: '🧴',
    tabIcon: 'face',
    sections: [
      {
        label: 'Facial Services',
        services: ['Basic Clean-up', 'Deep Cleansing Facial', 'Anti-Aging Facial', 'De-tan Facial', 'Hydration Facial', 'Acne Treatment Facial'],
      },
      {
        label: 'Skin Treatments',
        services: ['Blackhead Removal', 'Whitehead Removal', 'Pimple Treatment', 'Skin Polishing'],
      },
      {
        label: 'Grooming Details',
        services: ['Eyebrow Threading', 'Eyebrow Waxing', 'Ear Hair Removal', 'Nose Hair Removal', 'Face Waxing'],
      },
      {
        label: 'Advanced Aesthetic',
        services: ['Skin Tightening', 'Face Massage', 'LED Facial Therapy'],
      },
    ],
    subServices: [
      'Basic Clean-up', 'Deep Cleansing Facial', 'Anti-Aging Facial', 'De-tan Facial', 'Hydration Facial', 'Acne Treatment Facial',
      'Blackhead Removal', 'Whitehead Removal', 'Pimple Treatment', 'Skin Polishing',
      'Eyebrow Threading', 'Eyebrow Waxing', 'Ear Hair Removal', 'Nose Hair Removal', 'Face Waxing',
      'Skin Tightening', 'Face Massage', 'LED Facial Therapy',
    ],
  },
  {
    key: 'scalp_health',
    label: 'Scalp & Hair Health',
    icon: '💆',
    tabIcon: 'scalp',
    sections: [
      {
        label: 'Scalp Treatments',
        services: ['Anti-Dandruff Treatment', 'Scalp Detox', 'Hair Fall Control', 'Hair Growth Therapy', 'Scalp Nourishment Therapy'],
      },
      {
        label: 'Oil & Therapy',
        services: ['Head Oil Massage', 'Deep Conditioning Treatment', 'Protein Treatment'],
      },
    ],
    subServices: [
      'Anti-Dandruff Treatment', 'Scalp Detox', 'Hair Fall Control', 'Hair Growth Therapy', 'Scalp Nourishment Therapy',
      'Head Oil Massage', 'Deep Conditioning Treatment', 'Protein Treatment',
    ],
  },
  {
    key: 'wellness',
    label: 'Wellness & Relaxation',
    icon: '🧘',
    tabIcon: 'wellness',
    sections: [
      {
        label: 'Massage Services',
        services: ['Head Massage', 'Neck Massage', 'Shoulder Massage', 'Head + Neck + Shoulder Combo'],
      },
      {
        label: 'Relaxation Services',
        services: ['Stress Relief Therapy', 'Relaxation Package'],
      },
    ],
    subServices: [
      'Head Massage', 'Neck Massage', 'Shoulder Massage', 'Head + Neck + Shoulder Combo',
      'Stress Relief Therapy', 'Relaxation Package',
    ],
  },
  {
    key: 'hand_foot',
    label: 'Hand & Foot Grooming',
    icon: '🖐',
    tabIcon: 'hand',
    sections: [
      {
        label: 'Hand Care',
        services: ['Express Manicure', 'Nail Cleaning', 'Nail Shaping'],
      },
      {
        label: 'Foot Care',
        services: ['Express Pedicure', 'Foot Cleaning', 'Heel Repair'],
      },
    ],
    subServices: [
      'Express Manicure', 'Nail Cleaning', 'Nail Shaping',
      'Express Pedicure', 'Foot Cleaning', 'Heel Repair',
    ],
  },
  {
    key: 'packages',
    label: 'Packages & Combos',
    icon: '🎁',
    tabIcon: 'package',
    sections: [
      {
        label: 'Basic Combos',
        services: ['Haircut + Beard Trim', 'Haircut + Shave'],
      },
      {
        label: 'Premium Combos',
        services: ['Haircut + Beard + Facial', 'Haircut + Colour + Styling', 'Full Grooming Package'],
      },
      {
        label: 'Event Packages',
        services: ['Groom Wedding Package', 'Party Grooming Package', 'Photoshoot Styling'],
      },
    ],
    subServices: [
      'Haircut + Beard Trim', 'Haircut + Shave',
      'Haircut + Beard + Facial', 'Haircut + Colour + Styling', 'Full Grooming Package',
      'Groom Wedding Package', 'Party Grooming Package', 'Photoshoot Styling',
    ],
  },
  {
    key: 'memberships',
    label: 'Memberships',
    icon: '⭐',
    tabIcon: 'membership',
    sections: [
      {
        label: 'Subscription Plans',
        services: ['Monthly Grooming Plan', 'Unlimited Haircut Plan', 'Unlimited Beard Line-up Plan', 'VIP Membership', 'Priority Service Membership'],
      },
    ],
    subServices: [
      'Monthly Grooming Plan', 'Unlimited Haircut Plan', 'Unlimited Beard Line-up Plan', 'VIP Membership', 'Priority Service Membership',
    ],
  },
];

export const MAKEUP_BRIDAL_CATEGORIES = [
  {
    key: 'mb_makeup',
    label: 'Makeup Services',
    icon: '💄',
    tabIcon: 'makeup',
    sections: [
      {
        label: 'Bridal Makeup',
        services: [
          'Bridal Makeup', 'HD Bridal Makeup', 'Airbrush Bridal Makeup',
        ],
      },
      {
        label: 'Event Makeup',
        services: [
          'Engagement Makeup', 'Party Makeup', 'Reception Makeup', 'Cocktail Makeup',
        ],
      },
      {
        label: 'Special Services',
        services: [
          'Trial Makeup', 'Makeup Consultation', 'On-Location Makeup Service', 'Photoshoot Makeup',
        ],
      },
    ],
    subServices: [
      'Bridal Makeup', 'HD Bridal Makeup', 'Airbrush Bridal Makeup',
      'Engagement Makeup', 'Party Makeup', 'Reception Makeup', 'Cocktail Makeup',
      'Trial Makeup', 'Makeup Consultation', 'On-Location Makeup Service', 'Photoshoot Makeup',
    ],
  },
  {
    key: 'mb_hairstyling',
    label: 'Hairstyling',
    icon: '💇‍♀️',
    tabIcon: 'scissors',
    sections: [
      {
        label: 'Bridal & Events',
        services: [
          'Bridal Hairstyling', 'Engagement Hairstyling', 'Reception Hairstyling', 'Party Hairstyling',
        ],
      },
      {
        label: 'Styling',
        services: ['Hair Extensions Styling'],
      },
    ],
    subServices: [
      'Bridal Hairstyling', 'Engagement Hairstyling', 'Reception Hairstyling', 'Party Hairstyling',
      'Hair Extensions Styling',
    ],
  },
  {
    key: 'mb_draping',
    label: 'Draping & Dressing',
    icon: '👘',
    tabIcon: 'draping',
    sections: [
      {
        label: 'Draping',
        services: ['Saree Draping', 'Lehenga Draping', 'Dupatta Draping'],
      },
      {
        label: 'Assistance',
        services: ['Bridal Dressing Assistance'],
      },
    ],
    subServices: [
      'Saree Draping', 'Lehenga Draping', 'Dupatta Draping', 'Bridal Dressing Assistance',
    ],
  },
  {
    key: 'mb_prebridal',
    label: 'Pre-Bridal',
    icon: '✨',
    tabIcon: 'prebridal',
    sections: [
      {
        label: 'Skin & Hair Care',
        services: ['Pre-Bridal Skin Care', 'Pre-Bridal Hair Care'],
      },
      {
        label: 'Packages & Consultation',
        services: ['Full Pre-Bridal Package', 'Bridal Consultation'],
      },
    ],
    subServices: [
      'Pre-Bridal Skin Care', 'Pre-Bridal Hair Care', 'Full Pre-Bridal Package', 'Bridal Consultation',
    ],
  },
  {
    key: 'mb_grooming',
    label: 'Grooming Add-ons',
    icon: '💆‍♀️',
    tabIcon: 'grooming',
    sections: [
      {
        label: 'Grooming',
        services: [
          'Eyebrow Shaping', 'Upper Lip / Face Cleanup',
          'Manicure & Pedicure (Bridal)', 'Full Body Wax (Bridal Prep)',
        ],
      },
    ],
    subServices: [
      'Eyebrow Shaping', 'Upper Lip / Face Cleanup',
      'Manicure & Pedicure (Bridal)', 'Full Body Wax (Bridal Prep)',
    ],
  },
  {
    key: 'mb_premium',
    label: 'Premium Add-ons',
    icon: '⭐',
    tabIcon: 'premium',
    sections: [
      {
        label: 'Premium',
        services: [
          'False Eyelashes', 'Lens Application',
          'High-End Product Upgrade', 'Touch-Up Services (Hourly / Event)',
        ],
      },
    ],
    subServices: [
      'False Eyelashes', 'Lens Application',
      'High-End Product Upgrade', 'Touch-Up Services (Hourly / Event)',
    ],
  },
];

export const SPA_WELLNESS_MALE_CATEGORIES = [
  {
    key: 'spa_basic_massage_men',
    label: 'Basic Massage',
    icon: '💆',
    tabIcon: 'massage',
    subServices: ['Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage', 'Hand Massage'],
  },
  {
    key: 'spa_full_body_massage_men',
    label: 'Full Body Massage',
    icon: '🛌',
    tabIcon: 'massage',
    subServices: ['Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage', 'Swedish Massage'],
  },
  {
    key: 'spa_premium_therapies_men',
    label: 'Premium Therapies',
    icon: '✨',
    tabIcon: 'therapy',
    subServices: ['Aroma Therapy Massage', 'Hot Stone Massage', 'Thai Massage', 'Balinese Massage'],
  },
  {
    key: 'spa_body_spa_men',
    label: 'Body Spa',
    icon: '🛁',
    tabIcon: 'spa',
    subServices: ['Body Spa', 'Body Polishing', 'Body Scrub', 'Body Wrap'],
  },
  {
    key: 'spa_wellness_therapy_men',
    label: 'Wellness Therapy',
    icon: '🧘',
    tabIcon: 'wellness',
    subServices: ['Stress Relief Therapy', 'Muscle Recovery Therapy', 'Detox Therapy'],
  },
];

export const SPA_WELLNESS_FEMALE_CATEGORIES = [
  {
    key: 'spa_basic_massage_women',
    label: 'Basic Massage',
    icon: '💆',
    tabIcon: 'massage',
    subServices: ['Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage', 'Hand Massage'],
  },
  {
    key: 'spa_full_body_massage_women',
    label: 'Full Body Massage',
    icon: '🛌',
    tabIcon: 'massage',
    subServices: ['Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage', 'Swedish Massage'],
  },
  {
    key: 'spa_premium_therapies_women',
    label: 'Premium Therapies',
    icon: '✨',
    tabIcon: 'therapy',
    subServices: ['Aromatherapy Massage', 'Hot Stone Massage', 'Thai Massage', 'Balinese Massage', 'Signature Spa Therapy'],
  },
  {
    key: 'spa_body_spa_women',
    label: 'Body Spa',
    icon: '🛁',
    tabIcon: 'spa',
    subServices: ['Body Spa', 'Body Polishing', 'Body Scrub', 'Body Wrap'],
  },
  {
    key: 'spa_wellness_therapy_women',
    label: 'Wellness Therapy',
    icon: '🧘',
    tabIcon: 'wellness',
    subServices: ['Stress Relief Therapy', 'Muscle Relaxation Therapy', 'Detox Therapy', 'Sleep Therapy'],
  },
  {
    key: 'spa_special_care_women',
    label: 'Special Care',
    icon: '🌸',
    tabIcon: 'care',
    subServices: ['Pre-Bridal Spa', 'Post-Bridal Relaxation', 'Pregnancy Safe Massage'],
  },
];

export const SPA_WELLNESS_UNISEX_CATEGORIES = [
  {
    key: 'spa_basic_massage_unisex',
    label: 'Basic Massage',
    icon: '💆',
    tabIcon: 'massage',
    sections: [
      {
        label: 'Men',
        services: ['Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage', 'Hand Massage'],
      },
      {
        label: 'Female',
        services: ['Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage', 'Hand Massage'],
      },
    ],
    subServices: ['Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage', 'Hand Massage'],
  },
  {
    key: 'spa_full_body_massage_unisex',
    label: 'Full Body Massage',
    icon: '🛌',
    tabIcon: 'massage',
    sections: [
      {
        label: 'Men',
        services: ['Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage', 'Swedish Massage'],
      },
      {
        label: 'Female',
        services: ['Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage', 'Swedish Massage'],
      },
    ],
    subServices: ['Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage', 'Swedish Massage'],
  },
  {
    key: 'spa_premium_therapies_unisex',
    label: 'Premium Therapies',
    icon: '✨',
    tabIcon: 'therapy',
    sections: [
      {
        label: 'Men',
        services: ['Aroma Therapy Massage', 'Hot Stone Massage', 'Thai Massage', 'Balinese Massage'],
      },
      {
        label: 'Female',
        services: ['Aromatherapy Massage', 'Hot Stone Massage', 'Thai Massage', 'Balinese Massage', 'Signature Spa Therapy'],
      },
    ],
    subServices: [
      'Aroma Therapy Massage', 'Aromatherapy Massage', 'Hot Stone Massage',
      'Thai Massage', 'Balinese Massage', 'Signature Spa Therapy',
    ],
  },
  {
    key: 'spa_body_spa_unisex',
    label: 'Body Spa',
    icon: '🛁',
    tabIcon: 'spa',
    sections: [
      {
        label: 'Men',
        services: ['Body Spa', 'Body Polishing', 'Body Scrub', 'Body Wrap'],
      },
      {
        label: 'Female',
        services: ['Body Spa', 'Body Polishing', 'Body Scrub', 'Body Wrap'],
      },
    ],
    subServices: ['Body Spa', 'Body Polishing', 'Body Scrub', 'Body Wrap'],
  },
  {
    key: 'spa_wellness_therapy_unisex',
    label: 'Wellness Therapy',
    icon: '🧘',
    tabIcon: 'wellness',
    sections: [
      {
        label: 'Men',
        services: ['Stress Relief Therapy', 'Muscle Recovery Therapy', 'Detox Therapy'],
      },
      {
        label: 'Female',
        services: ['Stress Relief Therapy', 'Muscle Relaxation Therapy', 'Detox Therapy', 'Sleep Therapy'],
      },
    ],
    subServices: [
      'Stress Relief Therapy', 'Muscle Recovery Therapy',
      'Muscle Relaxation Therapy', 'Detox Therapy', 'Sleep Therapy',
    ],
  },
  {
    key: 'spa_special_care_unisex',
    label: 'Special Care',
    icon: '🌸',
    tabIcon: 'care',
    sections: [
      {
        label: 'Female',
        services: ['Pre-Bridal Spa', 'Post-Bridal Relaxation', 'Pregnancy Safe Massage'],
      },
    ],
    subServices: ['Pre-Bridal Spa', 'Post-Bridal Relaxation', 'Pregnancy Safe Massage'],
  },
];

export const SKIN_DERMA_MALE_CATEGORIES = [
  {
    key: 'derma_hair_scalp_men',
    label: 'Hair & Scalp',
    icon: '🧬',
    tabIcon: 'hair',
    subServices: [
      'Hair Fall Consultation', 'Hair Regrowth Therapy', 'Male Pattern Baldness Treatment',
      'Alopecia Treatment', 'PRP Hair Therapy', 'Scalp Infection Treatment',
    ],
  },
  {
    key: 'derma_skin_face_men',
    label: 'Skin (Face)',
    icon: '🧴',
    tabIcon: 'face',
    subServices: [
      'Acne Treatment', 'Acne Scar Treatment', 'Detan Treatment',
      'Open Pores Treatment', 'Skin Brightening Treatment',
    ],
  },
  {
    key: 'derma_advanced_men',
    label: 'Advanced Treatments',
    icon: '✨',
    tabIcon: 'advanced',
    subServices: ['Chemical Peel', 'Laser Treatment', 'Skin Tightening'],
  },
  {
    key: 'derma_body_skin_men',
    label: 'Body Skin',
    icon: '🧍',
    tabIcon: 'body',
    subServices: [
      'Back Acne Treatment', 'Body Acne Treatment',
      'Skin Allergy Treatment', 'Stretch Marks Treatment',
    ],
  },
  {
    key: 'derma_beard_face_men',
    label: 'Beard & Face Issues',
    icon: '🧔',
    tabIcon: 'beard',
    subServices: [
      'Beard Growth Therapy', 'Beard Patch Treatment', 'Ingrown Hair Treatment',
      'Razor Bumps Treatment', 'Skin Irritation Treatment (After Shaving)',
    ],
  },
  {
    key: 'derma_consultation_men',
    label: 'Consultation',
    icon: '🩺',
    tabIcon: 'consult',
    subServices: [
      'General Skin Consultation', 'Follow-up Consultation',
      'Hair Specialist Consultation', 'Online Dermatologist Consultation',
    ],
  },
];

export const SKIN_DERMA_FEMALE_CATEGORIES = [
  {
    key: 'derma_hair_scalp_women',
    label: 'Hair & Scalp',
    icon: '🧬',
    tabIcon: 'hair',
    subServices: [
      'Hair Fall Treatment', 'Hair Thinning Treatment', 'Hormonal Hair Loss Treatment',
      'Alopecia Treatment', 'PRP Hair Therapy', 'Scalp Infection Treatment', 'Dandruff Treatment',
    ],
  },
  {
    key: 'derma_skin_face_women',
    label: 'Skin (Face)',
    icon: '🧴',
    tabIcon: 'face',
    subServices: [
      'Acne Treatment', 'Acne Scar Treatment', 'Dark Circles Treatment',
      'Detan Treatment', 'Open Pores Treatment', 'Pigmentation Treatment',
      'Skin Brightening Treatment', 'Uneven Skin Tone Treatment',
    ],
  },
  {
    key: 'derma_advanced_women',
    label: 'Advanced Treatments',
    icon: '✨',
    tabIcon: 'advanced',
    subServices: [
      'Chemical Peel', 'Hydrafacial (Medical Grade)', 'Laser Skin Treatment',
      'Skin Rejuvenation', 'Skin Tightening',
    ],
  },
  {
    key: 'derma_anti_aging_women',
    label: 'Anti-Aging',
    icon: '🕰️',
    tabIcon: 'antiaging',
    subServices: [
      'Anti-Aging Treatment', 'Collagen Boost Therapy', 'Fine Line Treatment',
      'Skin Lifting Treatment', 'Wrinkle Reduction',
    ],
  },
  {
    key: 'derma_body_skin_women',
    label: 'Body Skin',
    icon: '🧍',
    tabIcon: 'body',
    subServices: [
      'Back Acne Treatment', 'Body Acne Treatment', 'Skin Allergy Treatment',
      'Stretch Marks Treatment', 'Underarm Pigmentation Treatment',
    ],
  },
  {
    key: 'derma_consultation_women',
    label: 'Consultation',
    icon: '🩺',
    tabIcon: 'consult',
    subServices: [
      'General Skin Consultation', 'Follow-up Consultation',
      'Hair Specialist Consultation', 'Online Dermatologist Consultation',
    ],
  },
];

export const SKIN_DERMA_UNISEX_CATEGORIES = [
  {
    key: 'derma_hair_scalp_unisex',
    label: 'Hair & Scalp',
    icon: '🧬',
    tabIcon: 'hair',
    sections: [
      {
        label: 'Men',
        services: [
          'Hair Fall Consultation', 'Hair Regrowth Therapy', 'Male Pattern Baldness Treatment',
          'Alopecia Treatment', 'PRP Hair Therapy', 'Scalp Infection Treatment',
        ],
      },
      {
        label: 'Female',
        services: [
          'Hair Fall Treatment', 'Hair Thinning Treatment', 'Hormonal Hair Loss Treatment',
          'Alopecia Treatment', 'PRP Hair Therapy', 'Scalp Infection Treatment', 'Dandruff Treatment',
        ],
      },
    ],
    subServices: [
      'Hair Fall Consultation', 'Hair Regrowth Therapy', 'Male Pattern Baldness Treatment',
      'Alopecia Treatment', 'PRP Hair Therapy', 'Scalp Infection Treatment',
      'Hair Fall Treatment', 'Hair Thinning Treatment', 'Hormonal Hair Loss Treatment', 'Dandruff Treatment',
    ],
  },
  {
    key: 'derma_skin_face_unisex',
    label: 'Skin (Face)',
    icon: '🧴',
    tabIcon: 'face',
    sections: [
      {
        label: 'Men',
        services: [
          'Acne Treatment', 'Acne Scar Treatment', 'Detan Treatment',
          'Open Pores Treatment', 'Skin Brightening Treatment',
        ],
      },
      {
        label: 'Female',
        services: [
          'Acne Treatment', 'Acne Scar Treatment', 'Dark Circles Treatment',
          'Detan Treatment', 'Open Pores Treatment', 'Pigmentation Treatment',
          'Skin Brightening Treatment', 'Uneven Skin Tone Treatment',
        ],
      },
    ],
    subServices: [
      'Acne Treatment', 'Acne Scar Treatment', 'Detan Treatment',
      'Open Pores Treatment', 'Skin Brightening Treatment',
      'Dark Circles Treatment', 'Pigmentation Treatment', 'Uneven Skin Tone Treatment',
    ],
  },
  {
    key: 'derma_advanced_unisex',
    label: 'Advanced Treatments',
    icon: '✨',
    tabIcon: 'advanced',
    sections: [
      {
        label: 'Men',
        services: ['Chemical Peel', 'Laser Treatment', 'Skin Tightening'],
      },
      {
        label: 'Female',
        services: [
          'Chemical Peel', 'Hydrafacial (Medical Grade)', 'Laser Skin Treatment',
          'Skin Rejuvenation', 'Skin Tightening',
        ],
      },
    ],
    subServices: [
      'Chemical Peel', 'Laser Treatment', 'Skin Tightening',
      'Hydrafacial (Medical Grade)', 'Laser Skin Treatment', 'Skin Rejuvenation',
    ],
  },
  {
    key: 'derma_anti_aging_unisex',
    label: 'Anti-Aging',
    icon: '🕰️',
    tabIcon: 'antiaging',
    sections: [
      {
        label: 'Female',
        services: [
          'Anti-Aging Treatment', 'Collagen Boost Therapy', 'Fine Line Treatment',
          'Skin Lifting Treatment', 'Wrinkle Reduction',
        ],
      },
    ],
    subServices: [
      'Anti-Aging Treatment', 'Collagen Boost Therapy', 'Fine Line Treatment',
      'Skin Lifting Treatment', 'Wrinkle Reduction',
    ],
  },
  {
    key: 'derma_body_skin_unisex',
    label: 'Body Skin',
    icon: '🧍',
    tabIcon: 'body',
    sections: [
      {
        label: 'Men',
        services: [
          'Back Acne Treatment', 'Body Acne Treatment',
          'Skin Allergy Treatment', 'Stretch Marks Treatment',
        ],
      },
      {
        label: 'Female',
        services: [
          'Back Acne Treatment', 'Body Acne Treatment', 'Skin Allergy Treatment',
          'Stretch Marks Treatment', 'Underarm Pigmentation Treatment',
        ],
      },
    ],
    subServices: [
      'Back Acne Treatment', 'Body Acne Treatment',
      'Skin Allergy Treatment', 'Stretch Marks Treatment', 'Underarm Pigmentation Treatment',
    ],
  },
  {
    key: 'derma_beard_face_unisex',
    label: 'Beard & Face Issues',
    icon: '🧔',
    tabIcon: 'beard',
    sections: [
      {
        label: 'Men',
        services: [
          'Beard Growth Therapy', 'Beard Patch Treatment', 'Ingrown Hair Treatment',
          'Razor Bumps Treatment', 'Skin Irritation Treatment (After Shaving)',
        ],
      },
    ],
    subServices: [
      'Beard Growth Therapy', 'Beard Patch Treatment', 'Ingrown Hair Treatment',
      'Razor Bumps Treatment', 'Skin Irritation Treatment (After Shaving)',
    ],
  },
  {
    key: 'derma_consultation_unisex',
    label: 'Consultation',
    icon: '🩺',
    tabIcon: 'consult',
    sections: [
      {
        label: 'Men',
        services: [
          'General Skin Consultation', 'Follow-up Consultation',
          'Hair Specialist Consultation', 'Online Dermatologist Consultation',
        ],
      },
      {
        label: 'Female',
        services: [
          'General Skin Consultation', 'Follow-up Consultation',
          'Hair Specialist Consultation', 'Online Dermatologist Consultation',
        ],
      },
    ],
    subServices: [
      'General Skin Consultation', 'Follow-up Consultation',
      'Hair Specialist Consultation', 'Online Dermatologist Consultation',
    ],
  },
];

// ─── Salon → Men ─────────────────────────────────────────────────────────────
export const SALON_MALE_CATEGORIES = [
  {
    key: 'salon_m_hair',
    label: 'Hair Services',
    icon: '💇',
    tabIcon: 'scissors',
    sections: [
      {
        label: 'Basic Haircuts',
        services: ['Classic Haircut', 'Trim / Maintenance Cut', 'Kids Haircut', 'Senior Citizen Haircut'],
      },
      {
        label: 'Precision Cuts',
        services: ['Low Fade', 'Mid Fade', 'High Fade', 'Taper Fade', 'Skin Fade / Bald Fade', 'Buzz Cut', 'Crew Cut', 'Caesar Cut'],
      },
      {
        label: 'Advanced Cuts',
        services: ['Undercut', 'Pompadour', 'Quiff', 'Slick Back', 'Textured Crop', 'Modern Mullet', 'Fringe / Bangs Style'],
      },
      {
        label: 'Hair Art & Detailing',
        services: ['Hair Tattoo / Design', 'Line-up / Edge-up', 'Hard Part / Razor Part', 'Fade Patterns'],
      },
      {
        label: 'Hair Styling',
        services: ['Blow Dry', 'Hair Wax Styling', 'Gel Styling', 'Clay Styling', 'Party / Event Styling'],
      },
    ],
    subServices: [
      'Classic Haircut', 'Trim / Maintenance Cut', 'Kids Haircut', 'Senior Citizen Haircut',
      'Low Fade', 'Mid Fade', 'High Fade', 'Taper Fade', 'Skin Fade / Bald Fade', 'Buzz Cut', 'Crew Cut', 'Caesar Cut',
      'Undercut', 'Pompadour', 'Quiff', 'Slick Back', 'Textured Crop', 'Modern Mullet', 'Fringe / Bangs Style',
      'Hair Tattoo / Design', 'Line-up / Edge-up', 'Hard Part / Razor Part', 'Fade Patterns',
      'Blow Dry', 'Hair Wax Styling', 'Gel Styling', 'Clay Styling', 'Party / Event Styling',
    ],
  },
  {
    key: 'salon_m_beard',
    label: 'Beard & Grooming',
    icon: '🧔',
    tabIcon: 'beard',
    sections: [
      {
        label: 'Shaving',
        services: ['Basic Shave', 'Hot Towel Shave', 'Straight Razor Shave', 'Royal Shave', 'Head Shave'],
      },
      {
        label: 'Beard Grooming',
        services: ['Beard Trim', 'Beard Shaping', 'Beard Fade', 'Beard Sculpting'],
      },
      {
        label: 'Mustache',
        services: ['Mustache Trim', 'Mustache Styling', 'Handlebar Styling'],
      },
      {
        label: 'Beard Treatments',
        services: ['Beard Conditioning', 'Beard Spa', 'Hot Oil Beard Treatment', 'Beard Smoothening'],
      },
    ],
    subServices: [
      'Basic Shave', 'Hot Towel Shave', 'Straight Razor Shave', 'Royal Shave', 'Head Shave',
      'Beard Trim', 'Beard Shaping', 'Beard Fade', 'Beard Sculpting',
      'Mustache Trim', 'Mustache Styling', 'Handlebar Styling',
      'Beard Conditioning', 'Beard Spa', 'Hot Oil Beard Treatment', 'Beard Smoothening',
    ],
  },
  {
    key: 'salon_m_colour',
    label: 'Hair Colour & Chemical',
    icon: '🎨',
    tabIcon: 'color',
    sections: [
      {
        label: 'Natural Colour',
        services: ['Grey Coverage', 'Grey Blending', 'Beard Colouring'],
      },
      {
        label: 'Fashion Colour',
        services: ['Global Hair Colour', 'Highlights', 'Lowlights', 'Balayage', 'Ombre'],
      },
      {
        label: 'Chemical Treatments',
        services: ['Hair Smoothening', 'Hair Rebonding', 'Hair Relaxing', 'Keratin Treatment', 'Perming'],
      },
    ],
    subServices: [
      'Grey Coverage', 'Grey Blending', 'Beard Colouring',
      'Global Hair Colour', 'Highlights', 'Lowlights', 'Balayage', 'Ombre',
      'Hair Smoothening', 'Hair Rebonding', 'Hair Relaxing', 'Keratin Treatment', 'Perming',
    ],
  },
  {
    key: 'salon_m_skin',
    label: 'Skincare & Face',
    icon: '🧴',
    tabIcon: 'face',
    sections: [
      {
        label: 'Facial Services',
        services: ['Basic Clean-up', 'Deep Cleansing Facial', 'Anti-Aging Facial', 'De-tan Facial', 'Hydration Facial', 'Acne Treatment Facial'],
      },
      {
        label: 'Skin Treatments',
        services: ['Blackhead Removal', 'Whitehead Removal', 'Pimple Treatment', 'Skin Polishing'],
      },
      {
        label: 'Grooming Details',
        services: ['Eyebrow Threading', 'Eyebrow Waxing', 'Ear Hair Removal', 'Nose Hair Removal'],
      },
      {
        label: 'Advanced Aesthetic',
        services: ['Skin Tightening', 'Face Massage', 'LED Facial Therapy'],
      },
    ],
    subServices: [
      'Basic Clean-up', 'Deep Cleansing Facial', 'Anti-Aging Facial', 'De-tan Facial', 'Hydration Facial', 'Acne Treatment Facial',
      'Blackhead Removal', 'Whitehead Removal', 'Pimple Treatment', 'Skin Polishing',
      'Eyebrow Threading', 'Eyebrow Waxing', 'Ear Hair Removal', 'Nose Hair Removal',
      'Skin Tightening', 'Face Massage', 'LED Facial Therapy',
    ],
  },
  {
    key: 'salon_m_scalp',
    label: 'Scalp & Hair Health',
    icon: '💆',
    tabIcon: 'scalp',
    sections: [
      {
        label: 'Scalp Treatments',
        services: ['Anti-Dandruff Treatment', 'Scalp Detox', 'Hair Fall Control', 'Hair Growth Therapy', 'Scalp Nourishment Therapy'],
      },
      {
        label: 'Oil & Therapy',
        services: ['Head Oil Massage', 'Deep Conditioning Treatment', 'Protein Treatment'],
      },
    ],
    subServices: [
      'Anti-Dandruff Treatment', 'Scalp Detox', 'Hair Fall Control', 'Hair Growth Therapy', 'Scalp Nourishment Therapy',
      'Head Oil Massage', 'Deep Conditioning Treatment', 'Protein Treatment',
    ],
  },
  {
    key: 'salon_m_wellness',
    label: 'Wellness & Relaxation',
    icon: '🧘',
    tabIcon: 'wellness',
    sections: [
      {
        label: 'Massage',
        services: ['Head Massage', 'Neck Massage', 'Shoulder Massage', 'Head + Neck + Shoulder Combo'],
      },
      {
        label: 'Relaxation',
        services: ['Stress Relief Therapy', 'Relaxation Package'],
      },
    ],
    subServices: [
      'Head Massage', 'Neck Massage', 'Shoulder Massage', 'Head + Neck + Shoulder Combo',
      'Stress Relief Therapy', 'Relaxation Package',
    ],
  },
  {
    key: 'salon_m_grooming',
    label: 'Grooming & Body Care',
    icon: '✂️',
    tabIcon: 'grooming',
    sections: [
      {
        label: 'Body Waxing',
        services: ['Chest Waxing', 'Back Waxing', 'Arm Waxing', 'Leg Waxing', 'Full Body Wax'],
      },
      {
        label: 'Hand & Foot',
        services: ['Express Manicure', 'Nail Cleaning', 'Nail Shaping', 'Express Pedicure', 'Foot Cleaning', 'Heel Repair'],
      },
    ],
    subServices: [
      'Chest Waxing', 'Back Waxing', 'Arm Waxing', 'Leg Waxing', 'Full Body Wax',
      'Express Manicure', 'Nail Cleaning', 'Nail Shaping', 'Express Pedicure', 'Foot Cleaning', 'Heel Repair',
    ],
  },
  {
    key: 'salon_m_packages',
    label: 'Packages & Combos',
    icon: '🎁',
    tabIcon: 'package',
    sections: [
      {
        label: 'Basic Combos',
        services: ['Haircut + Beard Trim', 'Haircut + Shave'],
      },
      {
        label: 'Premium Combos',
        services: ['Haircut + Beard + Facial', 'Haircut + Colour + Styling', 'Full Grooming Package'],
      },
      {
        label: 'Event Packages',
        services: ['Groom Wedding Package', 'Party Grooming Package', 'Photoshoot Styling'],
      },
    ],
    subServices: [
      'Haircut + Beard Trim', 'Haircut + Shave',
      'Haircut + Beard + Facial', 'Haircut + Colour + Styling', 'Full Grooming Package',
      'Groom Wedding Package', 'Party Grooming Package', 'Photoshoot Styling',
    ],
  },
  {
    key: 'salon_m_memberships',
    label: 'Memberships',
    icon: '⭐',
    tabIcon: 'membership',
    sections: [
      {
        label: 'Plans',
        services: ['Monthly Grooming Plan', 'Unlimited Haircut Plan', 'VIP Membership', 'Priority Service Membership'],
      },
    ],
    subServices: [
      'Monthly Grooming Plan', 'Unlimited Haircut Plan', 'VIP Membership', 'Priority Service Membership',
    ],
  },
];

// ─── Salon → Women ────────────────────────────────────────────────────────────
export const SALON_FEMALE_CATEGORIES = [
  {
    key: 'salon_f_hair',
    label: 'Hair Services',
    icon: '💇‍♀️',
    tabIcon: 'scissors',
    sections: [
      {
        label: 'Haircuts',
        services: [
          'Haircut (Layer / Step / Trim)', 'Advanced Haircut', 'Fringe / Bangs Cut',
          'U-Cut', 'V-Cut', 'Feather Cut', 'Blunt Cut', 'Kids Haircut',
        ],
      },
      {
        label: 'Hair Styling',
        services: [
          'Hair Styling (Straight / Curl / Party)', 'Blow Dry', 'Hair Ironing',
          'Hair Curling', 'Party Hairstyle', 'Bridal Hairstyle',
          'Engagement Hairstyle', 'Reception Hairstyle',
        ],
      },
      {
        label: 'Hair Color',
        services: [
          'Hair Coloring', 'Global Hair Color', 'Highlights', 'Balayage',
          'Ombre', 'Root Touch-Up', 'Fashion Color', 'Grey Coverage',
          'Hair Extension Installation',
        ],
      },
      {
        label: 'Hair Treatments',
        services: [
          'Hair Spa', 'Hair Smoothening', 'Hair Straightening', 'Keratin Treatment',
          'Hair Botox', 'Rebonding', 'Cysteine Treatment', 'Nanoplastia',
        ],
      },
      {
        label: 'Hair Care',
        services: [
          'Hair Wash', 'Deep Conditioning', 'Head Massage', 'Scalp Treatment',
          'Dandruff Treatment', 'Hair Fall Treatment', 'Oil Treatment',
          'Protein Treatment', 'Split Ends Treatment',
        ],
      },
    ],
    subServices: [
      'Haircut (Layer / Step / Trim)', 'Advanced Haircut', 'Fringe / Bangs Cut', 'U-Cut', 'V-Cut', 'Feather Cut', 'Blunt Cut', 'Kids Haircut',
      'Hair Styling (Straight / Curl / Party)', 'Blow Dry', 'Hair Ironing', 'Hair Curling', 'Party Hairstyle', 'Bridal Hairstyle', 'Engagement Hairstyle', 'Reception Hairstyle',
      'Hair Coloring', 'Global Hair Color', 'Highlights', 'Balayage', 'Ombre', 'Root Touch-Up', 'Fashion Color', 'Grey Coverage', 'Hair Extension Installation',
      'Hair Spa', 'Hair Smoothening', 'Hair Straightening', 'Keratin Treatment', 'Hair Botox', 'Rebonding', 'Cysteine Treatment', 'Nanoplastia',
      'Hair Wash', 'Deep Conditioning', 'Head Massage', 'Scalp Treatment', 'Dandruff Treatment', 'Hair Fall Treatment', 'Oil Treatment', 'Protein Treatment', 'Split Ends Treatment',
    ],
  },
  {
    key: 'salon_f_skin',
    label: 'Skin & Face',
    icon: '🧴',
    tabIcon: 'face',
    sections: [
      {
        label: 'Basic Care',
        services: [
          'Clean-up', 'Basic Facial', 'Detan', 'Bleach',
          'Face Cleanup (Advanced)', 'Express Cleanup', 'Premium Cleanup',
        ],
      },
      {
        label: 'Premium Facials',
        services: [
          'Gold Facial', 'Diamond Facial', 'Charcoal Facial', 'Hydra Facial',
          'Anti-Aging Facial', 'Oxygen Facial', 'Vitamin C Facial',
        ],
      },
      {
        label: 'Skin Treatments',
        services: [
          'Anti-Acne Treatment', 'Skin Brightening', 'Pigmentation Treatment',
          'Dark Circle Treatment', 'Tan Removal Treatment', 'Open Pores Treatment',
        ],
      },
      {
        label: 'Advanced Skin Care',
        services: [
          'Face Polishing', 'Skin Hydration Treatment', 'Exfoliation Treatment',
          'Skin Tightening', 'Collagen Boost Treatment',
        ],
      },
    ],
    subServices: [
      'Clean-up', 'Basic Facial', 'Detan', 'Bleach', 'Face Cleanup (Advanced)', 'Express Cleanup', 'Premium Cleanup',
      'Gold Facial', 'Diamond Facial', 'Charcoal Facial', 'Hydra Facial', 'Anti-Aging Facial', 'Oxygen Facial', 'Vitamin C Facial',
      'Anti-Acne Treatment', 'Skin Brightening', 'Pigmentation Treatment', 'Dark Circle Treatment', 'Tan Removal Treatment', 'Open Pores Treatment',
      'Face Polishing', 'Skin Hydration Treatment', 'Exfoliation Treatment', 'Skin Tightening', 'Collagen Boost Treatment',
    ],
  },
  {
    key: 'salon_f_threading',
    label: 'Threading',
    icon: '🧵',
    tabIcon: 'threading',
    sections: [
      {
        label: 'Threading',
        services: [
          'Eyebrow Threading', 'Upper Lip Threading', 'Forehead Threading',
          'Chin Threading', 'Full Face Threading',
        ],
      },
    ],
    subServices: [
      'Eyebrow Threading', 'Upper Lip Threading', 'Forehead Threading',
      'Chin Threading', 'Full Face Threading',
    ],
  },
  {
    key: 'salon_f_waxing',
    label: 'Waxing',
    icon: '🪒',
    tabIcon: 'waxing',
    sections: [
      {
        label: 'Body Waxing',
        services: [
          'Full Body Wax', 'Half Body Wax', 'Full Arms Wax', 'Half Arms Wax',
          'Full Legs Wax', 'Half Legs Wax', 'Underarms Wax',
          'Bikini Wax', 'Brazilian Wax', 'Face Wax',
        ],
      },
    ],
    subServices: [
      'Full Body Wax', 'Half Body Wax', 'Full Arms Wax', 'Half Arms Wax',
      'Full Legs Wax', 'Half Legs Wax', 'Underarms Wax',
      'Bikini Wax', 'Brazilian Wax', 'Face Wax',
    ],
  },
  {
    key: 'salon_f_body',
    label: 'Body Care',
    icon: '🧍‍♀️',
    tabIcon: 'body',
    sections: [
      {
        label: 'Body Care',
        services: [
          'Body Polish', 'Body Scrub', 'Body Detan',
          'Underarm Lightening', 'Back Cleanup',
        ],
      },
    ],
    subServices: ['Body Polish', 'Body Scrub', 'Body Detan', 'Underarm Lightening', 'Back Cleanup'],
  },
  {
    key: 'salon_f_nails',
    label: 'Nail Services',
    icon: '💅',
    tabIcon: 'nails',
    sections: [
      {
        label: 'Basic Nail Care',
        services: [
          'Manicure', 'Pedicure', 'Express Manicure', 'Express Pedicure',
          'Spa Manicure', 'Spa Pedicure', 'Paraffin Treatment',
          'Detox Pedicure', 'Callus Removal',
          'Cuticle Care', 'Nail Buffing', 'Nail Shaping',
        ],
      },
      {
        label: 'Nail Art',
        services: [
          'Nail Art', 'French Nails', 'Chrome Nails', 'Matte Finish Nails',
          '3D Nail Art', 'Glitter Nails', 'Bridal Nail Art',
        ],
      },
      {
        label: 'Gel & Acrylic',
        services: [
          'Gel Nails', 'Acrylic Nails', 'Polygel Nails',
          'Nail Extensions', 'Gel Extensions', 'Acrylic Extensions',
        ],
      },
      {
        label: 'Nail Repair & Removal',
        services: [
          'Nail Repair', 'Nail Strengthening',
          'Gel Removal', 'Acrylic Removal', 'Extension Removal', 'Refill / Touch-Up',
        ],
      },
    ],
    subServices: [
      'Manicure', 'Pedicure', 'Express Manicure', 'Express Pedicure', 'Spa Manicure', 'Spa Pedicure', 'Paraffin Treatment', 'Detox Pedicure', 'Callus Removal', 'Cuticle Care', 'Nail Buffing', 'Nail Shaping',
      'Nail Art', 'French Nails', 'Chrome Nails', 'Matte Finish Nails', '3D Nail Art', 'Glitter Nails', 'Bridal Nail Art',
      'Gel Nails', 'Acrylic Nails', 'Polygel Nails', 'Nail Extensions', 'Gel Extensions', 'Acrylic Extensions',
      'Nail Repair', 'Nail Strengthening', 'Gel Removal', 'Acrylic Removal', 'Extension Removal', 'Refill / Touch-Up',
    ],
  },
  {
    key: 'salon_f_packages',
    label: 'Packages',
    icon: '🎁',
    tabIcon: 'package',
    sections: [
      {
        label: 'Special Services',
        services: ['Pre-Bridal Package', 'Grooming Package'],
      },
    ],
    subServices: ['Pre-Bridal Package', 'Grooming Package'],
  },
];

// ─── Salon → Unisex ───────────────────────────────────────────────────────────
export const SALON_UNISEX_CATEGORIES = [
  {
    key: 'salon_u_hair',
    label: 'Hair Services',
    icon: '💇',
    tabIcon: 'scissors',
    sections: [
      {
        label: 'Men',
        services: [
          'Basic Haircut', 'Fade / Taper / Skin Fade', 'Designer Haircut', 'Undercut', 'Crew Cut', 'Buzz Cut',
          'Hair Styling', 'Hair Coloring', 'Global Hair Color', 'Highlights / Streaks', 'Root Touch-Up', 'Grey Coverage',
          'Hair Spa', 'Hair Smoothening', 'Hair Straightening', 'Keratin Treatment', 'Hair Botox', 'Hair Rebonding',
          'Hair Wash', 'Blow Dry', 'Head Massage', 'Dandruff Treatment', 'Hair Fall Treatment', 'Scalp Treatment', 'Deep Conditioning',
        ],
      },
      {
        label: 'Female',
        services: [
          'Haircut (Layer / Step / Trim)', 'Advanced Haircut', 'Fringe / Bangs Cut', 'U-Cut', 'V-Cut', 'Feather Cut', 'Blunt Cut', 'Kids Haircut',
          'Hair Styling (Straight / Curl / Party)', 'Blow Dry', 'Hair Ironing', 'Hair Curling', 'Party Hairstyle', 'Bridal Hairstyle', 'Engagement Hairstyle', 'Reception Hairstyle',
          'Hair Coloring', 'Global Hair Color', 'Highlights', 'Balayage', 'Ombre', 'Root Touch-Up', 'Fashion Color', 'Grey Coverage', 'Hair Extension Installation',
          'Hair Spa', 'Hair Smoothening', 'Hair Straightening', 'Keratin Treatment', 'Hair Botox', 'Rebonding', 'Cysteine Treatment', 'Nanoplastia',
          'Hair Wash', 'Deep Conditioning', 'Head Massage', 'Scalp Treatment', 'Dandruff Treatment', 'Hair Fall Treatment', 'Oil Treatment', 'Protein Treatment', 'Split Ends Treatment',
        ],
      },
    ],
    subServices: [
      'Basic Haircut', 'Fade / Taper / Skin Fade', 'Designer Haircut', 'Undercut', 'Crew Cut', 'Buzz Cut',
      'Haircut (Layer / Step / Trim)', 'Advanced Haircut', 'Fringe / Bangs Cut', 'U-Cut', 'V-Cut', 'Feather Cut', 'Blunt Cut', 'Kids Haircut',
      'Hair Styling', 'Hair Styling (Straight / Curl / Party)', 'Blow Dry', 'Hair Ironing', 'Hair Curling', 'Party Hairstyle', 'Bridal Hairstyle',
      'Hair Coloring', 'Global Hair Color', 'Highlights', 'Balayage', 'Ombre', 'Root Touch-Up', 'Fashion Color', 'Grey Coverage', 'Hair Extension Installation',
      'Hair Spa', 'Hair Smoothening', 'Hair Straightening', 'Keratin Treatment', 'Hair Botox', 'Hair Rebonding', 'Rebonding', 'Cysteine Treatment', 'Nanoplastia',
      'Hair Wash', 'Deep Conditioning', 'Head Massage', 'Scalp Treatment', 'Dandruff Treatment', 'Hair Fall Treatment', 'Oil Treatment', 'Protein Treatment', 'Split Ends Treatment',
    ],
  },
  {
    key: 'salon_u_skin',
    label: 'Skin & Face',
    icon: '🧴',
    tabIcon: 'face',
    sections: [
      {
        label: 'Men',
        services: [
          'Clean-up', 'Basic Facial', 'Detan', 'Face Bleach', 'Express Cleanup', 'Premium Cleanup',
          'Gold Facial', 'Charcoal Facial',
          'Anti-Acne Treatment', 'Skin Brightening', 'Oil Control Treatment',
        ],
      },
      {
        label: 'Female',
        services: [
          'Clean-up', 'Basic Facial', 'Detan', 'Bleach', 'Face Cleanup (Advanced)', 'Express Cleanup', 'Premium Cleanup',
          'Gold Facial', 'Diamond Facial', 'Charcoal Facial', 'Hydra Facial', 'Anti-Aging Facial', 'Oxygen Facial', 'Vitamin C Facial',
          'Anti-Acne Treatment', 'Skin Brightening', 'Pigmentation Treatment', 'Dark Circle Treatment', 'Tan Removal Treatment', 'Open Pores Treatment',
          'Face Polishing', 'Skin Hydration Treatment', 'Exfoliation Treatment', 'Skin Tightening', 'Collagen Boost Treatment',
        ],
      },
    ],
    subServices: [
      'Clean-up', 'Basic Facial', 'Detan', 'Face Bleach', 'Bleach', 'Face Cleanup (Advanced)', 'Express Cleanup', 'Premium Cleanup',
      'Gold Facial', 'Diamond Facial', 'Charcoal Facial', 'Hydra Facial', 'Anti-Aging Facial', 'Oxygen Facial', 'Vitamin C Facial',
      'Anti-Acne Treatment', 'Skin Brightening', 'Pigmentation Treatment', 'Dark Circle Treatment', 'Tan Removal Treatment', 'Open Pores Treatment', 'Oil Control Treatment',
      'Face Polishing', 'Skin Hydration Treatment', 'Exfoliation Treatment', 'Skin Tightening', 'Collagen Boost Treatment',
    ],
  },
  {
    key: 'salon_u_threading_waxing',
    label: 'Threading & Waxing',
    icon: '🪒',
    tabIcon: 'waxing',
    sections: [
      {
        label: 'Men',
        services: ['Eyebrow Threading', 'Nose Wax', 'Ear Wax', 'Ear Cleaning', 'Chest Waxing', 'Back Waxing', 'Arm Waxing', 'Leg Waxing'],
      },
      {
        label: 'Female',
        services: [
          'Eyebrow Threading', 'Upper Lip Threading', 'Forehead Threading', 'Chin Threading', 'Full Face Threading',
          'Full Body Wax', 'Half Body Wax', 'Full Arms Wax', 'Half Arms Wax', 'Full Legs Wax', 'Half Legs Wax',
          'Underarms Wax', 'Bikini Wax', 'Brazilian Wax', 'Face Wax',
        ],
      },
    ],
    subServices: [
      'Eyebrow Threading', 'Upper Lip Threading', 'Forehead Threading', 'Chin Threading', 'Full Face Threading',
      'Nose Wax', 'Ear Wax', 'Ear Cleaning', 'Chest Waxing', 'Back Waxing', 'Arm Waxing', 'Leg Waxing',
      'Full Body Wax', 'Half Body Wax', 'Full Arms Wax', 'Half Arms Wax', 'Full Legs Wax', 'Half Legs Wax',
      'Underarms Wax', 'Bikini Wax', 'Brazilian Wax', 'Face Wax',
    ],
  },
  {
    key: 'salon_u_body',
    label: 'Body Care',
    icon: '🧍',
    tabIcon: 'body',
    sections: [
      {
        label: 'Men',
        services: ['Underarm Cleaning'],
      },
      {
        label: 'Female',
        services: ['Body Polish', 'Body Scrub', 'Body Detan', 'Underarm Lightening', 'Back Cleanup'],
      },
    ],
    subServices: [
      'Underarm Cleaning', 'Body Polish', 'Body Scrub', 'Body Detan', 'Underarm Lightening', 'Back Cleanup',
    ],
  },
  {
    key: 'salon_u_nails',
    label: 'Nail Services',
    icon: '💅',
    tabIcon: 'nails',
    sections: [
      {
        label: 'Female',
        services: [
          'Manicure', 'Pedicure', 'Express Manicure', 'Express Pedicure', 'Spa Manicure', 'Spa Pedicure',
          'Paraffin Treatment', 'Detox Pedicure', 'Callus Removal', 'Cuticle Care', 'Nail Buffing', 'Nail Shaping',
          'Nail Art', 'French Nails', 'Chrome Nails', 'Matte Finish Nails', '3D Nail Art', 'Glitter Nails', 'Bridal Nail Art',
          'Gel Nails', 'Acrylic Nails', 'Polygel Nails', 'Nail Extensions', 'Gel Extensions', 'Acrylic Extensions',
          'Nail Repair', 'Nail Strengthening', 'Gel Removal', 'Acrylic Removal', 'Extension Removal', 'Refill / Touch-Up',
        ],
      },
    ],
    subServices: [
      'Manicure', 'Pedicure', 'Express Manicure', 'Express Pedicure', 'Spa Manicure', 'Spa Pedicure', 'Paraffin Treatment', 'Detox Pedicure', 'Callus Removal', 'Cuticle Care', 'Nail Buffing', 'Nail Shaping',
      'Nail Art', 'French Nails', 'Chrome Nails', 'Matte Finish Nails', '3D Nail Art', 'Glitter Nails', 'Bridal Nail Art',
      'Gel Nails', 'Acrylic Nails', 'Polygel Nails', 'Nail Extensions', 'Gel Extensions', 'Acrylic Extensions',
      'Nail Repair', 'Nail Strengthening', 'Gel Removal', 'Acrylic Removal', 'Extension Removal', 'Refill / Touch-Up',
    ],
  },
  {
    key: 'salon_u_packages',
    label: 'Packages',
    icon: '🎁',
    tabIcon: 'package',
    sections: [
      {
        label: 'Men',
        services: ['Grooming Package'],
      },
      {
        label: 'Female',
        services: ['Pre-Bridal Package', 'Grooming Package'],
      },
    ],
    subServices: ['Grooming Package', 'Pre-Bridal Package'],
  },
];

// ─── Returns tailored categories based on salon type + served gender ──────────
export function getCategoriesForSalonType(businessType, servedGender) {
  if (businessType === 'barbershop') {
    return BARBERSHOP_CATEGORIES;
  }

  if (businessType === 'makeup_bridal') {
    return MAKEUP_BRIDAL_CATEGORIES;
  }

  if (businessType === 'spa_wellness') {
    if (servedGender === 'male')   return SPA_WELLNESS_MALE_CATEGORIES;
    if (servedGender === 'female') return SPA_WELLNESS_FEMALE_CATEGORIES;
    return SPA_WELLNESS_UNISEX_CATEGORIES;
  }

  if (businessType === 'skin_derma') {
    if (servedGender === 'male')   return SKIN_DERMA_MALE_CATEGORIES;
    if (servedGender === 'female') return SKIN_DERMA_FEMALE_CATEGORIES;
    return SKIN_DERMA_UNISEX_CATEGORIES;
  }

  if (businessType === 'salon') {
    if (servedGender === 'male')   return SALON_MALE_CATEGORIES;
    if (servedGender === 'female') return SALON_FEMALE_CATEGORIES;
    return SALON_UNISEX_CATEGORIES;
  }

  // fallback
  if (servedGender === 'male')   return MALE_CATEGORIES;
  if (servedGender === 'female') return FEMALE_CATEGORIES;
  return UNISEX_CATEGORIES;
}
