import { Button, IconButton } from '@mui/material';
import { hapticLight, hapticMedium, hapticSuccess } from '@/lib/nativeFeatures';

/**
 * Button with haptic feedback
 * @param {string} hapticType - Type of haptic: 'light', 'medium', 'success'
 * @param {function} onClick - Click handler
 * @param {object} props - Other Button props
 */
export function HapticButton({ hapticType = 'light', onClick, children, ...props }) {
  const handleClick = async (e) => {
    // Trigger haptic feedback
    switch (hapticType) {
      case 'medium':
        await hapticMedium();
        break;
      case 'success':
        await hapticSuccess();
        break;
      default:
        await hapticLight();
    }
    
    // Execute original onClick
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <Button onClick={handleClick} {...props}>
      {children}
    </Button>
  );
}

/**
 * Icon button with haptic feedback
 */
export function HapticIconButton({ hapticType = 'light', onClick, children, ...props }) {
  const handleClick = async (e) => {
    // Trigger haptic feedback
    switch (hapticType) {
      case 'medium':
        await hapticMedium();
        break;
      case 'success':
        await hapticSuccess();
        break;
      default:
        await hapticLight();
    }
    
    // Execute original onClick
    if (onClick) {
      onClick(e);
    }
  };

  return (
    <IconButton onClick={handleClick} {...props}>
      {children}
    </IconButton>
  );
}

export default HapticButton;

