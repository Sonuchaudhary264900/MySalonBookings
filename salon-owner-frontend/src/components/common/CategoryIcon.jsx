import {
  Scissors, User, Palette, Leaf, Droplets, Star, Baby,
  Home, Activity, Stethoscope, Sparkles, Heart, Brush,
  Flower2, Gem, UserRound, Zap, Dumbbell,
} from 'lucide-react';

const MAP = {
  // Hair
  'Hair Services': Scissors,
  'Hair Services (Men)': Scissors,
  'Hair Services (Women)': Scissors,
  // Beard
  'Beard & Grooming': User,
  // Nail
  'Nail Services': Sparkles,
  // Skin / Face
  'Skin & Face (Men Grooming)': Droplets,
  'Skin & Beauty': Droplets,
  'Skin & Face / Beauty': Droplets,
  'Skin & Face': Droplets,
  // Dermatology
  'Men Dermatology': Stethoscope,
  'Skin Dermatology': Stethoscope,
  // Spa / Massage
  'Spa & Massage': Leaf,
  'Spa & Relaxation': Leaf,
  'Spa & Wellness': Leaf,
  // Body
  'Body Grooming': Activity,
  // Bridal
  'Bridal & Events': Star,
  'Bridal Makeup': Star,
  // Makeup
  'Makeup & Styling': Palette,
  'Makeup': Palette,
  // Kids
  'Kids Services': Baby,
  // At-Home
  'At-Home Services': Home,
  // Advanced / Aesthetic
  'Advanced Hair Treatments': Zap,
  'Advanced Skin Treatments': Zap,
  'Hair Texture Treatments': Scissors,
  'Hair Coloring & Highlights': Palette,
  'Scalp & Hair Therapy': Droplets,
  // Wellness
  'Wellness & Therapy': Heart,
  // Fitness
  'Fitness': Dumbbell,
};

const CategoryIcon = ({ label = '', className = 'w-4 h-4' }) => {
  const Icon = MAP[label] || Sparkles;
  return <Icon className={className} />;
};

export default CategoryIcon;
