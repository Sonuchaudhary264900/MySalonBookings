// Shared salon category constants used by registration form and settings editor

export const MALE_CATEGORIES = [
  {
    key: 'hair_services',
    label: 'Hair Services (Men)',
    icon: '✂️',
    subServices: [
      'Haircut', 'Fade Haircut', 'Kids Haircut', 'Long Hair Cut',
      'Hair Styling', 'Hair Wash', 'Blow Dry', 'Texture Styling',
      'Hair Colour', 'Highlights', 'Grey Coverage',
      'Hair Spa', 'Anti-Dandruff Treatment', 'Hair Fall Treatment', 'Scalp Detox',
      'Keratin Treatment', 'Hair Smoothening', 'Deep Conditioning',
    ],
  },
  {
    key: 'beard_grooming',
    label: 'Beard & Grooming',
    icon: '🧔',
    subServices: [
      'Beard Trim', 'Beard Shaping', 'Beard Fade',
      'Clean Shave', 'Hot Towel Shave', 'Royal Shave',
    ],
  },
  {
    key: 'spa_massage',
    label: 'Spa & Massage',
    icon: '💆',
    subServices: [
      'Head Massage', 'Oil Head Massage', 'Head + Neck + Shoulder Massage',
      'Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage',
      'Aroma Therapy Massage', 'Hot Stone Massage',
      'Body Spa', 'Body Polish',
      'Stress Relief Therapy',
    ],
  },
  {
    key: 'skin_face',
    label: 'Skin & Face (Men Grooming)',
    icon: '🧴',
    subServices: [
      'Cleanup', 'Facial', 'De-Tan', 'Charcoal Facial',
      'Anti-Acne Treatment', 'Blackhead Removal', 'Skin Brightening',
    ],
  },
  {
    key: 'men_dermatology',
    label: 'Men Dermatology',
    icon: '🧴',
    subServices: [
      'Hair Fall Consultation', 'Hair Regrowth Therapy', 'Male Pattern Baldness Treatment', 'PRP Hair Therapy', 'Dandruff Treatment',
      'Acne Treatment', 'Acne Scar Treatment', 'Detan Treatment', 'Open Pores Treatment', 'Skin Brightening Treatment',
      'Chemical Peel', 'Laser Treatment',
      'Back Acne Treatment', 'Body Acne Treatment', 'Skin Allergy Treatment',
      'Beard Growth Therapy', 'Ingrown Hair Treatment', 'Razor Bumps Treatment',
      'General Skin Consultation', 'Hair Specialist Consultation', 'Online Dermatologist Consultation',
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
      'Haircut', 'Layer Cut', 'Step Cut', 'Kids Haircut',
      'Hair Styling', 'Blow Dry', 'Hair Wash', 'Straightening', 'Curling', 'Party Hairstyle', 'Bridal Hairstyle',
      'Hair Colour', 'Highlights', 'Global Hair Colour', 'Grey Coverage',
      'Hair Spa', 'Hair Fall Treatment', 'Dandruff Treatment', 'Deep Conditioning',
      'Keratin Treatment', 'Hair Smoothening', 'Hair Straightening',
    ],
  },
  {
    key: 'nail_services',
    label: 'Nail Services',
    icon: '💅',
    subServices: [
      'Manicure', 'Pedicure', 'Spa Manicure', 'Spa Pedicure',
      'Nail Art', 'Gel Nails', 'Nail Extensions',
    ],
  },
  {
    key: 'skin_beauty',
    label: 'Skin & Beauty',
    icon: '🧖',
    subServices: [
      'Cleanup', 'Facial', 'De-Tan', 'Bleach', 'Charcoal Facial',
      'Skin Brightening', 'Anti-Acne Treatment', 'Dark Circle Treatment', 'Blackhead Removal',
    ],
  },
  {
    key: 'body_grooming_women',
    label: 'Body Grooming',
    icon: '🧴',
    subServices: [
      'Eyebrow Threading', 'Upper Lip Threading', 'Full Face Threading',
      'Full Arms Wax', 'Half Arms Wax', 'Full Legs Wax', 'Half Legs Wax', 'Underarms Wax', 'Face Wax',
    ],
  },
  {
    key: 'spa_relaxation',
    label: 'Spa & Relaxation',
    icon: '💆',
    subServices: [
      'Head Massage', 'Oil Head Massage', 'Head + Neck + Shoulder Massage',
      'Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage',
      'Aroma Therapy Massage', 'Hot Stone Massage',
      'Body Spa', 'Body Polish',
      'Stress Relief Therapy', 'Sleep Therapy',
      'Pre-Bridal Spa', 'Pregnancy Safe Massage',
    ],
  },
  {
    key: 'bridal_events',
    label: 'Bridal & Events',
    icon: '👰',
    subServices: [
      'Bridal Makeup', 'Airbrush Bridal Makeup',
      'Engagement Makeup', 'Party Makeup',
      'On-Location Makeup Service',
      'Bridal Hairstyling', 'Party Hairstyling', 'Hair Extensions Styling',
      'Saree Draping', 'Lehenga Draping', 'Bridal Dressing Assistance',
      'Pre-Bridal Skin Care', 'Pre-Bridal Hair Care', 'Full Pre-Bridal Package',
      'Eyebrow Shaping', 'Manicure & Pedicure (Bridal)', 'Full Body Wax (Bridal Prep)',
    ],
  },
  {
    key: 'women_dermatology',
    label: 'Women Dermatology',
    icon: '🧴',
    subServices: [
      'Hair Fall Treatment', 'Hair Thinning Treatment', 'Hormonal Hair Loss Treatment', 'PRP Hair Therapy', 'Dandruff Treatment',
      'Acne Treatment', 'Acne Scar Treatment', 'Dark Circles Treatment', 'Detan Treatment', 'Open Pores Treatment', 'Pigmentation Treatment', 'Skin Brightening Treatment',
      'Chemical Peel', 'Hydrafacial (Medical Grade)', 'Laser Skin Treatment', 'Skin Rejuvenation',
      'Anti-Aging Treatment', 'Wrinkle Reduction',
      'Back Acne Treatment', 'Body Acne Treatment', 'Skin Allergy Treatment', 'Underarm Pigmentation Treatment',
      'General Skin Consultation', 'Hair Specialist Consultation', 'Online Dermatologist Consultation',
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
      'Haircut', 'Fade Haircut', 'Kids Haircut', 'Long Hair Cut',
      'Hair Styling', 'Hair Wash', 'Blow Dry', 'Texture Styling',
      'Hair Colour', 'Highlights', 'Grey Coverage',
      'Hair Spa', 'Anti-Dandruff Treatment', 'Hair Fall Treatment', 'Scalp Detox',
      'Keratin Treatment', 'Hair Smoothening', 'Deep Conditioning',
    ],
    femaleSubServices: [
      'Haircut', 'Layer Cut', 'Step Cut', 'Kids Haircut',
      'Hair Styling', 'Blow Dry', 'Hair Wash', 'Straightening', 'Curling', 'Party Hairstyle', 'Bridal Hairstyle',
      'Hair Colour', 'Highlights', 'Global Hair Colour', 'Grey Coverage',
      'Hair Spa', 'Hair Fall Treatment', 'Dandruff Treatment', 'Deep Conditioning',
      'Keratin Treatment', 'Hair Smoothening', 'Hair Straightening',
    ],
    get subServices() { return [...new Set([...this.maleSubServices, ...this.femaleSubServices])]; },
  },
  {
    key: 'beard_grooming_unisex',
    label: 'Beard & Grooming',
    icon: '🧔',
    maleSubServices: [
      'Beard Trim', 'Beard Shaping', 'Beard Fade',
      'Clean Shave', 'Hot Towel Shave', 'Royal Shave',
    ],
    femaleSubServices: [],
    get subServices() { return this.maleSubServices; },
  },
  {
    key: 'nail_services_unisex',
    label: 'Nail Services',
    icon: '💅',
    maleSubServices: ['Manicure', 'Pedicure'],
    femaleSubServices: [
      'Manicure', 'Pedicure', 'Spa Manicure', 'Spa Pedicure',
      'Nail Art', 'Gel Nails', 'Nail Extensions',
    ],
    get subServices() { return [...new Set([...this.maleSubServices, ...this.femaleSubServices])]; },
  },
  {
    key: 'skin_beauty_unisex',
    label: 'Skin & Face / Beauty',
    icon: '🧖',
    maleSubServices: [
      'Cleanup', 'Facial', 'De-Tan', 'Charcoal Facial',
      'Anti-Acne Treatment', 'Blackhead Removal', 'Skin Brightening',
    ],
    femaleSubServices: [
      'Cleanup', 'Facial', 'De-Tan', 'Bleach', 'Charcoal Facial',
      'Skin Brightening', 'Anti-Acne Treatment', 'Dark Circle Treatment', 'Blackhead Removal',
    ],
    get subServices() { return [...new Set([...this.maleSubServices, ...this.femaleSubServices])]; },
  },
  {
    key: 'spa_massage_unisex',
    label: 'Spa & Massage',
    icon: '💆',
    maleSubServices: [
      'Head Massage', 'Oil Head Massage', 'Head + Neck + Shoulder Massage',
      'Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage',
      'Aroma Therapy Massage', 'Hot Stone Massage',
      'Body Spa', 'Body Polish',
      'Stress Relief Therapy',
    ],
    femaleSubServices: [
      'Head Massage', 'Oil Head Massage', 'Head + Neck + Shoulder Massage',
      'Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage',
      'Aroma Therapy Massage', 'Hot Stone Massage',
      'Body Spa', 'Body Polish',
      'Stress Relief Therapy', 'Sleep Therapy',
      'Pre-Bridal Spa', 'Pregnancy Safe Massage',
    ],
    get subServices() { return [...new Set([...this.maleSubServices, ...this.femaleSubServices])]; },
  },
  {
    key: 'body_grooming_unisex',
    label: 'Body Grooming',
    icon: '🧴',
    maleSubServices: [],
    femaleSubServices: [
      'Eyebrow Threading', 'Upper Lip Threading', 'Full Face Threading',
      'Full Arms Wax', 'Half Arms Wax', 'Full Legs Wax', 'Half Legs Wax', 'Underarms Wax', 'Face Wax',
    ],
    get subServices() { return this.femaleSubServices; },
  },
  {
    key: 'bridal_events_unisex',
    label: 'Bridal & Events',
    icon: '👰',
    maleSubServices: [],
    femaleSubServices: [
      'Bridal Makeup', 'Airbrush Bridal Makeup',
      'Engagement Makeup', 'Party Makeup',
      'On-Location Makeup Service',
      'Bridal Hairstyling', 'Party Hairstyling', 'Hair Extensions Styling',
      'Saree Draping', 'Lehenga Draping', 'Bridal Dressing Assistance',
      'Pre-Bridal Skin Care', 'Pre-Bridal Hair Care', 'Full Pre-Bridal Package',
      'Eyebrow Shaping', 'Manicure & Pedicure (Bridal)', 'Full Body Wax (Bridal Prep)',
    ],
    get subServices() { return this.femaleSubServices; },
  },
  {
    key: 'kids_services_unisex',
    label: 'Kids Services',
    icon: '👶',
    maleSubServices: ['Kids Haircut'],
    femaleSubServices: ['Kids Haircut'],
    get subServices() { return ['Kids Haircut']; },
  },
  {
    key: 'men_dermatology_unisex',
    label: 'Men Dermatology',
    icon: '🧴',
    maleSubServices: [
      'Hair Fall Consultation', 'Hair Regrowth Therapy', 'Male Pattern Baldness Treatment', 'PRP Hair Therapy', 'Dandruff Treatment',
      'Acne Treatment', 'Acne Scar Treatment', 'Detan Treatment', 'Open Pores Treatment', 'Skin Brightening Treatment',
      'Chemical Peel', 'Laser Treatment',
      'Back Acne Treatment', 'Body Acne Treatment', 'Skin Allergy Treatment',
      'Beard Growth Therapy', 'Ingrown Hair Treatment', 'Razor Bumps Treatment',
      'General Skin Consultation', 'Hair Specialist Consultation', 'Online Dermatologist Consultation',
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
      'Hair Fall Treatment', 'Hair Thinning Treatment', 'Hormonal Hair Loss Treatment', 'PRP Hair Therapy', 'Dandruff Treatment',
      'Acne Treatment', 'Acne Scar Treatment', 'Dark Circles Treatment', 'Detan Treatment', 'Open Pores Treatment', 'Pigmentation Treatment', 'Skin Brightening Treatment',
      'Chemical Peel', 'Hydrafacial (Medical Grade)', 'Laser Skin Treatment', 'Skin Rejuvenation',
      'Anti-Aging Treatment', 'Wrinkle Reduction',
      'Back Acne Treatment', 'Body Acne Treatment', 'Skin Allergy Treatment', 'Underarm Pigmentation Treatment',
      'General Skin Consultation', 'Hair Specialist Consultation', 'Online Dermatologist Consultation',
    ],
    get subServices() { return this.femaleSubServices; },
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
  // ─── Barbershop categories ─────────────────────────────────────────────────
  'Hair Services':              'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=300&fit=crop&q=85',
  'Beard & Shaving':            'https://images.unsplash.com/photo-1599351431613-18ef1fdd27e5?w=600&h=300&fit=crop&q=85',
  'Hair Colour & Chemical':     'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&h=300&fit=crop&q=85',
  'Skincare & Face':            'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=300&fit=crop&q=85',
  'Scalp & Hair Health':        'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&h=300&fit=crop&q=85',
  'Wellness & Relaxation':      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=300&fit=crop&q=85',
  'Hand & Foot Grooming':       'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=300&fit=crop&q=85',

  // ─── Salon categories ──────────────────────────────────────────────────────
  'Hair Services (Men)':        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=300&fit=crop&q=85',
  'Hair Services (Women)':      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=300&fit=crop&q=85',
  'Beard & Grooming (Men)':     'https://images.unsplash.com/photo-1599351431613-18ef1fdd27e5?w=600&h=300&fit=crop&q=85',
  'Skin & Face (Women)':        'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=300&fit=crop&q=85',
  'Skincare & Face (Men)':      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=300&fit=crop&q=85',
  'Threading':                  'https://images.unsplash.com/photo-1626954079673-f3c3b7dc0bce?w=600&h=300&fit=crop&q=85',
  'Waxing':                     'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=300&fit=crop&q=85',
  'Body Care':                  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&h=300&fit=crop&q=85',
  'Nail Services':              'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=300&fit=crop&q=85',
  'Grooming & Body Care (Men)': 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=300&fit=crop&q=85',

  // ─── Bridal & Makeup ───────────────────────────────────────────────────────
  'Makeup Services':            'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&h=300&fit=crop&q=85',
  'Hairstyling':                'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=300&fit=crop&q=85',
  'Draping & Dressing':         'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&h=300&fit=crop&q=85',
  'Pre-Bridal':                 'https://images.unsplash.com/photo-1526413232644-8a40f03cc03b?w=600&h=300&fit=crop&q=85',
  'Grooming Add-ons':           'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=300&fit=crop&q=85',
  'Premium Add-ons':            'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&h=300&fit=crop&q=85',

  // ─── Spa & Wellness ────────────────────────────────────────────────────────
  'Basic Massage':              'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=300&fit=crop&q=85',
  'Full Body Massage':          'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=300&fit=crop&q=85',
  'Premium Therapies':          'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?w=600&h=300&fit=crop&q=85',
  'Body Spa':                   'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&h=300&fit=crop&q=85',
  'Wellness Therapy':           'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&h=300&fit=crop&q=85',
  'Special Care':               'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=600&h=300&fit=crop&q=85',

  // ─── Skin & Derma ──────────────────────────────────────────────────────────
  'Hair & Scalp':               'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&h=300&fit=crop&q=85',
  'Skin (Face)':                'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=300&fit=crop&q=85',
  'Advanced Treatments':        'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&h=300&fit=crop&q=85',
  'Anti-Aging':                 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&h=300&fit=crop&q=85',
  'Body Skin':                  'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=300&fit=crop&q=85',
  'Beard & Face Issues':        'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=600&h=300&fit=crop&q=85',
  'Consultation':               'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=300&fit=crop&q=85',

  // ─── Legacy / alternate names ──────────────────────────────────────────────
  'Bridal & Events':            'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=300&fit=crop&q=85',
  'Beard & Grooming':           'https://images.unsplash.com/photo-1599351431613-18ef1fdd27e5?w=600&h=300&fit=crop&q=85',
  'Spa & Massage':              'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=300&fit=crop&q=85',
  'Spa & Relaxation':           'https://images.unsplash.com/photo-1498842812179-c81beecf902c?w=600&h=300&fit=crop&q=85',
  'Skin & Face':                'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=300&fit=crop&q=85',
  'Skin & Face / Beauty':       'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=300&fit=crop&q=85',
  'Skin & Face (Men Grooming)': 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=300&fit=crop&q=85',
  'Skin & Beauty':              'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&h=300&fit=crop&q=85',
  'Face & Skin':                'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=300&fit=crop&q=85',
  'Body Grooming':              'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=300&fit=crop&q=85',
  'Grooming & Hair Removal':    'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=300&fit=crop&q=85',
  'Grooming & Body Care':       'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=300&fit=crop&q=85',
  'Men Dermatology':            'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&h=300&fit=crop&q=85',
  'Women Dermatology':          'https://images.unsplash.com/photo-1614859324967-bdf413c35a2c?w=600&h=300&fit=crop&q=85',
  'Kids Services':              'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&h=300&fit=crop&q=85',
  'At-Home Services':           'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=300&fit=crop&q=85',
  'Packages & Combos':          'https://images.unsplash.com/photo-1535016120720-40c646be5580?w=600&h=300&fit=crop&q=85',
  'Memberships':                'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&h=300&fit=crop&q=85',
  'Premium / Modern Services':  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&h=300&fit=crop&q=85',
  'Hair Colour & Highlights':   'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&h=300&fit=crop&q=85',
};

// Static fallback images for subcategories (used when admin hasn't uploaded a photo)
export const SUBCATEGORY_IMAGE_MAP = {
  // ─── Hair subcategories ────────────────────────────────────────────────────
  'Basic Haircuts':           'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=400&fit=crop&q=80',
  'Precision Cuts':           'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=400&h=400&fit=crop&q=80',
  'Advanced / Trend Cuts':    'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=400&fit=crop&q=80',
  'Advanced Cuts':            'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=400&fit=crop&q=80',
  'Long Hair Services':       'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop&q=80',
  'Hair Art & Detailing':     'https://images.unsplash.com/photo-1599351431613-18ef1fdd27e5?w=400&h=400&fit=crop&q=80',
  'Hair Styling':             'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=400&h=400&fit=crop&q=80',
  'Haircuts':                 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop&q=80',
  'Hair Color':               'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&h=400&fit=crop&q=80',
  'Hair Treatments':          'https://images.unsplash.com/photo-1526413232644-8a40f03cc03b?w=400&h=400&fit=crop&q=80',
  'Hair Care':                'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=400&fit=crop&q=80',

  // ─── Beard subcategories ───────────────────────────────────────────────────
  'Shaving':                  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=400&fit=crop&q=80',
  'Beard Grooming':           'https://images.unsplash.com/photo-1599351431613-18ef1fdd27e5?w=400&h=400&fit=crop&q=80',
  'Mustache Services':        'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=400&fit=crop&q=80',
  'Mustache':                 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=400&fit=crop&q=80',
  'Beard Treatments':         'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&q=80',

  // ─── Hair colour subcategories ─────────────────────────────────────────────
  'Natural Colour':           'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&h=400&fit=crop&q=80',
  'Fashion Colour':           'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&h=400&fit=crop&q=80',
  'Creative Colour':          'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&h=400&fit=crop&q=80',
  'Chemical Treatments':      'https://images.unsplash.com/photo-1526413232644-8a40f03cc03b?w=400&h=400&fit=crop&q=80',

  // ─── Skin & Face subcategories ─────────────────────────────────────────────
  'Facial Services':          'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop&q=80',
  'Skin Treatments':          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&q=80',
  'Grooming Details':         'https://images.unsplash.com/photo-1626954079673-f3c3b7dc0bce?w=400&h=400&fit=crop&q=80',
  'Advanced Aesthetic':       'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&q=80',
  'Basic Care':               'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop&q=80',
  'Premium Facials':          'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&q=80',
  'Advanced Skin Care':       'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&q=80',

  // ─── Threading & Waxing ────────────────────────────────────────────────────
  'Threading':                'https://images.unsplash.com/photo-1626954079673-f3c3b7dc0bce?w=400&h=400&fit=crop&q=80',
  'Body Waxing':              'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&h=400&fit=crop&q=80',

  // ─── Body Care ─────────────────────────────────────────────────────────────
  'Body Care':                'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=400&fit=crop&q=80',

  // ─── Nail subcategories ────────────────────────────────────────────────────
  'Basic Nail Care':          'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&q=80',
  'Nail Art':                 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&q=80',
  'Gel & Acrylic':            'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&q=80',
  'Nail Repair & Removal':    'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&q=80',

  // ─── Scalp subcategories ───────────────────────────────────────────────────
  'Scalp Treatments':         'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=400&fit=crop&q=80',
  'Oil & Therapy':            'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop&q=80',

  // ─── Wellness subcategories ────────────────────────────────────────────────
  'Massage Services':         'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop&q=80',
  'Relaxation Services':      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=400&fit=crop&q=80',
  'Massage':                  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop&q=80',
  'Relaxation':               'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=400&fit=crop&q=80',

  // ─── Hand & Foot ───────────────────────────────────────────────────────────
  'Hand Care':                'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&q=80',
  'Foot Care':                'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&q=80',
  'Hand & Foot':              'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&q=80',

  // ─── Bridal subcategories ──────────────────────────────────────────────────
  'Bridal Makeup':            'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=400&fit=crop&q=80',
  'Event Makeup':             'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=400&h=400&fit=crop&q=80',
  'Special Services':         'https://images.unsplash.com/photo-1519741497674-611481863552?w=400&h=400&fit=crop&q=80',
  'Bridal & Events':          'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop&q=80',
  'Styling':                  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop&q=80',
  'Draping':                  'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=400&fit=crop&q=80',
  'Assistance':               'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=400&fit=crop&q=80',
  'Skin & Hair Care':         'https://images.unsplash.com/photo-1526413232644-8a40f03cc03b?w=400&h=400&fit=crop&q=80',
  'Packages & Consultation':  'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&h=400&fit=crop&q=80',
  'Grooming':                 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&q=80',
  'Premium':                  'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&h=400&fit=crop&q=80',

  // ─── Spa subcategories ─────────────────────────────────────────────────────
  'Men':                      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop&q=80',
  'Female':                   'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&q=80',

  // ─── Skin Derma subcategories ──────────────────────────────────────────────
  'Beard & Face Issues':      'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&fit=crop&q=80',
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
    comingSoon:  true,
  },
  {
    key:         'makeup_bridal',
    label:       'Makeup & Bridal',
    icon:        '💄',
    description: 'Bridal, party makeup & beauty services',
    autoGender:  'female',
    color:       '#ec4899',
    comingSoon:  true,
  },
  {
    key:         'skin_derma',
    label:       'Skin & Derma Clinic',
    icon:        '🏥',
    description: 'Advanced skin treatments & dermatology',
    autoGender:  'unisex',
    color:       '#f59e0b',
    comingSoon:  true,
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
      { label: 'Haircuts', services: ['Haircut', 'Fade Haircut', 'Kids Haircut'] },
      { label: 'Styling', services: ['Hair Styling', 'Hair Wash'] },
    ],
    subServices: ['Haircut', 'Fade Haircut', 'Kids Haircut', 'Hair Styling', 'Hair Wash'],
  },
  {
    key: 'beard_shaving',
    label: 'Beard & Shaving',
    icon: '🧔',
    tabIcon: 'beard',
    sections: [
      { label: 'Beard Grooming', services: ['Beard Trim', 'Beard Shaping', 'Beard Fade'] },
      { label: 'Shaving', services: ['Clean Shave', 'Hot Towel Shave'] },
    ],
    subServices: ['Beard Trim', 'Beard Shaping', 'Beard Fade', 'Clean Shave', 'Hot Towel Shave'],
  },
  {
    key: 'hair_treatment',
    label: 'Hair Treatment',
    icon: '💆',
    tabIcon: 'treatment',
    sections: [
      { label: 'Hair Care', services: ['Hair Spa', 'Anti-Dandruff Treatment', 'Hair Fall Treatment'] },
      { label: 'Premium Treatment', services: ['Keratin Treatment'] },
    ],
    subServices: ['Hair Spa', 'Anti-Dandruff Treatment', 'Hair Fall Treatment', 'Keratin Treatment'],
  },
  {
    key: 'hair_colour',
    label: 'Hair Colour',
    icon: '🎨',
    tabIcon: 'color',
    sections: [
      { label: 'Colour Services', services: ['Hair Colour', 'Highlights', 'Grey Coverage'] },
    ],
    subServices: ['Hair Colour', 'Highlights', 'Grey Coverage'],
  },
  {
    key: 'face_skin',
    label: 'Face & Skin',
    icon: '🧴',
    tabIcon: 'face',
    sections: [
      { label: 'Face Care', services: ['Cleanup', 'Facial', 'De-Tan'] },
      { label: 'Skin Care', services: ['Charcoal Facial', 'Anti-Acne Treatment'] },
    ],
    subServices: ['Cleanup', 'Facial', 'De-Tan', 'Charcoal Facial', 'Anti-Acne Treatment'],
  },
  {
    key: 'relaxation',
    label: 'Relaxation',
    icon: '🧘',
    tabIcon: 'wellness',
    sections: [
      { label: 'Massage', services: ['Head Massage', 'Head + Neck + Shoulder Massage'] },
    ],
    subServices: ['Head Massage', 'Head + Neck + Shoulder Massage'],
  },
];

export const MAKEUP_BRIDAL_CATEGORIES = [
  {
    key: 'mb_makeup',
    label: 'Makeup Services',
    icon: '💄',
    tabIcon: 'makeup',
    sections: [
      { label: 'Bridal Makeup', services: ['Bridal Makeup', 'Airbrush Bridal Makeup'] },
      { label: 'Event Makeup', services: ['Engagement Makeup', 'Party Makeup'] },
      { label: 'Special Services', services: ['On-Location Makeup Service'] },
    ],
    subServices: ['Bridal Makeup', 'Airbrush Bridal Makeup', 'Engagement Makeup', 'Party Makeup', 'On-Location Makeup Service'],
  },
  {
    key: 'mb_hairstyling',
    label: 'Hairstyling',
    icon: '💇‍♀️',
    tabIcon: 'scissors',
    sections: [
      { label: 'Bridal & Party Styling', services: ['Bridal Hairstyling', 'Party Hairstyling', 'Hair Extensions Styling'] },
    ],
    subServices: ['Bridal Hairstyling', 'Party Hairstyling', 'Hair Extensions Styling'],
  },
  {
    key: 'mb_draping',
    label: 'Draping & Dressing',
    icon: '👘',
    tabIcon: 'draping',
    sections: [
      { label: 'Dressing Services', services: ['Saree Draping', 'Lehenga Draping', 'Bridal Dressing Assistance'] },
    ],
    subServices: ['Saree Draping', 'Lehenga Draping', 'Bridal Dressing Assistance'],
  },
  {
    key: 'mb_prebridal',
    label: 'Pre-Bridal',
    icon: '✨',
    tabIcon: 'prebridal',
    sections: [
      { label: 'Pre-Bridal Care', services: ['Pre-Bridal Skin Care', 'Pre-Bridal Hair Care', 'Full Pre-Bridal Package'] },
    ],
    subServices: ['Pre-Bridal Skin Care', 'Pre-Bridal Hair Care', 'Full Pre-Bridal Package'],
  },
  {
    key: 'mb_grooming',
    label: 'Grooming Add-ons',
    icon: '💆‍♀️',
    tabIcon: 'grooming',
    sections: [
      { label: 'Bridal Grooming', services: ['Eyebrow Shaping', 'Manicure & Pedicure (Bridal)', 'Full Body Wax (Bridal Prep)'] },
    ],
    subServices: ['Eyebrow Shaping', 'Manicure & Pedicure (Bridal)', 'Full Body Wax (Bridal Prep)'],
  },
];

export const SPA_WELLNESS_MALE_CATEGORIES = [
  {
    key: 'spa_basic_massage_men',
    label: 'Basic Massage',
    icon: '💆',
    tabIcon: 'massage',
    sections: [
      { label: 'Men', services: ['Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage'] },
    ],
    subServices: ['Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage'],
  },
  {
    key: 'spa_full_body_massage_men',
    label: 'Full Body Massage',
    icon: '🛌',
    tabIcon: 'massage',
    sections: [
      { label: 'Men', services: ['Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage'] },
    ],
    subServices: ['Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage'],
  },
  {
    key: 'spa_premium_therapies_men',
    label: 'Premium Therapies',
    icon: '✨',
    tabIcon: 'therapy',
    sections: [
      { label: 'Men', services: ['Aroma Therapy Massage', 'Hot Stone Massage'] },
    ],
    subServices: ['Aroma Therapy Massage', 'Hot Stone Massage'],
  },
  {
    key: 'spa_body_spa_men',
    label: 'Body Spa',
    icon: '🛁',
    tabIcon: 'spa',
    sections: [
      { label: 'Men', services: ['Body Spa', 'Body Polish'] },
    ],
    subServices: ['Body Spa', 'Body Polish'],
  },
  {
    key: 'spa_wellness_therapy_men',
    label: 'Wellness Therapy',
    icon: '🧘',
    tabIcon: 'wellness',
    sections: [
      { label: 'Men', services: ['Stress Relief Therapy'] },
    ],
    subServices: ['Stress Relief Therapy'],
  },
];

export const SPA_WELLNESS_FEMALE_CATEGORIES = [
  {
    key: 'spa_basic_massage_women',
    label: 'Basic Massage',
    icon: '💆',
    tabIcon: 'massage',
    sections: [
      { label: 'Female', services: ['Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage'] },
    ],
    subServices: ['Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage'],
  },
  {
    key: 'spa_full_body_massage_women',
    label: 'Full Body Massage',
    icon: '🛌',
    tabIcon: 'massage',
    sections: [
      { label: 'Female', services: ['Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage'] },
    ],
    subServices: ['Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage'],
  },
  {
    key: 'spa_premium_therapies_women',
    label: 'Premium Therapies',
    icon: '✨',
    tabIcon: 'therapy',
    sections: [
      { label: 'Female', services: ['Aroma Therapy Massage', 'Hot Stone Massage'] },
    ],
    subServices: ['Aroma Therapy Massage', 'Hot Stone Massage'],
  },
  {
    key: 'spa_body_spa_women',
    label: 'Body Spa',
    icon: '🛁',
    tabIcon: 'spa',
    sections: [
      { label: 'Female', services: ['Body Spa', 'Body Polish'] },
    ],
    subServices: ['Body Spa', 'Body Polish'],
  },
  {
    key: 'spa_wellness_therapy_women',
    label: 'Wellness Therapy',
    icon: '🧘',
    tabIcon: 'wellness',
    sections: [
      { label: 'Female', services: ['Stress Relief Therapy', 'Sleep Therapy'] },
    ],
    subServices: ['Stress Relief Therapy', 'Sleep Therapy'],
  },
  {
    key: 'spa_special_care_women',
    label: 'Special Care',
    icon: '🌸',
    tabIcon: 'care',
    sections: [
      { label: 'Female', services: ['Pre-Bridal Spa', 'Pregnancy Safe Massage'] },
    ],
    subServices: ['Pre-Bridal Spa', 'Pregnancy Safe Massage'],
  },
];

export const SPA_WELLNESS_UNISEX_CATEGORIES = [
  {
    key: 'spa_basic_massage_unisex',
    label: 'Basic Massage',
    icon: '💆',
    tabIcon: 'massage',
    sections: [
      { label: 'Men', services: ['Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage'] },
      { label: 'Female', services: ['Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage'] },
    ],
    subServices: ['Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage'],
  },
  {
    key: 'spa_full_body_massage_unisex',
    label: 'Full Body Massage',
    icon: '🛌',
    tabIcon: 'massage',
    sections: [
      { label: 'Men', services: ['Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage'] },
      { label: 'Female', services: ['Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage'] },
    ],
    subServices: ['Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage'],
  },
  {
    key: 'spa_premium_therapies_unisex',
    label: 'Premium Therapies',
    icon: '✨',
    tabIcon: 'therapy',
    sections: [
      { label: 'Men', services: ['Aroma Therapy Massage', 'Hot Stone Massage'] },
      { label: 'Female', services: ['Aroma Therapy Massage', 'Hot Stone Massage'] },
    ],
    subServices: ['Aroma Therapy Massage', 'Hot Stone Massage'],
  },
  {
    key: 'spa_body_spa_unisex',
    label: 'Body Spa',
    icon: '🛁',
    tabIcon: 'spa',
    sections: [
      { label: 'Men', services: ['Body Spa', 'Body Polish'] },
      { label: 'Female', services: ['Body Spa', 'Body Polish'] },
    ],
    subServices: ['Body Spa', 'Body Polish'],
  },
  {
    key: 'spa_wellness_therapy_unisex',
    label: 'Wellness Therapy',
    icon: '🧘',
    tabIcon: 'wellness',
    sections: [
      { label: 'Men', services: ['Stress Relief Therapy'] },
      {
        label: 'Female',
        services: ['Stress Relief Therapy', 'Sleep Therapy'],
      },
    ],
    subServices: ['Stress Relief Therapy', 'Sleep Therapy'],
  },
  {
    key: 'spa_special_care_unisex',
    label: 'Special Care',
    icon: '🌸',
    tabIcon: 'care',
    sections: [
      { label: 'Female', services: ['Pre-Bridal Spa', 'Pregnancy Safe Massage'] },
    ],
    subServices: ['Pre-Bridal Spa', 'Pregnancy Safe Massage'],
  },
];

export const SKIN_DERMA_MALE_CATEGORIES = [
  {
    key: 'derma_hair_scalp_men',
    label: 'Hair & Scalp',
    icon: '🧬',
    tabIcon: 'hair',
    sections: [
      { label: 'Hair Loss Treatments', services: ['Hair Fall Consultation', 'Hair Regrowth Therapy', 'Male Pattern Baldness Treatment', 'PRP Hair Therapy', 'Dandruff Treatment'] },
    ],
    subServices: ['Hair Fall Consultation', 'Hair Regrowth Therapy', 'Male Pattern Baldness Treatment', 'PRP Hair Therapy', 'Dandruff Treatment'],
  },
  {
    key: 'derma_skin_face_men',
    label: 'Skin (Face)',
    icon: '🧴',
    tabIcon: 'face',
    sections: [
      { label: 'Skin Treatments', services: ['Acne Treatment', 'Acne Scar Treatment', 'Detan Treatment', 'Open Pores Treatment', 'Skin Brightening Treatment'] },
    ],
    subServices: ['Acne Treatment', 'Acne Scar Treatment', 'Detan Treatment', 'Open Pores Treatment', 'Skin Brightening Treatment'],
  },
  {
    key: 'derma_advanced_men',
    label: 'Advanced Treatments',
    icon: '✨',
    tabIcon: 'advanced',
    sections: [
      { label: 'Clinical Procedures', services: ['Chemical Peel', 'Laser Treatment'] },
    ],
    subServices: ['Chemical Peel', 'Laser Treatment'],
  },
  {
    key: 'derma_body_skin_men',
    label: 'Body Skin',
    icon: '🧍',
    tabIcon: 'body',
    sections: [
      { label: 'Body Treatments', services: ['Back Acne Treatment', 'Body Acne Treatment', 'Skin Allergy Treatment'] },
    ],
    subServices: ['Back Acne Treatment', 'Body Acne Treatment', 'Skin Allergy Treatment'],
  },
  {
    key: 'derma_beard_face_men',
    label: 'Beard & Face Issues',
    icon: '🧔',
    tabIcon: 'beard',
    sections: [
      { label: 'Beard & Ingrown Hair', services: ['Beard Growth Therapy', 'Ingrown Hair Treatment', 'Razor Bumps Treatment'] },
    ],
    subServices: ['Beard Growth Therapy', 'Ingrown Hair Treatment', 'Razor Bumps Treatment'],
  },
  {
    key: 'derma_consultation_men',
    label: 'Consultation',
    icon: '🩺',
    tabIcon: 'consult',
    sections: [
      { label: 'Consultation Services', services: ['General Skin Consultation', 'Hair Specialist Consultation', 'Online Dermatologist Consultation'] },
    ],
    subServices: ['General Skin Consultation', 'Hair Specialist Consultation', 'Online Dermatologist Consultation'],
  },
];

export const SKIN_DERMA_FEMALE_CATEGORIES = [
  {
    key: 'derma_hair_scalp_women',
    label: 'Hair & Scalp',
    icon: '🧬',
    tabIcon: 'hair',
    sections: [
      { label: 'Hair Loss Treatments', services: ['Hair Fall Treatment', 'Hair Thinning Treatment', 'Hormonal Hair Loss Treatment', 'PRP Hair Therapy', 'Dandruff Treatment'] },
    ],
    subServices: ['Hair Fall Treatment', 'Hair Thinning Treatment', 'Hormonal Hair Loss Treatment', 'PRP Hair Therapy', 'Dandruff Treatment'],
  },
  {
    key: 'derma_skin_face_women',
    label: 'Skin (Face)',
    icon: '🧴',
    tabIcon: 'face',
    sections: [
      { label: 'Skin Treatments', services: ['Acne Treatment', 'Acne Scar Treatment', 'Dark Circles Treatment', 'Detan Treatment', 'Open Pores Treatment', 'Pigmentation Treatment', 'Skin Brightening Treatment'] },
    ],
    subServices: ['Acne Treatment', 'Acne Scar Treatment', 'Dark Circles Treatment', 'Detan Treatment', 'Open Pores Treatment', 'Pigmentation Treatment', 'Skin Brightening Treatment'],
  },
  {
    key: 'derma_advanced_women',
    label: 'Advanced Treatments',
    icon: '✨',
    tabIcon: 'advanced',
    sections: [
      { label: 'Clinical Procedures', services: ['Chemical Peel', 'Hydrafacial (Medical Grade)', 'Laser Skin Treatment', 'Skin Rejuvenation'] },
    ],
    subServices: ['Chemical Peel', 'Hydrafacial (Medical Grade)', 'Laser Skin Treatment', 'Skin Rejuvenation'],
  },
  {
    key: 'derma_anti_aging_women',
    label: 'Anti-Aging',
    icon: '🕰️',
    tabIcon: 'antiaging',
    sections: [
      { label: 'Anti-Aging Treatments', services: ['Anti-Aging Treatment', 'Wrinkle Reduction'] },
    ],
    subServices: ['Anti-Aging Treatment', 'Wrinkle Reduction'],
  },
  {
    key: 'derma_body_skin_women',
    label: 'Body Skin',
    icon: '🧍',
    tabIcon: 'body',
    sections: [
      { label: 'Body Treatments', services: ['Back Acne Treatment', 'Body Acne Treatment', 'Skin Allergy Treatment', 'Underarm Pigmentation Treatment'] },
    ],
    subServices: ['Back Acne Treatment', 'Body Acne Treatment', 'Skin Allergy Treatment', 'Underarm Pigmentation Treatment'],
  },
  {
    key: 'derma_consultation_women',
    label: 'Consultation',
    icon: '🩺',
    tabIcon: 'consult',
    sections: [
      { label: 'Consultation Services', services: ['General Skin Consultation', 'Hair Specialist Consultation', 'Online Dermatologist Consultation'] },
    ],
    subServices: ['General Skin Consultation', 'Hair Specialist Consultation', 'Online Dermatologist Consultation'],
  },
];

export const SKIN_DERMA_UNISEX_CATEGORIES = [
  {
    key: 'derma_hair_scalp_unisex',
    label: 'Hair & Scalp',
    icon: '🧬',
    tabIcon: 'hair',
    sections: [
      { label: 'Men', services: ['Hair Fall Consultation', 'Hair Regrowth Therapy', 'Male Pattern Baldness Treatment', 'PRP Hair Therapy', 'Dandruff Treatment'] },
      { label: 'Female', services: ['Hair Fall Treatment', 'Hair Thinning Treatment', 'Hormonal Hair Loss Treatment', 'PRP Hair Therapy', 'Dandruff Treatment'] },
    ],
    subServices: ['Hair Fall Consultation', 'Hair Regrowth Therapy', 'Male Pattern Baldness Treatment', 'PRP Hair Therapy', 'Dandruff Treatment', 'Hair Fall Treatment', 'Hair Thinning Treatment', 'Hormonal Hair Loss Treatment'],
  },
  {
    key: 'derma_skin_face_unisex',
    label: 'Skin (Face)',
    icon: '🧴',
    tabIcon: 'face',
    sections: [
      { label: 'Men', services: ['Acne Treatment', 'Acne Scar Treatment', 'Detan Treatment', 'Open Pores Treatment', 'Skin Brightening Treatment'] },
      { label: 'Female', services: ['Acne Treatment', 'Acne Scar Treatment', 'Dark Circles Treatment', 'Detan Treatment', 'Open Pores Treatment', 'Pigmentation Treatment', 'Skin Brightening Treatment'] },
    ],
    subServices: ['Acne Treatment', 'Acne Scar Treatment', 'Detan Treatment', 'Open Pores Treatment', 'Skin Brightening Treatment', 'Dark Circles Treatment', 'Pigmentation Treatment'],
  },
  {
    key: 'derma_advanced_unisex',
    label: 'Advanced Treatments',
    icon: '✨',
    tabIcon: 'advanced',
    sections: [
      { label: 'Men', services: ['Chemical Peel', 'Laser Treatment'] },
      { label: 'Female', services: ['Chemical Peel', 'Hydrafacial (Medical Grade)', 'Laser Skin Treatment', 'Skin Rejuvenation'] },
    ],
    subServices: ['Chemical Peel', 'Laser Treatment', 'Hydrafacial (Medical Grade)', 'Laser Skin Treatment', 'Skin Rejuvenation'],
  },
  {
    key: 'derma_anti_aging_unisex',
    label: 'Anti-Aging',
    icon: '🕰️',
    tabIcon: 'antiaging',
    sections: [
      { label: 'Female', services: ['Anti-Aging Treatment', 'Wrinkle Reduction'] },
    ],
    subServices: ['Anti-Aging Treatment', 'Wrinkle Reduction'],
  },
  {
    key: 'derma_body_skin_unisex',
    label: 'Body Skin',
    icon: '🧍',
    tabIcon: 'body',
    sections: [
      { label: 'Men', services: ['Back Acne Treatment', 'Body Acne Treatment', 'Skin Allergy Treatment'] },
      { label: 'Female', services: ['Back Acne Treatment', 'Body Acne Treatment', 'Skin Allergy Treatment', 'Underarm Pigmentation Treatment'] },
    ],
    subServices: ['Back Acne Treatment', 'Body Acne Treatment', 'Skin Allergy Treatment', 'Underarm Pigmentation Treatment'],
  },
  {
    key: 'derma_beard_face_unisex',
    label: 'Beard & Face Issues',
    icon: '🧔',
    tabIcon: 'beard',
    sections: [
      { label: 'Men', services: ['Beard Growth Therapy', 'Ingrown Hair Treatment', 'Razor Bumps Treatment'] },
    ],
    subServices: ['Beard Growth Therapy', 'Ingrown Hair Treatment', 'Razor Bumps Treatment'],
  },
  {
    key: 'derma_consultation_unisex',
    label: 'Consultation',
    icon: '🩺',
    tabIcon: 'consult',
    sections: [
      { label: 'General', services: ['General Skin Consultation', 'Hair Specialist Consultation', 'Online Dermatologist Consultation'] },
    ],
    subServices: ['General Skin Consultation', 'Hair Specialist Consultation', 'Online Dermatologist Consultation'],
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
      { label: 'Haircuts', services: ['Haircut', 'Fade Haircut', 'Kids Haircut', 'Long Hair Cut'] },
      { label: 'Styling', services: ['Hair Styling', 'Hair Wash', 'Blow Dry', 'Texture Styling'] },
    ],
    subServices: ['Haircut', 'Fade Haircut', 'Kids Haircut', 'Long Hair Cut', 'Hair Styling', 'Hair Wash', 'Blow Dry', 'Texture Styling'],
  },
  {
    key: 'salon_m_beard',
    label: 'Beard & Grooming',
    icon: '🧔',
    tabIcon: 'beard',
    sections: [
      { label: 'Beard Grooming', services: ['Beard Trim', 'Beard Shaping', 'Beard Fade'] },
      { label: 'Shaving', services: ['Clean Shave', 'Hot Towel Shave', 'Royal Shave'] },
    ],
    subServices: ['Beard Trim', 'Beard Shaping', 'Beard Fade', 'Clean Shave', 'Hot Towel Shave', 'Royal Shave'],
  },
  {
    key: 'salon_m_treatment',
    label: 'Hair Treatment',
    icon: '💆',
    tabIcon: 'treatment',
    sections: [
      { label: 'Hair Care', services: ['Hair Spa', 'Anti-Dandruff Treatment', 'Hair Fall Treatment', 'Scalp Detox'] },
      { label: 'Premium Treatments', services: ['Keratin Treatment', 'Hair Smoothening', 'Deep Conditioning'] },
    ],
    subServices: ['Hair Spa', 'Anti-Dandruff Treatment', 'Hair Fall Treatment', 'Scalp Detox', 'Keratin Treatment', 'Hair Smoothening', 'Deep Conditioning'],
  },
  {
    key: 'salon_m_colour',
    label: 'Hair Colour',
    icon: '🎨',
    tabIcon: 'color',
    sections: [
      { label: 'Colour Services', services: ['Hair Colour', 'Highlights', 'Grey Coverage'] },
    ],
    subServices: ['Hair Colour', 'Highlights', 'Grey Coverage'],
  },
  {
    key: 'salon_m_skin',
    label: 'Face & Skin',
    icon: '🧴',
    tabIcon: 'face',
    sections: [
      { label: 'Face Care', services: ['Cleanup', 'Facial', 'De-Tan', 'Charcoal Facial'] },
      { label: 'Skin Care', services: ['Anti-Acne Treatment', 'Blackhead Removal', 'Skin Brightening'] },
    ],
    subServices: ['Cleanup', 'Facial', 'De-Tan', 'Charcoal Facial', 'Anti-Acne Treatment', 'Blackhead Removal', 'Skin Brightening'],
  },
  {
    key: 'salon_m_relaxation',
    label: 'Relaxation',
    icon: '🧘',
    tabIcon: 'wellness',
    sections: [
      { label: 'Massage', services: ['Head Massage', 'Oil Head Massage', 'Head + Neck + Shoulder Massage'] },
    ],
    subServices: ['Head Massage', 'Oil Head Massage', 'Head + Neck + Shoulder Massage'],
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
      { label: 'Haircuts', services: ['Haircut', 'Layer Cut', 'Step Cut', 'Kids Haircut'] },
      { label: 'Styling', services: ['Hair Styling', 'Blow Dry', 'Hair Wash', 'Straightening', 'Curling', 'Party Hairstyle', 'Bridal Hairstyle'] },
    ],
    subServices: ['Haircut', 'Layer Cut', 'Step Cut', 'Kids Haircut', 'Hair Styling', 'Blow Dry', 'Hair Wash', 'Straightening', 'Curling', 'Party Hairstyle', 'Bridal Hairstyle'],
  },
  {
    key: 'salon_f_colour',
    label: 'Hair Colour',
    icon: '🎨',
    tabIcon: 'color',
    sections: [
      { label: 'Colour Services', services: ['Hair Colour', 'Highlights', 'Global Hair Colour', 'Grey Coverage'] },
    ],
    subServices: ['Hair Colour', 'Highlights', 'Global Hair Colour', 'Grey Coverage'],
  },
  {
    key: 'salon_f_treatment',
    label: 'Hair Treatment',
    icon: '💆',
    tabIcon: 'treatment',
    sections: [
      { label: 'Hair Care', services: ['Hair Spa', 'Hair Fall Treatment', 'Dandruff Treatment', 'Deep Conditioning'] },
      { label: 'Premium Treatments', services: ['Keratin Treatment', 'Hair Smoothening', 'Hair Straightening'] },
    ],
    subServices: ['Hair Spa', 'Hair Fall Treatment', 'Dandruff Treatment', 'Deep Conditioning', 'Keratin Treatment', 'Hair Smoothening', 'Hair Straightening'],
  },
  {
    key: 'salon_f_skin',
    label: 'Skin & Face',
    icon: '🧴',
    tabIcon: 'face',
    sections: [
      { label: 'Face Care', services: ['Cleanup', 'Facial', 'De-Tan', 'Bleach', 'Charcoal Facial'] },
      { label: 'Skin Care', services: ['Skin Brightening', 'Anti-Acne Treatment', 'Dark Circle Treatment', 'Blackhead Removal'] },
    ],
    subServices: ['Cleanup', 'Facial', 'De-Tan', 'Bleach', 'Charcoal Facial', 'Skin Brightening', 'Anti-Acne Treatment', 'Dark Circle Treatment', 'Blackhead Removal'],
  },
  {
    key: 'salon_f_threading',
    label: 'Threading',
    icon: '🧵',
    tabIcon: 'threading',
    sections: [
      { label: 'Facial Threading', services: ['Eyebrow Threading', 'Upper Lip Threading', 'Full Face Threading'] },
    ],
    subServices: ['Eyebrow Threading', 'Upper Lip Threading', 'Full Face Threading'],
  },
  {
    key: 'salon_f_waxing',
    label: 'Waxing',
    icon: '🪒',
    tabIcon: 'waxing',
    sections: [
      { label: 'Body Waxing', services: ['Full Arms Wax', 'Half Arms Wax', 'Full Legs Wax', 'Half Legs Wax', 'Underarms Wax', 'Face Wax'] },
    ],
    subServices: ['Full Arms Wax', 'Half Arms Wax', 'Full Legs Wax', 'Half Legs Wax', 'Underarms Wax', 'Face Wax'],
  },
  {
    key: 'salon_f_nails',
    label: 'Nail Services',
    icon: '💅',
    tabIcon: 'nails',
    sections: [
      { label: 'Basic Nail Care', services: ['Manicure', 'Pedicure', 'Spa Manicure', 'Spa Pedicure'] },
      { label: 'Nail Styling', services: ['Nail Art', 'Gel Nails', 'Nail Extensions'] },
    ],
    subServices: ['Manicure', 'Pedicure', 'Spa Manicure', 'Spa Pedicure', 'Nail Art', 'Gel Nails', 'Nail Extensions'],
  },
  {
    key: 'salon_f_relaxation',
    label: 'Relaxation',
    icon: '🧘',
    tabIcon: 'wellness',
    sections: [
      { label: 'Massage', services: ['Head Massage', 'Oil Head Massage', 'Head + Neck + Shoulder Massage'] },
    ],
    subServices: ['Head Massage', 'Oil Head Massage', 'Head + Neck + Shoulder Massage'],
  },
];

// ─── Salon → Unisex ───────────────────────────────────────────────────────────
export const SALON_UNISEX_CATEGORIES = [
  {
    key: 'salon_u_hair_men',
    label: 'Hair Services (Men)',
    icon: '💇',
    tabIcon: 'scissors',
    sections: [
      { label: 'Haircuts', services: ['Haircut', 'Fade Haircut', 'Kids Haircut', 'Long Hair Cut'] },
      { label: 'Styling', services: ['Hair Styling', 'Hair Wash', 'Blow Dry', 'Texture Styling'] },
    ],
    subServices: ['Haircut', 'Fade Haircut', 'Kids Haircut', 'Long Hair Cut', 'Hair Styling', 'Hair Wash', 'Blow Dry', 'Texture Styling'],
  },
  {
    key: 'salon_u_beard',
    label: 'Beard & Grooming',
    icon: '🧔',
    tabIcon: 'beard',
    sections: [
      { label: 'Beard Grooming', services: ['Beard Trim', 'Beard Shaping', 'Beard Fade'] },
      { label: 'Shaving', services: ['Clean Shave', 'Hot Towel Shave', 'Royal Shave'] },
    ],
    subServices: ['Beard Trim', 'Beard Shaping', 'Beard Fade', 'Clean Shave', 'Hot Towel Shave', 'Royal Shave'],
  },
  {
    key: 'salon_u_hair_women',
    label: 'Hair Services (Women)',
    icon: '💇‍♀️',
    tabIcon: 'scissors',
    sections: [
      { label: 'Haircuts', services: ['Haircut', 'Layer Cut', 'Step Cut', 'Kids Haircut'] },
      { label: 'Styling', services: ['Hair Styling', 'Blow Dry', 'Hair Wash', 'Straightening', 'Curling', 'Party Hairstyle', 'Bridal Hairstyle'] },
    ],
    subServices: ['Haircut', 'Layer Cut', 'Step Cut', 'Kids Haircut', 'Hair Styling', 'Blow Dry', 'Hair Wash', 'Straightening', 'Curling', 'Party Hairstyle', 'Bridal Hairstyle'],
  },
  {
    key: 'salon_u_colour',
    label: 'Hair Colour',
    icon: '🎨',
    tabIcon: 'color',
    sections: [
      { label: 'Men', services: ['Hair Colour', 'Highlights', 'Grey Coverage'] },
      { label: 'Female', services: ['Hair Colour', 'Highlights', 'Global Hair Colour', 'Grey Coverage'] },
    ],
    subServices: ['Hair Colour', 'Highlights', 'Global Hair Colour', 'Grey Coverage'],
  },
  {
    key: 'salon_u_treatment',
    label: 'Hair Treatment',
    icon: '💆',
    tabIcon: 'treatment',
    sections: [
      { label: 'Men', services: ['Hair Spa', 'Anti-Dandruff Treatment', 'Hair Fall Treatment', 'Scalp Detox', 'Keratin Treatment', 'Hair Smoothening', 'Deep Conditioning'] },
      { label: 'Female', services: ['Hair Spa', 'Hair Fall Treatment', 'Dandruff Treatment', 'Deep Conditioning', 'Keratin Treatment', 'Hair Smoothening', 'Hair Straightening'] },
    ],
    subServices: ['Hair Spa', 'Anti-Dandruff Treatment', 'Hair Fall Treatment', 'Scalp Detox', 'Dandruff Treatment', 'Deep Conditioning', 'Keratin Treatment', 'Hair Smoothening', 'Hair Straightening'],
  },
  {
    key: 'salon_u_skin',
    label: 'Skin & Face',
    icon: '🧴',
    tabIcon: 'face',
    sections: [
      { label: 'Men', services: ['Cleanup', 'Facial', 'De-Tan', 'Charcoal Facial', 'Anti-Acne Treatment', 'Blackhead Removal', 'Skin Brightening'] },
      { label: 'Female', services: ['Cleanup', 'Facial', 'De-Tan', 'Bleach', 'Charcoal Facial', 'Skin Brightening', 'Anti-Acne Treatment', 'Dark Circle Treatment', 'Blackhead Removal'] },
    ],
    subServices: ['Cleanup', 'Facial', 'De-Tan', 'Bleach', 'Charcoal Facial', 'Anti-Acne Treatment', 'Blackhead Removal', 'Skin Brightening', 'Dark Circle Treatment'],
  },
  {
    key: 'salon_u_threading_waxing',
    label: 'Threading & Waxing',
    icon: '🪒',
    tabIcon: 'waxing',
    sections: [
      { label: 'Threading', services: ['Eyebrow Threading', 'Upper Lip Threading', 'Full Face Threading'] },
      { label: 'Waxing', services: ['Full Arms Wax', 'Half Arms Wax', 'Full Legs Wax', 'Half Legs Wax', 'Underarms Wax', 'Face Wax'] },
    ],
    subServices: ['Eyebrow Threading', 'Upper Lip Threading', 'Full Face Threading', 'Full Arms Wax', 'Half Arms Wax', 'Full Legs Wax', 'Half Legs Wax', 'Underarms Wax', 'Face Wax'],
  },
  {
    key: 'salon_u_nails',
    label: 'Nail Services',
    icon: '💅',
    tabIcon: 'nails',
    sections: [
      { label: 'Female', services: ['Manicure', 'Pedicure', 'Spa Manicure', 'Spa Pedicure', 'Nail Art', 'Gel Nails', 'Nail Extensions'] },
    ],
    subServices: ['Manicure', 'Pedicure', 'Spa Manicure', 'Spa Pedicure', 'Nail Art', 'Gel Nails', 'Nail Extensions'],
  },
  {
    key: 'salon_u_relaxation',
    label: 'Relaxation',
    icon: '🧘',
    tabIcon: 'wellness',
    sections: [
      { label: 'Massage', services: ['Head Massage', 'Oil Head Massage', 'Head + Neck + Shoulder Massage'] },
    ],
    subServices: ['Head Massage', 'Oil Head Massage', 'Head + Neck + Shoulder Massage'],
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
