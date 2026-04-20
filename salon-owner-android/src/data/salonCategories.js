// Salon service categories — mirrors web frontend constants

const MALE_CATEGORIES = [
  {
    key: 'hair_services',
    label: 'Hair Services (Men)',
    icon: '✂️',
    subServices: [
      'Basic Haircut','Fade / Taper / Skin Fade','Designer Haircut',
      'Hair Styling','Hair Wash','Blow Dry','Hair Coloring',
      'Hair Straightening','Hair Smoothening','Hair Spa',
      'Dandruff Treatment','Hair Fall Treatment',
    ],
  },
  {
    key: 'beard_grooming',
    label: 'Beard & Grooming',
    icon: '🧔',
    subServices: [
      'Beard Trim','Clean Shave','Beard Styling / Shape',
      'Designer Beard','Beard Coloring','Hot Towel Shave',
    ],
  },
  {
    key: 'spa_massage',
    label: 'Spa & Massage',
    icon: '💆',
    subServices: [
      'Head Massage','Neck & Shoulder Massage','Full Body Massage',
      'Foot Massage','Deep Tissue Massage','Relaxation Massage',
    ],
  },
  {
    key: 'skin_face',
    label: 'Skin & Face (Men)',
    icon: '🧴',
    subServices: [
      'Basic Facial','Gold Facial','Diamond Facial','Clean-up',
      'Detan','Face Bleach','Anti-Acne Treatment','Skin Brightening',
    ],
  },
  {
    key: 'body_grooming',
    label: 'Body Grooming',
    icon: '🧍',
    subServices: [
      'Chest Waxing','Back Waxing','Full Body Wax',
      'Threading (optional)','Nose Wax','Ear Cleaning',
    ],
  },
  {
    key: 'packages',
    label: 'Packages & Combos',
    icon: '🎁',
    subServices: [
      'Haircut + Beard Trim','Haircut + Shave',
      'Haircut + Beard + Facial','Haircut + Colour + Styling','Full Grooming Package',
      'Groom Wedding Package','Party Grooming Package','Photoshoot Styling',
    ],
  },
  {
    key: 'memberships',
    label: 'Memberships',
    icon: '⭐',
    subServices: [
      'Monthly Grooming Plan','Unlimited Haircut Plan','Unlimited Beard Line-up Plan',
      'VIP Membership','Priority Service Membership',
    ],
  },
];

const FEMALE_CATEGORIES = [
  {
    key: 'hair_services_women',
    label: 'Hair Services (Women)',
    icon: '💇',
    subServices: [
      'Haircut (Layer / Step / Trim)','Advanced Haircut',
      'Hair Styling (Straight / Curl / Party)','Hair Wash','Blow Dry',
      'Hair Coloring','Highlights / Balayage','Hair Smoothening',
      'Rebonding','Keratin Treatment','Hair Spa',
    ],
  },
  {
    key: 'nail_services',
    label: 'Nail Services',
    icon: '💅',
    subServices: [
      'Manicure','Pedicure','Nail Art','Gel Nails',
      'Acrylic Nails','Nail Extensions','Nail Repair',
    ],
  },
  {
    key: 'skin_beauty',
    label: 'Skin & Beauty',
    icon: '🧖',
    subServices: [
      'Basic Facial','Gold Facial','Diamond Facial','Hydra Facial',
      'Clean-up','Detan','Bleach','Anti-aging Treatment','Skin Brightening',
    ],
  },
  {
    key: 'body_grooming_women',
    label: 'Body Grooming',
    icon: '🧴',
    subServices: [
      'Full Body Wax','Half Wax','Bikini Wax',
      'Threading (Eyebrow / Upper Lip / Forehead)','Body Polish','Body Scrub',
    ],
  },
  {
    key: 'spa_relaxation',
    label: 'Spa & Relaxation',
    icon: '💆',
    subServices: [
      'Head Massage','Full Body Massage','Aromatherapy','Spa Therapy',
    ],
  },
  {
    key: 'bridal_events',
    label: 'Bridal & Events',
    icon: '👰',
    subServices: [
      'Bridal Makeup','Engagement Makeup','Party Makeup',
      'Hairstyling','Saree Draping',
    ],
  },
  {
    key: 'packages_women',
    label: 'Packages & Combos',
    icon: '🎁',
    subServices: [
      'Haircut + Facial','Haircut + Hair Spa','Manicure + Pedicure Combo',
      'Bridal Package','Full Beauty Package','Party Ready Package',
    ],
  },
  {
    key: 'memberships_women',
    label: 'Memberships',
    icon: '⭐',
    subServices: [
      'Monthly Beauty Plan','Unlimited Haircut Plan','Unlimited Facial Plan',
      'VIP Membership','Priority Service Membership',
    ],
  },
];

const UNISEX_CATEGORIES = [
  {
    key: 'hair_services_unisex',
    label: 'Hair Services',
    icon: '✂️',
    subServices: [
      'Basic Haircut','Fade / Taper / Skin Fade','Designer Haircut',
      'Haircut (Layer / Step / Trim)','Advanced Haircut',
      'Hair Styling','Hair Wash','Blow Dry','Hair Coloring',
      'Highlights / Balayage','Hair Smoothening','Hair Spa',
    ],
  },
  {
    key: 'beard_grooming_unisex',
    label: 'Beard & Grooming',
    icon: '🧔',
    subServices: [
      'Beard Trim','Clean Shave','Beard Styling / Shape',
      'Designer Beard','Beard Coloring','Hot Towel Shave',
    ],
  },
  {
    key: 'nail_services_unisex',
    label: 'Nail Services',
    icon: '💅',
    subServices: [
      'Manicure','Pedicure','Nail Art','Gel Nails','Nail Extensions',
    ],
  },
  {
    key: 'skin_beauty_unisex',
    label: 'Skin & Beauty',
    icon: '🧖',
    subServices: [
      'Basic Facial','Gold Facial','Diamond Facial','Hydra Facial',
      'Clean-up','Detan','Bleach / Face Bleach','Anti-Acne Treatment','Skin Brightening',
    ],
  },
  {
    key: 'spa_massage_unisex',
    label: 'Spa & Massage',
    icon: '💆',
    subServices: [
      'Head Massage','Neck & Shoulder Massage','Full Body Massage',
      'Foot Massage','Aromatherapy','Relaxation Massage',
    ],
  },
  {
    key: 'body_grooming_unisex',
    label: 'Body Grooming',
    icon: '🧴',
    subServices: [
      'Full Body Wax','Half Wax','Threading','Body Polish','Body Scrub',
      'Chest Waxing','Back Waxing','Nose Wax','Ear Cleaning',
    ],
  },
  {
    key: 'bridal_events_unisex',
    label: 'Bridal & Events',
    icon: '👰',
    subServices: [
      'Bridal Makeup','Engagement Makeup','Party Makeup',
      'Hairstyling','Saree Draping','Groom Makeup',
    ],
  },
  {
    key: 'kids_services_unisex',
    label: 'Kids Services',
    icon: '👶',
    subServices: [
      "Kids' Haircut (Boys)","Kids' Haircut (Girls)",
      "Kids' Hair Styling","Kids' Hair Wash",
    ],
  },
  {
    key: 'packages_unisex',
    label: 'Packages & Combos',
    icon: '🎁',
    subServices: [
      'Haircut + Beard Trim','Haircut + Facial','Manicure + Pedicure Combo',
      'Full Grooming Package','Bridal Package','Party Ready Package',
      'Groom Wedding Package','Full Beauty Package',
    ],
  },
  {
    key: 'memberships_unisex',
    label: 'Memberships',
    icon: '⭐',
    subServices: [
      'Monthly Grooming Plan','Monthly Beauty Plan','Unlimited Haircut Plan',
      'VIP Membership','Priority Service Membership',
    ],
  },
];

// Suggested prices (₹) per service name
const PRICE_HINTS = {
  'Basic Haircut': { price: 100, duration: 20 },
  'Fade / Taper / Skin Fade': { price: 200, duration: 30 },
  'Designer Haircut': { price: 300, duration: 40 },
  'Hair Styling': { price: 150, duration: 20 },
  'Hair Wash': { price: 80, duration: 15 },
  'Blow Dry': { price: 150, duration: 20 },
  'Hair Coloring': { price: 500, duration: 60 },
  'Hair Straightening': { price: 800, duration: 90 },
  'Hair Smoothening': { price: 1000, duration: 120 },
  'Hair Spa': { price: 400, duration: 45 },
  'Dandruff Treatment': { price: 300, duration: 30 },
  'Hair Fall Treatment': { price: 400, duration: 45 },
  'Beard Trim': { price: 80, duration: 15 },
  'Clean Shave': { price: 100, duration: 20 },
  'Beard Styling / Shape': { price: 150, duration: 20 },
  'Designer Beard': { price: 200, duration: 25 },
  'Beard Coloring': { price: 200, duration: 30 },
  'Hot Towel Shave': { price: 150, duration: 25 },
  'Head Massage': { price: 200, duration: 30 },
  'Neck & Shoulder Massage': { price: 300, duration: 30 },
  'Full Body Massage': { price: 800, duration: 60 },
  'Foot Massage': { price: 250, duration: 30 },
  'Deep Tissue Massage': { price: 1000, duration: 60 },
  'Relaxation Massage': { price: 600, duration: 45 },
  'Basic Facial': { price: 300, duration: 45 },
  'Gold Facial': { price: 600, duration: 60 },
  'Diamond Facial': { price: 800, duration: 60 },
  'Hydra Facial': { price: 1200, duration: 75 },
  'Clean-up': { price: 200, duration: 30 },
  'Detan': { price: 200, duration: 30 },
  'Manicure': { price: 300, duration: 45 },
  'Pedicure': { price: 350, duration: 45 },
  'Nail Art': { price: 400, duration: 60 },
  'Bridal Makeup': { price: 3000, duration: 120 },
  'Engagement Makeup': { price: 2000, duration: 90 },
  'Party Makeup': { price: 1000, duration: 60 },
  "Kids' Haircut (Boys)": { price: 80, duration: 15 },
  "Kids' Haircut (Girls)": { price: 100, duration: 20 },
};

// Quick picks by gender (service name → { price, duration })
const QUICK_PICKS = {
  male: [
    { catKey: 'hair_services', name: 'Basic Haircut', price: 100, duration: 20 },
    { catKey: 'hair_services', name: 'Fade / Taper / Skin Fade', price: 200, duration: 30 },
    { catKey: 'beard_grooming', name: 'Beard Trim', price: 80, duration: 15 },
    { catKey: 'beard_grooming', name: 'Clean Shave', price: 100, duration: 20 },
    { catKey: 'hair_services', name: 'Hair Wash', price: 80, duration: 15 },
    { catKey: 'hair_services', name: 'Hair Spa', price: 400, duration: 45 },
  ],
  female: [
    { catKey: 'hair_services_women', name: 'Haircut (Layer / Step / Trim)', price: 300, duration: 45 },
    { catKey: 'hair_services_women', name: 'Hair Wash', price: 100, duration: 20 },
    { catKey: 'hair_services_women', name: 'Blow Dry', price: 200, duration: 30 },
    { catKey: 'nail_services', name: 'Manicure', price: 300, duration: 45 },
    { catKey: 'nail_services', name: 'Pedicure', price: 350, duration: 45 },
    { catKey: 'skin_beauty', name: 'Basic Facial', price: 400, duration: 60 },
  ],
  unisex: [
    { catKey: 'hair_services_unisex', name: 'Basic Haircut', price: 100, duration: 20 },
    { catKey: 'hair_services_unisex', name: 'Hair Wash', price: 80, duration: 15 },
    { catKey: 'beard_grooming_unisex', name: 'Beard Trim', price: 80, duration: 15 },
    { catKey: 'nail_services_unisex', name: 'Manicure', price: 300, duration: 45 },
    { catKey: 'nail_services_unisex', name: 'Pedicure', price: 350, duration: 45 },
    { catKey: 'skin_beauty_unisex', name: 'Basic Facial', price: 400, duration: 60 },
  ],
};

const getCategoriesForGender = (servedGender) => {
  if (servedGender === 'male')   return MALE_CATEGORIES;
  if (servedGender === 'female') return FEMALE_CATEGORIES;
  return UNISEX_CATEGORIES;
};

export { MALE_CATEGORIES, FEMALE_CATEGORIES, UNISEX_CATEGORIES, PRICE_HINTS, QUICK_PICKS, getCategoriesForGender };
