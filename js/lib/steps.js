/* Steps library: Native Capacitor pedometer integration and sensor bridge */

export async function fetchTodaySteps() {
  try {
    if (typeof window === 'undefined') return null;
    var isNative = Boolean(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
    if (!isNative) return null;

    var Pedometer = window.Capacitor.Plugins && window.Capacitor.Plugins.Pedometer;
    if (!Pedometer) {
      try {
        var mod = await import('@capgo/capacitor-pedometer');
        Pedometer = mod.Pedometer;
      } catch (importErr) {
        return null;
      }
    }
    if (!Pedometer) return null;

    if (typeof Pedometer.requestPermissions === 'function') {
      var perm = await Pedometer.requestPermissions();
      if (perm && perm.activityRecognition && perm.activityRecognition !== 'granted') {
        return null;
      }
    }

    if (typeof Pedometer.getMeasurement === 'function') {
      var startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      var res = await Pedometer.getMeasurement({
        startDate: startOfDay.toISOString(),
        endDate: new Date().toISOString()
      });
      if (res && res.numberOfSteps != null) {
        return Math.round(Number(res.numberOfSteps) || 0);
      }
    }
    return null;
  } catch (err) {
    console.warn('Native step fetch fallback:', err);
    return null;
  }
}

