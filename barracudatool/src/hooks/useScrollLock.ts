import { useEffect } from 'react';

export const useScrollLock = (shouldLock: boolean = true) => {
  useEffect(() => {
    if (shouldLock) {
      // Add scroll lock class
      document.body.classList.add('map-page-lock');
      
      // Optional: Also lock html element for extra security
      document.documentElement.classList.add('map-page-lock');
    } else {
      // Remove scroll lock class
      document.body.classList.remove('map-page-lock');
      document.documentElement.classList.remove('map-page-lock');
    }

    // Cleanup function: always remove lock when component unmounts
    return () => {
      document.body.classList.remove('map-page-lock');
      document.documentElement.classList.remove('map-page-lock');
    };
  }, [shouldLock]);
};
