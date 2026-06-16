// Shared salon category constants — mirrors salon-user-frontend/src/constants/salonCategories.js
// Keep these files in sync when adding new categories.

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

// ── Ionicons name map (for React Native) ─────────────────────────
export const CATEGORY_ICON_MAP = {
  'Hair Services':               'cut-outline',
  'Hair Services (Men)':         'cut-outline',
  'Hair Services (Women)':       'cut-outline',
  'Beard & Grooming':            'man-outline',
  'Nail Services':               'color-palette-outline',
  'Skin & Face / Beauty':        'sparkles-outline',
  'Skin & Face (Men Grooming)':  'sparkles-outline',
  'Skin & Beauty':               'sparkles-outline',
  'Face & Skin':                 'sparkles-outline',
  'Spa & Massage':               'water-outline',
  'Spa & Relaxation':            'water-outline',
  'Body Grooming':               'body-outline',
  'Men Dermatology':             'medkit-outline',
  'Women Dermatology':           'medkit-outline',
  'Bridal & Events':             'heart-outline',
  'Kids Services':               'happy-outline',
  'At-Home Services':            'home-outline',
  'Makeup Services':             'color-palette-outline',
  'Hairstyling':                 'cut-outline',
  'Draping & Dressing':          'shirt-outline',
  'Pre-Bridal':                  'heart-outline',
  'Grooming Add-ons':            'add-outline',
  'Premium Add-ons':             'star-outline',
};

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

// ── HD category card images (600×300) ────────────────────────────
export const CATEGORY_CARD_IMAGE_MAP = {
  'Hair Services':              'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=300&fit=crop&q=85',
  'Hair Services (Men)':        'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&h=300&fit=crop&q=85',
  'Hair Services (Women)':      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=300&fit=crop&q=85',
  'Beard & Grooming':           'https://images.unsplash.com/photo-1599351431613-18ef1fdd27e5?w=600&h=300&fit=crop&q=85',
  'Nail Services':              'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&h=300&fit=crop&q=85',
  'Skin & Face / Beauty':       'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&h=300&fit=crop&q=85',
  'Skin & Beauty':              'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&h=300&fit=crop&q=85',
  'Spa & Massage':              'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&h=300&fit=crop&q=85',
  'Spa & Relaxation':           'https://images.unsplash.com/photo-1498842812179-c81beecf902c?w=600&h=300&fit=crop&q=85',
  'Body Grooming':              'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600&h=300&fit=crop&q=85',
  'Men Dermatology':            'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&h=300&fit=crop&q=85',
  'Women Dermatology':          'https://images.unsplash.com/photo-1614859324967-bdf413c35a2c?w=600&h=300&fit=crop&q=85',
  'Bridal & Events':            'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=300&fit=crop&q=85',
  'Kids Services':              'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&h=300&fit=crop&q=85',
  'At-Home Services':           'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=300&fit=crop&q=85',
  'Makeup Services':            'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&h=300&fit=crop&q=85',
  'Hairstyling':                'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&h=300&fit=crop&q=85',
  'Draping & Dressing':         'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&h=300&fit=crop&q=85',
  'Pre-Bridal':                 'https://images.unsplash.com/photo-1526413232644-8a40f03cc03b?w=600&h=300&fit=crop&q=85',
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

export function getCategoryOrderForBusinessType(businessType, servedGender) {
  const bizOrders = BIZ_CATEGORY_ORDERS[businessType];
  if (!bizOrders) return ALL_CATEGORY_ORDER;
  const gender = servedGender === 'male' ? 'male' : servedGender === 'female' ? 'female' : 'unisex';
  return bizOrders[gender] || ALL_CATEGORY_ORDER;
}

// Build base-label lookup + alias resolution (mirrors web ExplorePage)
const BASE_CAT_MAP = {};
for (const c of UNISEX_CATEGORIES) BASE_CAT_MAP[c.label] = c;

const LABEL_ALIAS = {
  'Hair Services (Men)':          { base: 'Hair Services',        gender: 'male'   },
  'Hair Services (Women)':        { base: 'Hair Services',        gender: 'female' },
  'Skin & Face (Men Grooming)':   { base: 'Skin & Face / Beauty', gender: 'male'   },
  'Skin & Beauty':                { base: 'Skin & Face / Beauty', gender: 'female' },
  'Face & Skin':                  { base: 'Skin & Face / Beauty', gender: 'both'   },
  'Spa & Relaxation':             { base: 'Spa & Massage',        gender: 'female' },
  'Skin & Derma':                 { base: 'Men Dermatology',      gender: 'both'   },
  'Makeup Services':              { base: 'Bridal & Events',      gender: 'both'   },
  'Hairstyling':                  { base: 'Hair Services',        gender: 'both'   },
  'Draping & Dressing':           { base: 'Bridal & Events',      gender: 'female' },
  'Pre-Bridal':                   { base: 'Bridal & Events',      gender: 'female' },
  'Grooming Add-ons':             { base: 'Body Grooming',        gender: 'both'   },
  'Premium Add-ons':              { base: 'Bridal & Events',      gender: 'both'   },
};

export function resolveSubServices(label) {
  if (BASE_CAT_MAP[label]) {
    const c = BASE_CAT_MAP[label];
    return [...new Set([...(c.maleSubServices || []), ...(c.femaleSubServices || [])])];
  }
  const alias = LABEL_ALIAS[label];
  if (alias && BASE_CAT_MAP[alias.base]) {
    const c = BASE_CAT_MAP[alias.base];
    if (alias.gender === 'male')   return [...(c.maleSubServices   || [])];
    if (alias.gender === 'female') return [...(c.femaleSubServices || [])];
    return [...new Set([...(c.maleSubServices || []), ...(c.femaleSubServices || [])])];
  }
  return [];
}

export function resolveCategoryIcon(label) {
  return CATEGORY_ICON_MAP[label] || 'storefront-outline';
}
