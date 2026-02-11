export const COLORS = {
  SKY: '#4FA4F4', // Vibrant Sky Blue from image
  GRASS_LIGHT: '#8BE346', // Bright Green from image
  GRASS_DARK: '#7AC439', // Slightly darker green for texture
  DOG_WHITE: '#FFFFFF',
  DOG_SHADOW: 'rgba(0,0,0,0.15)', // Lighter shadow for clean look
  COLLAR: '#111111',
  SHADOW: 'rgba(0, 0, 0, 0.2)',
};

export const PHYSICS = {
  DOG_SPEED: 9, // Slightly faster for snappier fetch
  BALL_SPEED: 0.015, // Physics speed for ball arc
  GRAVITY: 0.5,
  FRICTION: 0.9,
  GESTURE_THRESHOLD: 0.8, // More sensitive gesture
};

export const DIMENSIONS = {
  GROUND_HORIZON_Y_RATIO: 0.4, // Lower horizon for more grass space
  DOG_SIZE: 5, // Pixel scale multiplier
};