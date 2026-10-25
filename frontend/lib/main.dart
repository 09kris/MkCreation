import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/app_theme.dart';
import 'providers/admin_provider.dart';
import 'providers/auth_provider.dart';
import 'providers/cart_provider.dart';
import 'providers/order_provider.dart';
import 'providers/product_provider.dart';
import 'screens/admin/admin_main_nav.dart';
import 'screens/auth/login_screen.dart';
import 'screens/customer/customer_main_nav.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const PoojapaApp());
}

class PoojapaApp extends StatelessWidget {
  const PoojapaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ProductProvider()),
        ChangeNotifierProvider(create: (_) => CartProvider()),
        ChangeNotifierProvider(create: (_) => OrderProvider()),
        ChangeNotifierProvider(create: (_) => AdminProvider()),
      ],
      child: MaterialApp(
        title: 'Poojapa Store - Vedic & Spiritual Essentials',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const AuthWrapper(),
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);

    if (auth.isLoading) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: AppTheme.saffronPrimary),
              SizedBox(height: 16),
              Text(
                'ॐ Opening Sacred Mandir Store...',
                style: TextStyle(
                  color: AppTheme.saffronPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (!auth.isAuthenticated) {
      return const LoginScreen();
    }

    // Role-based routing: Admin goes to AdminMainNav, Customer goes to CustomerMainNav
    if (auth.isAdmin) {
      return const AdminMainNav();
    } else {
      return const CustomerMainNav();
    }
  }
}
