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
      // Styling & Color
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
