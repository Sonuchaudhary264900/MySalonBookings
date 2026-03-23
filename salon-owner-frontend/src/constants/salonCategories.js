// Shared salon category constants used by registration form and settings editor

export const MALE_CATEGORIES = [
  {
    key: 'hair_services',
    label: 'Hair Services (Men)',
    icon: '✂️',
    subServices: [
      'Basic Haircut', 'Fade / Taper / Skin Fade', 'Designer Haircut',
      'Hair Styling', 'Hair Wash', 'Blow Dry', 'Hair Coloring',
      'Hair Straightening', 'Hair Smoothening', 'Hair Spa',
      'Dandruff Treatment', 'Hair Fall Treatment',
    ],
  },
  {
    key: 'beard_grooming',
    label: 'Beard & Grooming',
    icon: '🧔',
    subServices: [
      'Beard Trim', 'Clean Shave', 'Beard Styling / Shape',
      'Designer Beard', 'Beard Coloring', 'Hot Towel Shave',
    ],
  },
  {
    key: 'spa_massage',
    label: 'Spa & Massage',
    icon: '💆',
    subServices: [
      'Head Massage', 'Neck & Shoulder Massage', 'Full Body Massage',
      'Foot Massage', 'Deep Tissue Massage', 'Relaxation Massage',
    ],
  },
  {
    key: 'skin_face',
    label: 'Skin & Face (Men Grooming)',
    icon: '🧴',
    subServices: [
      'Basic Facial', 'Gold Facial', 'Diamond Facial', 'Clean-up',
      'Detan', 'Face Bleach', 'Anti-Acne Treatment', 'Skin Brightening',
    ],
  },
  {
    key: 'body_grooming',
    label: 'Body Grooming',
    icon: '🧍',
    subServices: [
      'Chest Waxing', 'Back Waxing', 'Full Body Wax',
      'Threading (optional)', 'Nose Wax', 'Ear Cleaning',
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
      'Haircut (Layer / Step / Trim)', 'Advanced Haircut',
      'Hair Styling (Straight / Curl / Party)', 'Hair Wash', 'Blow Dry',
      'Hair Coloring', 'Highlights / Balayage', 'Hair Smoothening',
      'Rebonding', 'Keratin Treatment', 'Hair Spa',
    ],
  },
  {
    key: 'nail_services',
    label: 'Nail Services',
    icon: '💅',
    subServices: [
      'Manicure', 'Pedicure', 'Nail Art', 'Gel Nails',
      'Acrylic Nails', 'Nail Extensions', 'Nail Repair',
    ],
  },
  {
    key: 'skin_beauty',
    label: 'Skin & Beauty',
    icon: '🧖',
    subServices: [
      'Basic Facial', 'Gold Facial', 'Diamond Facial', 'Hydra Facial',
      'Clean-up', 'Detan', 'Bleach', 'Anti-aging Treatment', 'Skin Brightening',
    ],
  },
  {
    key: 'body_grooming_women',
    label: 'Body Grooming',
    icon: '🧴',
    subServices: [
      'Full Body Wax', 'Half Wax', 'Bikini Wax',
      'Threading (Eyebrow / Upper Lip / Forehead)', 'Body Polish', 'Body Scrub',
    ],
  },
  {
    key: 'spa_relaxation',
    label: 'Spa & Relaxation',
    icon: '💆',
    subServices: [
      'Head Massage', 'Full Body Massage', 'Aromatherapy', 'Spa Therapy',
    ],
  },
  {
    key: 'bridal_events',
    label: 'Bridal & Events',
    icon: '👰',
    subServices: [
      'Bridal Makeup', 'Engagement Makeup', 'Party Makeup',
      'Hairstyling', 'Saree Draping',
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
      'Hair Styling', 'Hair Wash', 'Blow Dry', 'Hair Coloring',
      'Hair Straightening', 'Hair Smoothening', 'Hair Spa',
      'Dandruff Treatment', 'Hair Fall Treatment',
    ],
    femaleSubServices: [
      'Haircut (Layer / Step / Trim)', 'Advanced Haircut',
      'Hair Styling (Straight / Curl / Party)', 'Hair Wash', 'Blow Dry',
      'Hair Coloring', 'Highlights / Balayage', 'Hair Smoothening',
      'Rebonding', 'Keratin Treatment', 'Hair Spa',
    ],
    get subServices() { return [...new Set([...this.maleSubServices, ...this.femaleSubServices])]; },
  },
  {
    key: 'beard_grooming_unisex',
    label: 'Beard & Grooming',
    icon: '🧔',
    subServices: [
      'Beard Trim', 'Clean Shave', 'Beard Styling / Shape',
      'Designer Beard', 'Beard Coloring', 'Hot Towel Shave',
    ],
  },
  {
    key: 'nail_services_unisex',
    label: 'Nail Services',
    icon: '💅',
    subServices: [
      'Manicure', 'Pedicure', 'Nail Art', 'Gel Nails',
      'Acrylic Nails', 'Nail Extensions', 'Nail Repair',
    ],
  },
  {
    key: 'skin_beauty_unisex',
    label: 'Skin & Face / Beauty',
    icon: '🧖',
    maleSubServices: [
      'Basic Facial', 'Gold Facial', 'Diamond Facial', 'Clean-up',
      'Detan', 'Face Bleach', 'Anti-Acne Treatment', 'Skin Brightening',
    ],
    femaleSubServices: [
      'Basic Facial', 'Gold Facial', 'Diamond Facial', 'Hydra Facial',
      'Clean-up', 'Detan', 'Bleach', 'Anti-aging Treatment', 'Skin Brightening',
    ],
    get subServices() { return [...new Set([...this.maleSubServices, ...this.femaleSubServices])]; },
  },
  {
    key: 'spa_massage_unisex',
    label: 'Spa & Massage',
    icon: '💆',
    subServices: [
      'Head Massage', 'Neck & Shoulder Massage', 'Full Body Massage',
      'Foot Massage', 'Deep Tissue Massage', 'Relaxation Massage',
      'Aromatherapy', 'Spa Therapy',
    ],
  },
  {
    key: 'body_grooming_unisex',
    label: 'Body Grooming',
    icon: '🧴',
    maleSubServices: [
      'Chest Waxing', 'Back Waxing', 'Full Body Wax',
      'Threading (optional)', 'Nose Wax', 'Ear Cleaning',
    ],
    femaleSubServices: [
      'Full Body Wax', 'Half Wax', 'Bikini Wax',
      'Threading (Eyebrow / Upper Lip / Forehead)', 'Body Polish', 'Body Scrub',
    ],
    get subServices() { return [...new Set([...this.maleSubServices, ...this.femaleSubServices])]; },
  },
  {
    key: 'bridal_events_unisex',
    label: 'Bridal & Events',
    icon: '👰',
    subServices: [
      'Bridal Makeup', 'Engagement Makeup', 'Party Makeup',
      'Hairstyling', 'Saree Draping',
    ],
  },
  {
    key: 'kids_services_unisex',
    label: 'Kids Services',
    icon: '👶',
    subServices: [
      "Kids' Haircut (Boys)", "Kids' Haircut (Girls)",
      "Kids' Hair Styling", "Kids' Hair Wash",
    ],
  },
  {
    key: 'at_home_services_unisex',
    label: 'At-Home Services',
    icon: '🏠',
    subServices: [
      'At-Home Haircut', 'At-Home Facial', 'At-Home Waxing',
      'At-Home Massage', 'At-Home Bridal',
    ],
  },
];
