import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/cart_provider.dart';
import 'home_store_screen.dart';
import 'categories_screen.dart';
import 'cart_screen.dart';
import 'my_orders_screen.dart';
import 'customer_profile_screen.dart';
import '../admin/admin_main_nav.dart';

class CustomerMainNav extends StatefulWidget {
  final int initialIndex;
  const CustomerMainNav({super.key, this.initialIndex = 0});

  @override
  State<CustomerMainNav> createState() => _CustomerMainNavState();
}

class _CustomerMainNavState extends State<CustomerMainNav> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  void switchTab(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final cart = Provider.of<CartProvider>(context);

    final screens = [
      HomeStoreScreen(onNavigateToCart: () => switchTab(2), onNavigateToCategory: () => switchTab(1)),
      CategoriesScreen(onNavigateToCart: () => switchTab(2)),
      const CartScreen(),
      const MyOrdersScreen(),
      const CustomerProfileScreen(),
    ];

    return Scaffold(
      appBar: (auth.isAdmin)
          ? PreferredSize(
              preferredSize: const Size.fromHeight(36),
              child: Container(
                color: AppTheme.maroonAccent,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Logged in as Admin (Viewing Customer Store)',
                      style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                    TextButton.icon(
                      style: TextButton.styleFrom(
                        foregroundColor: Colors.amberAccent,
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                      ),
                      icon: const Icon(Icons.dashboard_rounded, size: 14),
                      label: const Text('Admin Panel', style: TextStyle(fontSize: 12)),
                      onPressed: () {
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(builder: (_) => const AdminMainNav()),
                        );
                      },
                    ),
                  ],
                ),
              ),
            )
          : null,
      body: IndexedStack(
        index: _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        type: BottomNavigationBarType.fixed,
        selectedItemColor: AppTheme.saffronPrimary,
        unselectedItemColor: const Color(0xFF8D6E63),
        items: [
          const BottomNavigationBarItem(
            icon: Icon(Icons.temple_hindu_rounded),
            label: 'Mandir Store',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.category_rounded),
            label: 'Categories',
          ),
          BottomNavigationBarItem(
            icon: Badge(
              isLabelVisible: cart.itemCount > 0,
              label: Text('${cart.itemCount}'),
              backgroundColor: AppTheme.maroonAccent,
              child: const Icon(Icons.shopping_bag_outlined),
            ),
            activeIcon: Badge(
              isLabelVisible: cart.itemCount > 0,
              label: Text('${cart.itemCount}'),
              backgroundColor: AppTheme.maroonAccent,
              child: const Icon(Icons.shopping_bag_rounded),
            ),
            label: 'Pooja Cart',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long_outlined),
            activeIcon: Icon(Icons.receipt_long_rounded),
            label: 'My Orders',
          ),
          const BottomNavigationBarItem(
            icon: Icon(Icons.person_outline_rounded),
            activeIcon: Icon(Icons.person_rounded),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
