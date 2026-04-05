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
      'Undercut', 'Crew Cut', 'Buzz Cut',
      'Hair Styling', 'Hair Coloring', 'Global Hair Color', 'Highlights / Streaks', 'Root Touch-Up',
      'Hair Spa', 'Hair Smoothening', 'Hair Straightening', 'Keratin Treatment', 'Hair Botox', 'Hair Rebonding',
      'Hair Wash', 'Blow Dry', 'Dandruff Treatment', 'Hair Fall Treatment', 'Scalp Treatment', 'Deep Conditioning',
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
      'Manicure', 'Pedicure', 'Nail Art', 'Gel Nails',
      'Acrylic Nails', 'Nail Extensions', 'Nail Repair',
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
      'Basic Facial', 'Gold Facial', 'Diamond Facial', 'Hydra Facial',
      'Clean-up', 'Detan', 'Bleach', 'Anti-aging Treatment', 'Skin Brightening',
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
      'Head Massage', 'Full Body Massage', 'Foot Massage',
      'Aromatherapy', 'Spa Therapy', 'Relaxation Massage',
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
      'Full Body Wax', 'Half Wax', 'Bikini Wax',
      'Threading (Eyebrow / Upper Lip / Forehead)', 'Body Polish', 'Body Scrub',
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
      'Bridal Makeup', 'Engagement Makeup', 'Party Makeup',
      'Hairstyling', 'Saree Draping',
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
