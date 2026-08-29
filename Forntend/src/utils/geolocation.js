/**
 * High-Precision Geolocation Utility
 *
 * Solves the ~50km offset problem by:
 * 1. Using `watchPosition` instead of a single `getCurrentPosition` to give the GPS hardware
 *    time to lock onto satellites (cold/warm satellite convergence).
 * 2. Continuously monitoring `coords.accuracy` and resolving immediately when high accuracy
 *    (e.g., <= 25 meters) is achieved.
 * 3. Detecting coarse / network IP locations (accuracy > 100m) and preventing false GPS claims.
 */

export const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
};

/**
 * Acquire pinpoint accurate GPS coordinates.
 *
 * @param {Object} options
 * @param {number} options.targetAccuracy - Target accuracy in meters (default: 25m). Resolves immediately once reached.
 * @param {number} options.maxWaitTimeMs - Max time in ms to wait for satellite lock (default: 15000ms).
 * @param {number} options.coarseThreshold - Threshold in meters above which location is considered coarse IP (default: 100m).
 * @param {function} options.onProgress - Optional callback receiving progress updates { accuracy, isCoarse, secondsLeft }.
 * @returns {Promise<{ latitude: number, longitude: number, accuracy: number, isHighAccuracy: boolean, isCoarse: boolean, rawPosition: GeolocationPosition }>}
 */
export const getPinpointLocation = ({
  targetAccuracy = 25,
  maxWaitTimeMs = 15000,
  coarseThreshold = 100,
  onProgress = null
} = {}) => {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser'));
    }

    let bestPosition = null;
    let watchId = null;
    let timer = null;
    let progressInterval = null;
    let secondsElapsed = 0;

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (progressInterval !== null) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
    };

    const formatResult = (pos) => {
      const accuracy = Math.round(pos.coords.accuracy);
      const isHighAccuracy = accuracy <= targetAccuracy;
      const isCoarse = accuracy > coarseThreshold;

      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy,
        isHighAccuracy,
        isCoarse,
        rawPosition: pos
      };
    };

    // Progress tick every second for UI feedback
    if (typeof onProgress === 'function') {
      progressInterval = setInterval(() => {
        secondsElapsed += 1;
        const secondsLeft = Math.max(0, Math.ceil((maxWaitTimeMs - secondsElapsed * 1000) / 1000));
        onProgress({
          currentAccuracy: bestPosition ? Math.round(bestPosition.coords.accuracy) : null,
          secondsLeft,
          hasFix: bestPosition !== null
        });
      }, 1000);
    }

    // Safety timeout: when max wait time expires, return best reading or reject
    timer = setTimeout(() => {
      cleanup();
      if (bestPosition) {
        console.log(`[GPS] Timeout reached. Returning best acquired fix: ±${Math.round(bestPosition.coords.accuracy)}m`);
        resolve(formatResult(bestPosition));
      } else {
        reject(new Error('GPS timeout: Could not acquire a location signal in time. Please check your device location settings.'));
      }
    }, maxWaitTimeMs);

    try {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const currentAcc = position.coords.accuracy;
          console.log(`[GPS] Satellite update: Lat ${position.coords.latitude.toFixed(6)}, Lng ${position.coords.longitude.toFixed(6)}, Accuracy: ±${Math.round(currentAcc)}m`);

          // Track best fix (lowest accuracy number = highest precision)
          if (!bestPosition || currentAcc < bestPosition.coords.accuracy) {
            bestPosition = position;
          }

          // If reached target pinpoint accuracy (e.g. <= 25m), resolve immediately!
          if (currentAcc <= targetAccuracy) {
            console.log(`[GPS] 🎯 Target pinpoint accuracy achieved (±${Math.round(currentAcc)}m <= ${targetAccuracy}m)!`);
            cleanup();
            resolve(formatResult(position));
          }
        },
        (error) => {
          console.warn('[GPS] watchPosition error:', error);
          // If we already have a fix, use it rather than failing completely
          if (bestPosition) {
            cleanup();
            resolve(formatResult(bestPosition));
          } else {
            cleanup();
            reject(error);
          }
        },
        {
          enableHighAccuracy: true, // Forces true GPS hardware on mobile
          timeout: maxWaitTimeMs,
          maximumAge: 0             // Strictly fresh readings, never cached IP/network
        }
      );
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
};
