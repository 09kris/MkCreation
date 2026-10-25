import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

class ApiConfig {
  // Configurable base URL
  static String? _customBaseUrl;

  static String get baseUrl {
    if (_customBaseUrl != null && _customBaseUrl!.isNotEmpty) {
      return _customBaseUrl!;
    }

    if (kIsWeb) {
      return 'http://localhost:5000/api';
    }

    try {
      if (Platform.isAndroid) {
        // 10.0.2.2 maps to host machine localhost in standard Android emulator
        return 'http://10.0.2.2:5000/api';
      } else if (Platform.isWindows || Platform.isMacOS || Platform.isLinux) {
        return 'http://localhost:5000/api';
      }
    } catch (_) {
      // Fallback
    }

    return 'http://localhost:5000/api';
  }

  static void setCustomBaseUrl(String url) {
    _customBaseUrl = url.trim().replaceAll(RegExp(r'/+$'), '');
  }

  // Endpoints
  static const String health = '/health';
  
  // Auth
  static const String register = '/auth/register';
  static const String login = '/auth/login';
  static const String profile = '/auth/me';

  // Categories
  static const String categories = '/categories';

  // Products
  static const String products = '/products';
  static const String featuredProducts = '/products/featured';

  // Orders
  static const String orders = '/orders';
  static const String myOrders = '/orders/my-orders';
  static const String adminOrders = '/orders/admin/all';
  static String updateOrderStatus(int id) => '/orders/admin/$id/status';

  // Admin Dashboard
  static const String adminDashboard = '/admin/dashboard';
}
