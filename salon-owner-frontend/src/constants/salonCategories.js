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
        label: 'Haircuts',
        services: [
          'Basic Haircut', 'Fade / Taper / Skin Fade', 'Designer Haircut',
          'Undercut', 'Crew Cut', 'Buzz Cut',
        ],
      },
      {
        label: 'Hair Styling & Color',
        services: [
          'Hair Styling', 'Hair Coloring', 'Global Hair Color',
          'Highlights / Streaks', 'Root Touch-Up', 'Grey Coverage',
        ],
      },
      {
        label: 'Hair Treatments',
        services: [
          'Hair Spa', 'Hair Smoothening', 'Hair Straightening',
          'Keratin Treatment', 'Hair Botox', 'Hair Rebonding',
        ],
      },
      {
        label: 'Hair Care & Scalp',
        services: [
          'Hair Wash', 'Blow Dry', 'Dandruff Treatment',
          'Hair Fall Treatment', 'Scalp Treatment', 'Deep Conditioning',
        ],
      },
    ],
    subServices: [
      'Basic Haircut', 'Fade / Taper / Skin Fade', 'Designer Haircut', 'Undercut', 'Crew Cut', 'Buzz Cut',
      'Hair Styling', 'Hair Coloring', 'Global Hair Color', 'Highlights / Streaks', 'Root Touch-Up', 'Grey Coverage',
      'Hair Spa', 'Hair Smoothening', 'Hair Straightening', 'Keratin Treatment', 'Hair Botox', 'Hair Rebonding',
      'Hair Wash', 'Blow Dry', 'Dandruff Treatment', 'Hair Fall Treatment', 'Scalp Treatment', 'Deep Conditioning',
    ],
  },
  {
    key: 'beard_grooming',
    label: 'Beard & Grooming',
    icon: '🧔',
    tabIcon: 'beard',
    sections: [
      {
        label: 'Basic Grooming',
        services: ['Beard Trim', 'Clean Shave', 'Hot Towel Shave'],
      },
      {
        label: 'Styling & Shaping',
        services: ['Beard Styling / Shape', 'Designer Beard', 'Beard Fade'],
      },
      {
        label: 'Coloring',
        services: ['Beard Coloring', 'Grey Coverage (Beard)'],
      },
      {
        label: 'Treatments',
        services: ['Beard Spa', 'Beard Smoothening'],
      },
      {
        label: 'Care & Maintenance',
        services: ['Beard Wash', 'Beard Conditioning', 'Beard Oil Treatment', 'Beard Dandruff Treatment'],
      },
    ],
    subServices: [
      'Beard Trim', 'Clean Shave', 'Hot Towel Shave',
      'Beard Styling / Shape', 'Designer Beard', 'Beard Fade',
      'Beard Coloring', 'Grey Coverage (Beard)',
      'Beard Spa', 'Beard Smoothening',
      'Beard Wash', 'Beard Conditioning', 'Beard Oil Treatment', 'Beard Dandruff Treatment',
    ],
  },
  {
    key: 'skin_face',
    label: 'Face & Skin',
    icon: '🧴',
    tabIcon: 'face',
    sections: [
      {
        label: 'Facials',
        services: [
          'Clean-up', 'Basic Facial', 'Detan', 'Face Bleach',
          'Gold Facial', 'Diamond Facial', 'Charcoal Facial', 'Fruit Facial', 'Anti-Aging Facial',
        ],
      },
      {
        label: 'Skin Treatments',
        services: [
          'Anti-Acne Treatment', 'Skin Brightening', 'Pigmentation Treatment',
          'Dark Circle Treatment', 'Oil Control Treatment', 'Sensitive Skin Treatment', 'Deep Cleansing Treatment',
        ],
      },
      {
        label: 'Advanced Skin Care',
        services: ['Face Polishing', 'Skin Hydration Treatment', 'Exfoliation Treatment'],
      },
    ],
    subServices: [
      'Clean-up', 'Basic Facial', 'Detan', 'Face Bleach',
      'Gold Facial', 'Diamond Facial', 'Charcoal Facial', 'Fruit Facial', 'Anti-Aging Facial',
      'Anti-Acne Treatment', 'Skin Brightening', 'Pigmentation Treatment',
      'Dark Circle Treatment', 'Oil Control Treatment', 'Sensitive Skin Treatment', 'Deep Cleansing Treatment',
      'Face Polishing', 'Skin Hydration Treatment', 'Exfoliation Treatment',
    ],
  },
  {
    key: 'body_grooming',
    label: 'Body Grooming',
    icon: '🧍',
    tabIcon: 'body',
    sections: [
      {
        label: 'Hair Removal',
        services: ['Chest Waxing', 'Back Waxing', 'Arm Waxing', 'Leg Waxing', 'Full Body Wax'],
      },
      {
        label: 'Threading & Precision',
        services: ['Eyebrow Threading', 'Threading (optional)', 'Nose Wax', 'Ear Wax'],
      },
      {
        label: 'Hygiene & Care',
        services: ['Ear Cleaning', 'Underarm Cleaning', 'Intimate Area Grooming (optional)'],
      },
      {
        label: 'Body Care',
        services: ['Body Polishing', 'Body Scrub', 'Body Detan'],
      },
    ],
    subServices: [
      'Chest Waxing', 'Back Waxing', 'Arm Waxing', 'Leg Waxing', 'Full Body Wax',
      'Eyebrow Threading', 'Threading (optional)', 'Nose Wax', 'Ear Wax',
      'Ear Cleaning', 'Underarm Cleaning', 'Intimate Area Grooming (optional)',
      'Body Polishing', 'Body Scrub', 'Body Detan',
    ],
  },
];

export const MAKEUP_BRIDAL_CATEGORIES = [
  {
    key: 'bridal_events',
    label: 'Bridal & Makeup',
    icon: '👰',
    subServices: [
      'Bridal Makeup', 'HD Bridal Makeup', 'Airbrush Bridal Makeup',
      'Engagement Makeup', 'Party Makeup', 'Reception Makeup', 'Cocktail Makeup',
      'Trial Makeup', 'Makeup Consultation', 'On-Location Makeup Service', 'Photoshoot Makeup',
      'Bridal Hairstyling', 'Party Hairstyling', 'Engagement Hairstyling', 'Reception Hairstyling',
      'Saree Draping', 'Lehenga Draping', 'Dupatta Draping', 'Bridal Dressing Assistance',
      'Pre-Bridal Skin Care', 'Pre-Bridal Hair Care', 'Full Pre-Bridal Package', 'Bridal Consultation',
      'False Eyelashes', 'Lens Application', 'Touch-Up Services (Hourly / Event)',
    ],
  },
  {
    key: 'nail_services',
    label: 'Nail Services',
    icon: '💅',
    subServices: [
      'Manicure', 'Pedicure', 'Express Manicure', 'Express Pedicure',
      'Nail Art', 'French Nails', 'Chrome Nails', 'Matte Finish Nails',
      'Glitter Nails', 'Bridal Nail Art', '3D Nail Art',
      'Gel Nails', 'Acrylic Nails', 'Nail Extensions', 'Gel Extensions',
      'Nail Repair', 'Cuticle Care', 'Nail Shaping',
      'Spa Manicure', 'Spa Pedicure', 'Paraffin Treatment',
      'Gel Removal', 'Acrylic Removal', 'Refill / Touch-Up',
    ],
  },
  {
    key: 'skin_beauty',
    label: 'Skin Prep & Beauty',
    icon: '🧖',
    subServices: [
      'Clean-up', 'Basic Facial', 'Detan', 'Bleach', 'Face Cleanup (Advanced)',
      'Gold Facial', 'Diamond Facial', 'Hydra Facial', 'Oxygen Facial', 'Vitamin C Facial',
      'Anti-Acne Treatment', 'Skin Brightening', 'Pigmentation Treatment',
      'Tan Removal Treatment', 'Dark Circle Treatment',
      'Face Massage', 'Neck Treatment', 'Under Eye Care', 'Lip Care Treatment',
    ],
  },
  {
    key: 'hair_services_women',
    label: 'Hair Styling',
    icon: '💇',
    subServices: [
      'Haircut (Layer / Step / Trim)', 'Fringe / Bangs Cut', 'Blunt Cut',
      'Hair Styling (Straight / Curl / Party)', 'Blow Dry', 'Hair Ironing', 'Hair Curling',
      'Party Hairstyle', 'Bridal Hairstyle', 'Engagement Hairstyle', 'Reception Hairstyle',
      'Hair Coloring', 'Global Hair Color', 'Highlights', 'Balayage', 'Ombre', 'Root Touch-Up',
      'Hair Extensions Styling',
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
        label: 'Women',
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
        label: 'Women',
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
        label: 'Women',
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
        label: 'Women',
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
        label: 'Women',
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
        label: 'Women',
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
        label: 'Women',
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
        label: 'Women',
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
        label: 'Women',
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
        label: 'Women',
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
        label: 'Women',
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
        label: 'Women',
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

  // 'salon' or unset → standard gender-based categories
  if (servedGender === 'male')   return MALE_CATEGORIES;
  if (servedGender === 'female') return FEMALE_CATEGORIES;
  return UNISEX_CATEGORIES;
}
