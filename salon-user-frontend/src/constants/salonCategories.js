// Shared salon category constants — mirrors salon-owner-frontend/src/constants/salonCategories.js
// Keep these two files in sync when adding new categories.

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
  },
  {
    key: 'spa_massage_unisex',
    label: 'Spa & Massage',
    icon: '💆',
    maleSubServices: [
      'Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage',
      'Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage',
      'Aroma Therapy Massage', 'Hot Stone Massage',
      'Body Spa', 'Body Polish',
      'Stress Relief Therapy',
    ],
    femaleSubServices: [
      'Head Massage', 'Neck & Shoulder Massage', 'Back Massage', 'Foot Massage',
      'Full Body Massage', 'Relaxation Massage', 'Deep Tissue Massage',
      'Aroma Therapy Massage', 'Hot Stone Massage',
      'Body Spa', 'Body Polish',
      'Stress Relief Therapy', 'Sleep Therapy',
      'Pre-Bridal Spa', 'Pregnancy Safe Massage',
    ],
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
  },
  {
    key: 'kids_services_unisex',
    label: 'Kids Services',
    icon: '👶',
    maleSubServices: ['Kids Haircut'],
    femaleSubServices: ['Kids Haircut'],
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
  },
];

// ── Lucide icon name map (covers all possible category label strings) ─
// Values are Lucide component name strings — import and render in the UI
export const CATEGORY_ICON_MAP = {
  'Hair Services':               'Scissors',
  'Hair Services (Men)':         'Scissors',
  'Hair Services (Women)':       'Scissors',
  'Beard & Grooming':            'Smile',
  'Nail Services':               'Paintbrush',
  'Skin & Face / Beauty':        'Sparkles',
  'Skin & Face (Men Grooming)':  'Sparkles',
  'Skin & Beauty':               'Sparkles',
  'Face & Skin':                 'Sparkles',
  'Spa & Massage':               'Waves',
  'Spa & Relaxation':            'Waves',
  'Body Grooming':               'Wind',
  'Men Dermatology':             'Activity',
  'Women Dermatology':           'Activity',
  'Bridal & Events':             'Crown',
  'Kids Services':               'Baby',
  'At-Home Services':            'Home',
  'Makeup Services':             'Palette',
  'Hairstyling':                 'Scissors',
  'Draping & Dressing':          'Shirt',
  'Pre-Bridal':                  'Heart',
  'Grooming Add-ons':            'Plus',
  'Premium Add-ons':             'Star',
};

// ── Global fallback order ──────────────────────────────────────────
export const ALL_CATEGORY_ORDER = [
  'Hair Services', 'Hair Services (Men)', 'Hair Services (Women)',
  'Beard & Grooming', 'Nail Services',
  'Skin & Face / Beauty', 'Skin & Face (Men Grooming)', 'Skin & Beauty', 'Face & Skin',
  'Spa & Massage', 'Spa & Relaxation', 'Body Grooming',
  'Men Dermatology', 'Women Dermatology',
  'Makeup Services', 'Hairstyling', 'Draping & Dressing', 'Pre-Bridal',
  'Grooming Add-ons', 'Premium Add-ons',
  'Bridal & Events', 'Kids Services', 'At-Home Services',
];

export const MALE_ONLY_CAT_LABELS  = new Set(['Beard & Grooming', 'Men Dermatology', 'Hair Services (Men)', 'Skin & Face (Men Grooming)', 'Face & Skin']);
export const FEMALE_ONLY_CAT_LABELS = new Set(['Bridal & Events', 'Women Dermatology', 'Hair Services (Women)', 'Skin & Beauty', 'Nail Services', 'Spa & Relaxation', 'Makeup Services', 'Hairstyling', 'Draping & Dressing', 'Pre-Bridal']);

// ── Lightweight djb2-style hash for deterministic image pool selection ─────
const _nameHash = (str = '') => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
};

// ── Category image pools (2-3 per high-repetition category) ───────────────
// Values are Unsplash CDN URLs (80×80, q=70) — no owner setup needed
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

// ── HD category card images (600×300) — mirrors owner frontend ───
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
  'Hair Colour & Highlights':   'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&h=300&fit=crop&q=85',
};

export const SUBCATEGORY_IMAGE_MAP = {
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
  'Shaving':                  'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&h=400&fit=crop&q=80',
  'Beard Grooming':           'https://images.unsplash.com/photo-1599351431613-18ef1fdd27e5?w=400&h=400&fit=crop&q=80',
  'Mustache Services':        'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=400&fit=crop&q=80',
  'Mustache':                 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=400&fit=crop&q=80',
  'Beard Treatments':         'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop&q=80',
  'Natural Colour':           'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&h=400&fit=crop&q=80',
  'Fashion Colour':           'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&h=400&fit=crop&q=80',
  'Creative Colour':          'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=400&h=400&fit=crop&q=80',
  'Chemical Treatments':      'https://images.unsplash.com/photo-1526413232644-8a40f03cc03b?w=400&h=400&fit=crop&q=80',
  'Facial Services':          'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop&q=80',
  'Skin Treatments':          'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&q=80',
  'Grooming Details':         'https://images.unsplash.com/photo-1626954079673-f3c3b7dc0bce?w=400&h=400&fit=crop&q=80',
  'Advanced Aesthetic':       'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&q=80',
  'Basic Care':               'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop&q=80',
  'Premium Facials':          'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&q=80',
  'Advanced Skin Care':       'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&q=80',
  'Threading':                'https://images.unsplash.com/photo-1626954079673-f3c3b7dc0bce?w=400&h=400&fit=crop&q=80',
  'Body Waxing':              'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&h=400&fit=crop&q=80',
  'Body Care':                'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&h=400&fit=crop&q=80',
  'Basic Nail Care':          'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&q=80',
  'Nail Art':                 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&q=80',
  'Gel & Acrylic':            'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&q=80',
  'Nail Repair & Removal':    'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&q=80',
  'Scalp Treatments':         'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=400&fit=crop&q=80',
  'Oil & Therapy':            'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop&q=80',
  'Massage Services':         'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop&q=80',
  'Relaxation Services':      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=400&fit=crop&q=80',
  'Massage':                  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop&q=80',
  'Relaxation':               'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=400&fit=crop&q=80',
  'Hand Care':                'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&q=80',
  'Foot Care':                'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&q=80',
  'Hand & Foot':              'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&h=400&fit=crop&q=80',
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
  'Men':                      'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=400&fit=crop&q=80',
  'Female':                   'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop&q=80',
  'Beard & Face Issues':      'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&fit=crop&q=80',
};

// Resolve category image: owner custom → HD default map → null
export const getCategoryImage = (catLabel, salon) => {
  const saved = salon?.categoryImages;
  if (saved) {
    const custom = saved instanceof Map ? saved.get(catLabel) : saved[catLabel];
    if (custom) return custom;
  }
  return CATEGORY_CARD_IMAGE_MAP[catLabel] || null;
};

// Priority: owner photo → deterministic pool pick → null
export const getServiceImage = (service) => {
  if (service.photos?.[0]) return service.photos[0];
  const entry = CATEGORY_IMAGES[service.category];
  if (!entry) return null;
  if (typeof entry === 'string') return entry;
  return entry[_nameHash(service.name) % entry.length];
};

// ── Per-businessType category order ───────────────────────────────
const BIZ_CATEGORY_ORDERS = {
  barbershop: {
    male:   ['Hair Services', 'Hair Services (Men)', 'Beard & Grooming', 'Face & Skin', 'Skin & Face (Men Grooming)', 'Body Grooming', 'Spa & Massage', 'Men Dermatology', 'Kids Services', 'At-Home Services'],
    female: ['Hair Services', 'Hair Services (Men)', 'Beard & Grooming', 'Face & Skin', 'Body Grooming', 'Men Dermatology'],
    unisex: ['Hair Services', 'Hair Services (Men)', 'Beard & Grooming', 'Face & Skin', 'Skin & Face (Men Grooming)', 'Body Grooming', 'Spa & Massage', 'Men Dermatology', 'Kids Services', 'At-Home Services'],
  },
  salon: {
    male:   ['Hair Services', 'Hair Services (Men)', 'Beard & Grooming', 'Skin & Face (Men Grooming)', 'Skin & Face / Beauty', 'Spa & Massage', 'Body Grooming', 'Men Dermatology', 'Kids Services', 'At-Home Services'],
    female: ['Hair Services', 'Hair Services (Women)', 'Nail Services', 'Skin & Beauty', 'Skin & Face / Beauty', 'Body Grooming', 'Spa & Relaxation', 'Spa & Massage', 'Bridal & Events', 'Women Dermatology', 'Kids Services', 'At-Home Services'],
    unisex: ['Hair Services', 'Hair Services (Men)', 'Hair Services (Women)', 'Beard & Grooming', 'Nail Services', 'Skin & Face / Beauty', 'Skin & Face (Men Grooming)', 'Skin & Beauty', 'Spa & Massage', 'Spa & Relaxation', 'Body Grooming', 'Bridal & Events', 'Men Dermatology', 'Women Dermatology', 'Kids Services', 'At-Home Services'],
  },
  spa_wellness: {
    male:   ['Spa & Massage', 'Body Grooming', 'Skin & Face (Men Grooming)', 'Skin & Face / Beauty', 'Men Dermatology', 'At-Home Services'],
    female: ['Spa & Relaxation', 'Spa & Massage', 'Body Grooming', 'Skin & Beauty', 'Skin & Face / Beauty', 'Women Dermatology', 'At-Home Services'],
    unisex: ['Spa & Massage', 'Spa & Relaxation', 'Body Grooming', 'Skin & Face / Beauty', 'Skin & Beauty', 'Men Dermatology', 'Women Dermatology', 'At-Home Services'],
  },
  makeup_bridal: {
    male:   ['Makeup Services', 'Hairstyling', 'Draping & Dressing', 'Pre-Bridal', 'Grooming Add-ons', 'Bridal & Events', 'Premium Add-ons'],
    female: ['Makeup Services', 'Hairstyling', 'Draping & Dressing', 'Pre-Bridal', 'Grooming Add-ons', 'Bridal & Events', 'Nail Services', 'Skin & Beauty', 'Hair Services (Women)', 'Premium Add-ons'],
    unisex: ['Makeup Services', 'Hairstyling', 'Draping & Dressing', 'Pre-Bridal', 'Grooming Add-ons', 'Bridal & Events', 'Nail Services', 'Skin & Beauty', 'Hair Services (Women)', 'Premium Add-ons'],
  },
  skin_derma: {
    male:   ['Men Dermatology', 'Skin & Face (Men Grooming)', 'Skin & Face / Beauty', 'Hair Services (Men)', 'Body Grooming'],
    female: ['Women Dermatology', 'Skin & Beauty', 'Skin & Face / Beauty', 'Hair Services (Women)', 'Nail Services', 'Body Grooming'],
    unisex: ['Men Dermatology', 'Women Dermatology', 'Skin & Face / Beauty', 'Skin & Face (Men Grooming)', 'Skin & Beauty', 'Hair Services', 'Body Grooming'],
  },
};

/**
 * Returns an ordered array of category label strings for a given
 * business type + gender combination.
 * Falls back to ALL_CATEGORY_ORDER if the combo is not found.
 */
export function getCategoryOrderForBusinessType(businessType, servedGender) {
  const bizOrders = BIZ_CATEGORY_ORDERS[businessType];
  if (!bizOrders) return ALL_CATEGORY_ORDER;
  const gender = servedGender === 'male' ? 'male' : servedGender === 'female' ? 'female' : 'unisex';
  return bizOrders[gender] || ALL_CATEGORY_ORDER;
}
