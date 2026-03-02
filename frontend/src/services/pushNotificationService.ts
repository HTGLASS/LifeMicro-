import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';

class PushNotificationService {
  private static instance: PushNotificationService;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Request permission for push notifications
   * @returns Promise<boolean> - true if permission granted
   */
  async requestPermission(): Promise<boolean> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Push notification permission granted:', authStatus);
      } else {
        console.log('Push notification permission denied');
      }

      return enabled;
    } catch (error) {
      console.error('Error requesting push notification permission:', error);
      return false;
    }
  }

  /**
   * Get the FCM token for this device
   * @returns Promise<string | null> - FCM token or null if unavailable
   */
  async getToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  /**
   * Register the device token with your backend
   * @param userId - The user's ID
   * @param backendUrl - The backend API URL
   */
  async registerTokenWithBackend(userId: string, backendUrl: string): Promise<void> {
    try {
      const token = await this.getToken();
      if (!token) {
        console.warn('No FCM token available to register');
        return;
      }

      const response = await fetch(`${backendUrl}/api/register-push-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          fcm_token: token,
          platform: Platform.OS,
        }),
      });

      if (response.ok) {
        console.log('FCM token registered with backend successfully');
      } else {
        console.error('Failed to register FCM token with backend');
      }
    } catch (error) {
      console.error('Error registering token with backend:', error);
    }
  }

  /**
   * Set up foreground message handler
   * @param handler - Callback function to handle messages
   */
  onForegroundMessage(handler: (message: any) => void): () => void {
    return messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground message received:', remoteMessage);
      handler(remoteMessage);
    });
  }

  /**
   * Set up background message handler
   * Must be called outside of React component
   */
  setBackgroundMessageHandler(handler: (message: any) => Promise<void>): void {
    messaging().setBackgroundMessageHandler(handler);
  }

  /**
   * Handle notification that opened the app
   * @param handler - Callback function when notification opens app
   */
  onNotificationOpenedApp(handler: (message: any) => void): () => void {
    return messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('Notification opened app:', remoteMessage);
      handler(remoteMessage);
    });
  }

  /**
   * Get the initial notification that opened the app (from quit state)
   */
  async getInitialNotification(): Promise<any> {
    const remoteMessage = await messaging().getInitialNotification();
    if (remoteMessage) {
      console.log('App opened from quit state by notification:', remoteMessage);
    }
    return remoteMessage;
  }

  /**
   * Subscribe to a topic for targeted notifications
   * @param topic - Topic name to subscribe to
   */
  async subscribeToTopic(topic: string): Promise<void> {
    try {
      await messaging().subscribeToTopic(topic);
      console.log(`Subscribed to topic: ${topic}`);
    } catch (error) {
      console.error(`Error subscribing to topic ${topic}:`, error);
    }
  }

  /**
   * Unsubscribe from a topic
   * @param topic - Topic name to unsubscribe from
   */
  async unsubscribeFromTopic(topic: string): Promise<void> {
    try {
      await messaging().unsubscribeFromTopic(topic);
      console.log(`Unsubscribed from topic: ${topic}`);
    } catch (error) {
      console.error(`Error unsubscribing from topic ${topic}:`, error);
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
export default pushNotificationService;
