import { assetPath, basePath } from './paths';

/** Browser notification helpers. Call the permission request from a user gesture. */
let registrationPromise: Promise<void> | null = null;
let permissionPromise: Promise<boolean> | null = null;
let requestedThisSession = false;

export function notificationSupport(): boolean {
  return (
    typeof window !== 'undefined' && window.isSecureContext === true && 'Notification' in window
  );
}

/** Registers the notification-click worker; it does not cache app or private data. */
export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !window.isSecureContext || !('serviceWorker' in navigator)) {
    return;
  }

  if (!registrationPromise) {
    try {
      registrationPromise = navigator.serviceWorker
        .register(assetPath('/sw.js'), { scope: `${basePath}/` })
        .then(() => undefined)
        .catch(() => {
          // Basic desktop notifications can still work if registration is blocked.
          registrationPromise = null;
        });
    } catch {
      return;
    }
  }

  await registrationPromise;
}

/** Never prompts again after a denial or dismissal within this page session. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationSupport()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  if (permissionPromise) return permissionPromise;
  if (requestedThisSession) return false;

  requestedThisSession = true;
  let permissionRequest: Promise<NotificationPermission>;
  try {
    permissionRequest = Notification.requestPermission();
  } catch {
    return false;
  }
  permissionPromise = permissionRequest
    .then((permission) => permission === 'granted')
    .catch(() => false)
    .finally(() => {
      permissionPromise = null;
    });

  return permissionPromise;
}

/**
 * Displays an immediate reminder when permission has already been granted.
 * This never requests permission, schedules a background job, or guarantees
 * delivery when the browser/OS suppresses notifications.
 */
export async function showReminder(title: string, body: string): Promise<void> {
  if (!notificationSupport() || Notification.permission !== 'granted') return;

  const options: NotificationOptions = {
    body,
    icon: assetPath('/assets/brand/iris-crystal-emblem.png'),
    tag: `iris-${title.toLocaleLowerCase('id-ID').replace(/\s+/g, '-')}`,
  };

  if ('serviceWorker' in navigator) {
    try {
      await registerServiceWorker();
      const registration = await navigator.serviceWorker.getRegistration(`${basePath}/`);
      if (registration?.active && registration.showNotification) {
        await registration.showNotification(title, options);
        return;
      }
    } catch {
      // Fall back for browsers that expose notifications but reject worker use.
    }
  }

  try {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // Some mobile browsers require an active installed PWA/service worker.
  }
}
